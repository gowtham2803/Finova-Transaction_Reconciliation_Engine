
package com.company.reconciliation.reconciliation.service;

import com.company.reconciliation.audit.service.AuditService;
import com.company.reconciliation.reconciliation.engine.*;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.error.ReconciliationError;
import com.company.reconciliation.reconciliation.error.repository.ReconciliationErrorRepository;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import com.company.reconciliation.reconciliation.result.repository.ReconciliationResultRepository;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResultResponse;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import com.company.reconciliation.user.entity.User;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ReconciliationService {

    private final ReconciliationRepository reconciliationRepository;
    private final TransactionRepository transactionRepository;
    private final ReconciliationResultRepository reconciliationResultRepository;
    private final ReconciliationErrorRepository reconciliationErrorRepository;
    private final ReconciliationEngine reconciliationEngine;
    private final AuditService auditService;

    public ReconciliationService(
            ReconciliationRepository reconciliationRepository,
            TransactionRepository transactionRepository,
            ReconciliationResultRepository reconciliationResultRepository,
            ReconciliationErrorRepository reconciliationErrorRepository,
            ReconciliationEngine reconciliationEngine,
            AuditService auditService) {

        this.reconciliationRepository = reconciliationRepository;
        this.transactionRepository = transactionRepository;
        this.reconciliationResultRepository = reconciliationResultRepository;
        this.reconciliationErrorRepository = reconciliationErrorRepository;
        this.reconciliationEngine = reconciliationEngine;
        this.auditService = auditService;
    }

    // 1. Execute or rerun reconciliation
    @Transactional
    public ReconciliationEngineResult reconcile(Long reconciliationId) {

        Objects.requireNonNull(
                reconciliationId,
                "Reconciliation ID cannot be null"
        );

        Reconciliation reconciliation = reconciliationRepository
                .findById(reconciliationId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reconciliation not found: " + reconciliationId
                ));

        // Capture the previous state before processing.
        String previousStatus = reconciliation.getStatus();
        boolean isRerun = reconciliation.getStartedAt() != null;

        LocalDateTime startedAt = LocalDateTime.now();

        reconciliation.setStatus("PROCESSING");
        reconciliation.setStartedAt(startedAt);
        reconciliation.setCompletedAt(null);
        reconciliation.setUpdatedAt(startedAt);

        List<Transaction> transactions =
                transactionRepository.findByReconciliationId(reconciliationId);

        Map<Long, Transaction> transactionMap = transactions.stream()
                .filter(transaction -> transaction.getId() != null)
                .collect(Collectors.toMap(
                        Transaction::getId,
                        transaction -> transaction,
                        (existing, duplicate) -> existing,
                        HashMap::new
                ));

        List<NormalizedTransaction> mInTransactions = transactions.stream()
                .filter(transaction ->
                        "M_IN".equals(transaction.getSourceSheet()))
                .map(this::normalize)
                .toList();

        List<NormalizedTransaction> mOutTransactions = transactions.stream()
                .filter(transaction ->
                        "M_OUT".equals(transaction.getSourceSheet()))
                .map(this::normalize)
                .toList();

        boolean hasUnknownSource = transactions.stream()
                .anyMatch(transaction ->
                        !"M_IN".equals(transaction.getSourceSheet())
                                && !"M_OUT".equals(transaction.getSourceSheet())
                );

        if (hasUnknownSource) {
            throw new IllegalStateException(
                    "Unknown source sheet found in reconciliation transactions"
            );
        }

        ReconciliationEngineResult result =
                reconciliationEngine.reconcile(
                        mInTransactions,
                        mOutTransactions
                );

        saveMatches(reconciliation, result.matches(), transactionMap);
        saveIssues(reconciliation, result.issues(), transactionMap);

        ReconciliationSummary summary = result.summary();

        String finalStatus = summary.status().name();

        reconciliation.setStatus(finalStatus);
        reconciliation.setCompletedAt(LocalDateTime.now());
        reconciliation.setUpdatedAt(LocalDateTime.now());

        reconciliationRepository.save(reconciliation);

        // Record audit only after successful reconciliation processing.
        User createdBy = reconciliation.getCreatedBy();

        if (createdBy == null || createdBy.getId() == null) {
            throw new IllegalStateException(
                    "Reconciliation creator is required for audit logging"
            );
        }

        auditService.recordAction(
                createdBy.getId(),
                reconciliation.getId(),
                null,
                isRerun
                        ? "RECONCILIATION_RERUN"
                        : "RECONCILIATION_EXECUTED",
                "status",
                previousStatus,
                finalStatus,
                isRerun
                        ? "Reconciliation rerun completed"
                        : "Reconciliation execution completed",
                null
        );

        return result;
    }

    // 2. Retrieve all results for a reconciliation
    @Transactional(readOnly = true)
    public List<ReconciliationResultResponse> getResultsByReconciliation(
            Long reconciliationId) {

        validateReconciliationExists(reconciliationId);

        return reconciliationResultRepository
                .findByReconciliationId(reconciliationId)
                .stream()
                .map(this::mapToResultResponse)
                .toList();
    }

    // 3. Retrieve all errors for a reconciliation,
    // optionally filtered by status
    @Transactional(readOnly = true)
    public List<ReconciliationErrorResponse> getErrorsByReconciliation(
            Long reconciliationId,
            String status) {

        validateReconciliationExists(reconciliationId);

        List<ReconciliationError> errors;

        if (status == null || status.isBlank()) {
            errors = reconciliationErrorRepository
                    .findByReconciliationResultReconciliationId(
                            reconciliationId
                    );
        } else {
            errors = reconciliationErrorRepository
                    .findByReconciliationResultReconciliationIdAndStatus(
                            reconciliationId,
                            status
                    );
        }

        return errors.stream()
                .map(this::mapToErrorResponse)
                .toList();
    }

    // 4. Retrieve one error by ID
    @Transactional(readOnly = true)
    public ReconciliationErrorResponse getErrorById(Long errorId) {

        if (errorId == null || errorId <= 0) {
            throw new IllegalArgumentException(
                    "Error ID must be positive"
            );
        }

        ReconciliationError error = reconciliationErrorRepository
                .findById(errorId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reconciliation error not found with ID: " + errorId
                ));

        return mapToErrorResponse(error);
    }

    // 5. Resolve an open reconciliation error and audit the action
    @Transactional
    public ReconciliationErrorResponse resolveError(Long errorId) {

        if (errorId == null || errorId <= 0) {
            throw new IllegalArgumentException(
                    "Error ID must be a positive number."
            );
        }

        ReconciliationError error = reconciliationErrorRepository
                .findById(errorId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reconciliation error not found with ID: " + errorId
                ));

        String previousStatus = error.getStatus();

        if ("RESOLVED".equalsIgnoreCase(previousStatus)) {
            throw new IllegalStateException(
                    "This error has already been resolved."
            );
        }

        if (!"OPEN".equalsIgnoreCase(previousStatus)) {
            throw new IllegalStateException(
                    "Only OPEN errors can be resolved."
            );
        }

        error.setStatus("RESOLVED");
        error.setUpdatedAt(LocalDateTime.now());

        ReconciliationError savedError =
                reconciliationErrorRepository.save(error);

        Reconciliation reconciliation = savedError
                .getReconciliationResult()
                .getReconciliation();

        User createdBy = reconciliation.getCreatedBy();

        if (createdBy == null || createdBy.getId() == null) {
            throw new IllegalStateException(
                    "Reconciliation creator is required for audit logging"
            );
        }

        auditService.recordAction(
                createdBy.getId(),
                reconciliation.getId(),
                null,
                "ERROR_RESOLVED",
                "status",
                previousStatus,
                "RESOLVED",
                "Reconciliation error resolved",
                null
        );

        return mapToErrorResponse(savedError);
    }

    // 6. Validate reconciliation exists
    private void validateReconciliationExists(Long reconciliationId) {

        if (reconciliationId == null || reconciliationId <= 0) {
            throw new IllegalArgumentException(
                    "Reconciliation ID must be positive"
            );
        }

        if (!reconciliationRepository.existsById(reconciliationId)) {
            throw new EntityNotFoundException(
                    "Reconciliation not found with ID: " + reconciliationId
            );
        }
    }

    // 7. Map result entity to response DTO
    private ReconciliationResultResponse mapToResultResponse(
            ReconciliationResult result) {

        ReconciliationResultResponse response =
                new ReconciliationResultResponse();

        response.setId(result.getId());
        response.setReconciliationId(
                result.getReconciliation().getId()
        );

        response.setmInTransactionId(
                result.getmInTransaction() != null
                        ? result.getmInTransaction().getId()
                        : null
        );

        response.setmOutTransactionId(
                result.getmOutTransaction() != null
                        ? result.getmOutTransaction().getId()
                        : null
        );

        response.setMatchStatus(result.getMatchStatus());
        response.setErrorType(result.getErrorType());
        response.setErrorReason(result.getErrorReason());
        response.setCreatedAt(result.getCreatedAt());

        return response;
    }

    // 8. Map error entity to response DTO
    private ReconciliationErrorResponse mapToErrorResponse(
            ReconciliationError error) {

        ReconciliationErrorResponse response =
                new ReconciliationErrorResponse();

        response.setId(error.getId());

        response.setReconciliationId(
                error.getReconciliationResult()
                        .getReconciliation()
                        .getId()
        );

        response.setReconciliationResultId(
                error.getReconciliationResult().getId()
        );

        response.setErrorType(error.getErrorType());
        response.setErrorCode(error.getErrorCode());
        response.setDescription(error.getDescription());
        response.setStatus(error.getStatus());
        response.setCreatedAt(error.getCreatedAt());
        response.setUpdatedAt(error.getUpdatedAt());

        return response;
    }

    // 9. Normalize transaction for the reconciliation engine
    private NormalizedTransaction normalize(Transaction transaction) {
        return new NormalizedTransaction(
                transaction.getId(),
                transaction.getFromBranch().getId(),
                transaction.getToBranch().getId(),
                transaction.getAmount(),
                transaction.getCommission(),
                transaction.getSourceSheet()
        );
    }

    // 10. Persist matched transaction results
    private void saveMatches(
            Reconciliation reconciliation,
            List<ReconciliationMatch> matches,
            Map<Long, Transaction> transactionMap) {

        for (ReconciliationMatch match : matches) {

            ReconciliationResult reconciliationResult =
                    new ReconciliationResult();

            reconciliationResult.setReconciliation(reconciliation);
            reconciliationResult.setmInTransaction(
                    transactionMap.get(
                            match.mInTransaction().transactionId()
                    )
            );

            reconciliationResult.setmOutTransaction(
                    transactionMap.get(
                            match.mOutTransaction().transactionId()
                    )
            );

            reconciliationResult.setMatchStatus("MATCHED");
            reconciliationResult.setErrorType(null);
            reconciliationResult.setErrorReason(null);
            reconciliationResult.setCreatedAt(LocalDateTime.now());

            reconciliationResultRepository.save(reconciliationResult);
        }
    }

    // 11. Persist reconciliation issues and linked errors
    private void saveIssues(
            Reconciliation reconciliation,
            List<ReconciliationIssue> issues,
            Map<Long, Transaction> transactionMap) {

        for (ReconciliationIssue issue : issues) {

            String errorType = issue.issueType().name();

            ReconciliationResult reconciliationResult =
                    new ReconciliationResult();

            reconciliationResult.setReconciliation(reconciliation);
            reconciliationResult.setmInTransaction(
                    issue.mInTransaction() == null
                            ? null
                            : transactionMap.get(
                            issue.mInTransaction().transactionId()
                    )
            );

            reconciliationResult.setmOutTransaction(
                    issue.mOutTransaction() == null
                            ? null
                            : transactionMap.get(
                            issue.mOutTransaction().transactionId()
                    )
            );

            reconciliationResult.setMatchStatus("ISSUE");
            reconciliationResult.setErrorType(errorType);
            reconciliationResult.setErrorReason(issue.description());
            reconciliationResult.setCreatedAt(LocalDateTime.now());

            ReconciliationResult savedResult =
                    reconciliationResultRepository.save(
                            reconciliationResult
                    );

            ReconciliationError reconciliationError =
                    new ReconciliationError();

            reconciliationError.setReconciliationResult(savedResult);
            reconciliationError.setErrorType(errorType);
            reconciliationError.setErrorCode(errorType);
            reconciliationError.setDescription(issue.description());
            reconciliationError.setStatus("OPEN");
            reconciliationError.setCreatedAt(LocalDateTime.now());
            reconciliationError.setUpdatedAt(LocalDateTime.now());

            reconciliationErrorRepository.save(reconciliationError);
        }
    }
}