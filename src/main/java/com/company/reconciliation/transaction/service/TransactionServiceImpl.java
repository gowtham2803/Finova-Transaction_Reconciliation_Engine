
package com.company.reconciliation.transaction.service;

import com.company.reconciliation.audit.service.AuditService;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.branch.repository.BranchRepository;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
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

@Service
@Transactional
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final BranchRepository branchRepository;
    private final ReconciliationRepository reconciliationRepository;
    private final AuditService auditService;

    public TransactionServiceImpl(
            TransactionRepository transactionRepository,
            BranchRepository branchRepository,
            ReconciliationRepository reconciliationRepository,
            AuditService auditService
    ) {
        this.transactionRepository = transactionRepository;
        this.branchRepository = branchRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.auditService = auditService;
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

        Branch fromBranch = branchRepository
                .findById(request.getFromBranchId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "From Branch not found with ID: "
                                + request.getFromBranchId()
                ));

        Branch toBranch = branchRepository
                .findById(request.getToBranchId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "To Branch not found with ID: "
                                + request.getToBranchId()
                ));

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
        Long actorUserId = reconciliation.getCreatedBy().getId();

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

        Branch fromBranch = branchRepository
                .findById(request.getFromBranchId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "From Branch not found with ID: "
                                + request.getFromBranchId()
                ));

        Branch toBranch = branchRepository
                .findById(request.getToBranchId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "To Branch not found with ID: "
                                + request.getToBranchId()
                ));

        // Capture old values before updating the transaction
        Long oldFromBranchId = transaction.getFromBranch().getId();
        Long oldToBranchId = transaction.getToBranch().getId();

        BigDecimal oldAmount = transaction.getAmount();
        BigDecimal oldCommission = transaction.getCommission();

        Integer oldVersion = transaction.getVersion();

        // Use the reconciliation creator as the audit user
        Long actorUserId =
                transaction.getReconciliation().getCreatedBy().getId();

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
        response.setFromBranchName(
                transaction.getFromBranch().getName()
        );

        response.setToBranchId(
                transaction.getToBranch().getId()
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
}