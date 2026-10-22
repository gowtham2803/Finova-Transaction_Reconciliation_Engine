
package com.company.reconciliation.transaction.service;

import com.company.reconciliation.audit.repository.AuditLogRepository;
import com.company.reconciliation.audit.service.AuditService;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.branch.repository.BranchRepository;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.error.ReconciliationError;
import com.company.reconciliation.reconciliation.error.repository.ReconciliationErrorRepository;
import com.company.reconciliation.reconciliation.error.resolution.ErrorResolution;
import com.company.reconciliation.reconciliation.error.resolution.repository.ErrorResolutionRepository;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import com.company.reconciliation.reconciliation.result.repository.ReconciliationResultRepository;
import com.company.reconciliation.security.UserContext;
import com.company.reconciliation.transaction.dto.TransactionCreateRequest;
import com.company.reconciliation.transaction.dto.TransactionFilterRequest;
import com.company.reconciliation.transaction.dto.TransactionResponse;
import com.company.reconciliation.transaction.dto.TransactionUpdateRequest;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final BranchRepository branchRepository;
    private final ReconciliationRepository reconciliationRepository;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;
    private final ReconciliationResultRepository reconciliationResultRepository;
    private final ReconciliationErrorRepository reconciliationErrorRepository;
    private final ErrorResolutionRepository errorResolutionRepository;

    public TransactionServiceImpl(
            TransactionRepository transactionRepository,
            BranchRepository branchRepository,
            ReconciliationRepository reconciliationRepository,
            AuditService auditService,
            AuditLogRepository auditLogRepository,
            ReconciliationResultRepository reconciliationResultRepository,
            ReconciliationErrorRepository reconciliationErrorRepository,
            ErrorResolutionRepository errorResolutionRepository
    ) {
        this.transactionRepository = transactionRepository;
        this.branchRepository = branchRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
        this.reconciliationResultRepository = reconciliationResultRepository;
        this.reconciliationErrorRepository = reconciliationErrorRepository;
        this.errorResolutionRepository = errorResolutionRepository;
    }

    // 1. Create a single transaction
    @Override
    public TransactionResponse createTransaction(
            TransactionCreateRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Transaction request cannot be null"
            );
        }

        Reconciliation reconciliation = reconciliationRepository
                .findById(request.getReconciliationId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Reconciliation not found with ID: "
                                + request.getReconciliationId()
                ));

        String sheetLabel = request.getSourceSheet() != null ? (request.getSourceSheet().equals("M_IN") ? "M In" : "M Out") : "";
        String rowLabel = request.getSourceRow() != null ? "Row " + request.getSourceRow() : "";
        String context = (!sheetLabel.isEmpty() || !rowLabel.isEmpty())
                ? "[" + (sheetLabel + " " + rowLabel).trim() + "] "
                : "";

        Branch fromBranch = resolveBranch(request.getFromBranchId(), request.getFromBranchName(), "From", context);
        Branch toBranch = resolveBranch(request.getToBranchId(), request.getToBranchName(), "To", context);

        LocalDateTime now = LocalDateTime.now();

        Transaction transaction = new Transaction();
        transaction.setReconciliation(reconciliation);
        transaction.setFromBranch(fromBranch);
        transaction.setToBranch(toBranch);
        transaction.setSourceSheet(request.getSourceSheet());
        transaction.setSourceRow(request.getSourceRow());
        transaction.setAmount(request.getAmount());
        transaction.setCommission(
                request.getCommission() != null
                        ? request.getCommission()
                        : BigDecimal.ZERO
        );

        transaction.setStatus("PENDING");
        transaction.setVersion(1);
        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        Transaction savedTransaction =
                transactionRepository.save(transaction);

        // Use the reconciliation creator as the audit user
        Long actorUserId = UserContext.getCurrentUser() != null
                ? UserContext.getCurrentUser().getId()
                : (reconciliation.getCreatedBy() != null && reconciliation.getCreatedBy().getId() != null
                        ? reconciliation.getCreatedBy().getId()
                        : 1L);

        // Record transaction creation
        auditService.recordAction(
                actorUserId,
                reconciliation.getId(),
                savedTransaction.getId(),
                "TRANSACTION_CREATED",
                "transaction",
                null,
                "sourceSheet=" + savedTransaction.getSourceSheet()
                        + ", fromBranchId="
                        + savedTransaction.getFromBranch().getId()
                        + ", toBranchId="
                        + savedTransaction.getToBranch().getId()
                        + ", amount="
                        + savedTransaction.getAmount().toPlainString()
                        + ", commission="
                        + savedTransaction.getCommission().toPlainString(),
                "Transaction created",
                null
        );

        return mapToResponse(savedTransaction);
    }

    // 2. Create multiple transactions
    @Override
    public List<TransactionResponse> createBulkTransactions(
            List<TransactionCreateRequest> requests
    ) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException(
                    "Transaction list cannot be empty"
            );
        }

        List<TransactionResponse> responses =
                new ArrayList<>(requests.size());

        for (TransactionCreateRequest request : requests) {
            if (request == null) {
                throw new IllegalArgumentException(
                        "Transaction request cannot be null"
                );
            }

            // Each transaction is created and audited
            responses.add(createTransaction(request));
        }

        return responses;
    }

    // 3. Retrieve a transaction by ID
    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(Long transactionId) {
        if (transactionId == null || transactionId <= 0) {
            throw new IllegalArgumentException(
                    "Transaction ID must be positive"
            );
        }

        Transaction transaction = transactionRepository
                .findById(transactionId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Transaction not found with ID: " + transactionId
                ));

        return mapToResponse(transaction);
    }

    // 4. Retrieve all transactions for a reconciliation
    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByReconciliation(
            Long reconciliationId
    ) {
        if (reconciliationId == null || reconciliationId <= 0) {
            throw new IllegalArgumentException(
                    "Reconciliation ID must be positive"
            );
        }

        if (!reconciliationRepository.existsById(reconciliationId)) {
            throw new IllegalArgumentException(
                    "Reconciliation not found with ID: " + reconciliationId
            );
        }

        return transactionRepository
                .findByReconciliationId(reconciliationId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // 5. Update an existing transaction
    @Override
    public TransactionResponse updateTransaction(
            Long transactionId,
            TransactionUpdateRequest request
    ) {
        if (transactionId == null || transactionId <= 0) {
            throw new IllegalArgumentException(
                    "Transaction ID must be positive"
            );
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Transaction update request cannot be null"
            );
        }

        Transaction transaction = transactionRepository
                .findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Transaction not found with ID: " + transactionId
                ));

        String sheetLabel = transaction.getSourceSheet() != null ? (transaction.getSourceSheet().equals("M_IN") ? "M In" : "M Out") : "";
        String rowLabel = transaction.getSourceRow() != null ? "Row " + transaction.getSourceRow() : "";
        String context = (!sheetLabel.isEmpty() || !rowLabel.isEmpty())
                ? "[" + (sheetLabel + " " + rowLabel).trim() + "] "
                : "";

        Branch fromBranch = resolveBranch(request.getFromBranchId(), request.getFromBranchName(), "From", context);
        Branch toBranch = resolveBranch(request.getToBranchId(), request.getToBranchName(), "To", context);

        // Capture old values before updating the transaction
        Long oldFromBranchId = transaction.getFromBranch().getId();
        Long oldToBranchId = transaction.getToBranch().getId();

        BigDecimal oldAmount = transaction.getAmount();
        BigDecimal oldCommission = transaction.getCommission();

        Integer oldVersion = transaction.getVersion();

        // Use the reconciliation creator as the audit user
        Long actorUserId =
                UserContext.getCurrentUser() != null
                        ? UserContext.getCurrentUser().getId()
                        : (transaction.getReconciliation().getCreatedBy() != null && transaction.getReconciliation().getCreatedBy().getId() != null
                                ? transaction.getReconciliation().getCreatedBy().getId()
                                : 1L);

        // Update transaction fields
        transaction.setFromBranch(fromBranch);
        transaction.setToBranch(toBranch);
        transaction.setAmount(request.getAmount());
        transaction.setCommission(
                request.getCommission() != null
                        ? request.getCommission()
                        : BigDecimal.ZERO
        );

        transaction.setVersion(transaction.getVersion() + 1);
        transaction.setUpdatedAt(LocalDateTime.now());

        Transaction updatedTransaction =
                transactionRepository.save(transaction);

        // Record changes to individual fields
        recordFieldChange(
                updatedTransaction,
                actorUserId,
                "from_branch_id",
                String.valueOf(oldFromBranchId),
                String.valueOf(updatedTransaction.getFromBranch().getId())
        );

        recordFieldChange(
                updatedTransaction,
                actorUserId,
                "to_branch_id",
                String.valueOf(oldToBranchId),
                String.valueOf(updatedTransaction.getToBranch().getId())
        );

        recordFieldChange(
                updatedTransaction,
                actorUserId,
                "amount",
                oldAmount.toPlainString(),
                updatedTransaction.getAmount().toPlainString()
        );

        recordFieldChange(
                updatedTransaction,
                actorUserId,
                "commission",
                oldCommission.toPlainString(),
                updatedTransaction.getCommission().toPlainString()
        );

        recordFieldChange(
                updatedTransaction,
                actorUserId,
                "version",
                String.valueOf(oldVersion),
                String.valueOf(updatedTransaction.getVersion())
        );

        return mapToResponse(updatedTransaction);
    }

    // 6. Retrieve transactions using filters
    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByFilter(
            TransactionFilterRequest filter
    ) {
        if (filter == null
                || filter.getReconciliationId() == null
                || filter.getReconciliationId() <= 0) {
            throw new IllegalArgumentException(
                    "A valid reconciliation ID is required"
            );
        }

        if (!reconciliationRepository.existsById(
                filter.getReconciliationId())) {
            throw new IllegalArgumentException(
                    "Reconciliation not found with ID: "
                            + filter.getReconciliationId()
            );
        }

        List<Transaction> transactions =
                transactionRepository.findByReconciliationId(
                        filter.getReconciliationId()
                );

        return transactions.stream()
                .filter(transaction ->
                        filter.getSourceSheet() == null
                                || filter.getSourceSheet().isBlank()
                                || filter.getSourceSheet().equals(
                                transaction.getSourceSheet()
                        )
                )
                .filter(transaction ->
                        filter.getStatus() == null
                                || filter.getStatus().isBlank()
                                || filter.getStatus().equalsIgnoreCase(
                                transaction.getStatus()
                        )
                )
                .filter(transaction ->
                        filter.getBranchId() == null
                                || Objects.equals(
                                transaction.getFromBranch().getId(),
                                filter.getBranchId()
                        )
                                || Objects.equals(
                                transaction.getToBranch().getId(),
                                filter.getBranchId()
                        )
                )
                .map(this::mapToResponse)
                .toList();
    }

    // 7. Convert entity to response DTO
    private TransactionResponse mapToResponse(Transaction transaction) {
        TransactionResponse response = new TransactionResponse();

        response.setId(transaction.getId());
        response.setReconciliationId(
                transaction.getReconciliation().getId()
        );

        response.setBranchId(
                transaction.getBranch() != null
                        ? transaction.getBranch().getId()
                        : null
        );

        response.setSourceSheet(transaction.getSourceSheet());
        response.setSourceRow(transaction.getSourceRow());

        response.setFromBranchId(
                transaction.getFromBranch().getId()
        );
        response.setFromBranchCode(
                transaction.getFromBranch().getCode()
        );
        response.setFromBranchName(
                transaction.getFromBranch().getName()
        );

        response.setToBranchId(
                transaction.getToBranch().getId()
        );
        response.setToBranchCode(
                transaction.getToBranch().getCode()
        );
        response.setToBranchName(
                transaction.getToBranch().getName()
        );

        response.setAmount(transaction.getAmount());
        response.setCommission(transaction.getCommission());
        response.setStatus(transaction.getStatus());
        response.setVersion(transaction.getVersion());
        response.setCreatedAt(transaction.getCreatedAt());
        response.setUpdatedAt(transaction.getUpdatedAt());

        return response;
    }

    // 8. Record an audit event only when a field has changed
    private void recordFieldChange(
            Transaction transaction,
            Long actorUserId,
            String fieldName,
            String oldValue,
            String newValue
    ) {
        if (Objects.equals(oldValue, newValue)) {
            return;
        }

        auditService.recordAction(
                actorUserId,
                transaction.getReconciliation().getId(),
                transaction.getId(),
                "TRANSACTION_UPDATED",
                fieldName,
                oldValue,
                newValue,
                "Transaction updated",
                null
        );
    }

    @Override
    @Transactional
    public void deleteTransaction(Long transactionId) {
        if (transactionId == null || transactionId <= 0) {
            throw new IllegalArgumentException("Transaction ID must be positive");
        }
        deleteTransactions(List.of(transactionId));
    }

    @Override
    @Transactional
    public void deleteTransactions(List<Long> transactionIds) {
        if (transactionIds == null || transactionIds.isEmpty()) {
            return;
        }

        List<Long> validIds = transactionIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        if (validIds.isEmpty()) {
            return;
        }

        // 1. Detach audit logs so foreign key constraints do not fail
        auditLogRepository.detachTransactions(validIds);
        auditLogRepository.flush();

        // 2. Cascade delete linked reconciliation results, errors, and error resolutions
        List<ReconciliationResult> linkedResults = reconciliationResultRepository.findByTransactionIds(validIds);
        if (!linkedResults.isEmpty()) {
            for (ReconciliationResult result : linkedResults) {
                List<ReconciliationError> errors = reconciliationErrorRepository.findByReconciliationResultId(result.getId());
                for (ReconciliationError error : errors) {
                    List<ErrorResolution> resolutions = errorResolutionRepository.findByErrorId(error.getId());
                    if (!resolutions.isEmpty()) {
                        errorResolutionRepository.deleteAllInBatch(resolutions);
                    }
                }
                if (!errors.isEmpty()) {
                    reconciliationErrorRepository.deleteAllInBatch(errors);
                }
            }
            reconciliationResultRepository.deleteAllInBatch(linkedResults);
            reconciliationResultRepository.flush();
        }

        // 3. Delete transactions
        transactionRepository.deleteAllById(validIds);
        transactionRepository.flush();
    }

    private Branch resolveBranch(Long branchId, String branchName, String direction, String context) {
        if (branchName != null && !branchName.trim().isEmpty()) {
            String clean = branchName.trim();
            Optional<Branch> byName = branchRepository.findByNameIgnoreCase(clean);
            if (byName.isPresent()) {
                Branch b = byName.get();
                if (!Boolean.TRUE.equals(b.getActive())) {
                    throw new IllegalArgumentException(context + direction + " Branch '" + clean + "' is inactive.");
                }
                return b;
            }
            Optional<Branch> byCode = branchRepository.findByCodeIgnoreCase(clean);
            if (byCode.isPresent()) {
                Branch b = byCode.get();
                if (!Boolean.TRUE.equals(b.getActive())) {
                    throw new IllegalArgumentException(context + direction + " Branch '" + clean + "' is inactive.");
                }
                return b;
            }

            throw new IllegalArgumentException(
                    context + direction + " Branch '" + clean + "' does not exist in the database. Only registered branches are allowed."
            );
        }

        if (branchId != null && branchId > 0) {
            Branch b = branchRepository.findById(branchId)
                    .orElseThrow(() -> new IllegalArgumentException(
                            context + direction + " Branch not found with ID: " + branchId + ". Only registered branches are allowed."
                    ));
            if (!Boolean.TRUE.equals(b.getActive())) {
                throw new IllegalArgumentException(context + direction + " Branch '" + b.getName() + "' is inactive.");
            }
            return b;
        }

        throw new IllegalArgumentException(context + direction + " Branch is required");
    }
}