
package com.company.reconciliation.reconciliation.service;

import com.company.reconciliation.reconciliation.engine.*;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import com.company.reconciliation.reconciliation.result.repository.ReconciliationResultRepository;
import com.company.reconciliation.reconciliation.error.ReconciliationError;
import com.company.reconciliation.reconciliation.error.repository.ReconciliationErrorRepository;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResultResponse;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;

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

    public ReconciliationService(
            ReconciliationRepository reconciliationRepository,
            TransactionRepository transactionRepository,
            ReconciliationResultRepository reconciliationResultRepository,
            ReconciliationErrorRepository reconciliationErrorRepository,
            ReconciliationEngine reconciliationEngine) {

        this.reconciliationRepository = reconciliationRepository;
        this.transactionRepository = transactionRepository;
        this.reconciliationResultRepository = reconciliationResultRepository;
        this.reconciliationErrorRepository = reconciliationErrorRepository;
        this.reconciliationEngine = reconciliationEngine;
    }

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
                .filter(transaction -> "M_IN".equals(transaction.getSourceSheet()))
                .map(this::normalize)
                .toList();

        List<NormalizedTransaction> mOutTransactions = transactions.stream()
                .filter(transaction -> "M_OUT".equals(transaction.getSourceSheet()))
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
                reconciliationEngine.reconcile(mInTransactions, mOutTransactions);

        saveMatches(reconciliation, result.matches(), transactionMap);
        saveIssues(reconciliation, result.issues(), transactionMap);

        ReconciliationSummary summary = result.summary();

        reconciliation.setStatus(summary.status().name());
        reconciliation.setCompletedAt(LocalDateTime.now());
        reconciliation.setUpdatedAt(LocalDateTime.now());

        reconciliationRepository.save(reconciliation);

        return result;
    }

    // Retrieve all results for a reconciliation
    @Transactional
    public List<ReconciliationResultResponse> getResultsByReconciliation(
            Long reconciliationId) {

        validateReconciliationExists(reconciliationId);

        return reconciliationResultRepository
                .findByReconciliationId(reconciliationId)
                .stream()
                .map(this::mapToResultResponse)
                .toList();
    }

    // Retrieve all errors for a reconciliation,
    // optionally filtered by status
    @Transactional
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

    // Retrieve one error by ID
    @Transactional
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

    // Resolve an open reconciliation error
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

        if ("RESOLVED".equalsIgnoreCase(error.getStatus())) {
            throw new IllegalStateException(
                    "This error has already been resolved."
            );
        }

        if (!"OPEN".equalsIgnoreCase(error.getStatus())) {
            throw new IllegalStateException(
                    "Only OPEN errors can be resolved."
            );
        }

        error.setStatus("RESOLVED");
        error.setUpdatedAt(LocalDateTime.now());

        ReconciliationError savedError =
                reconciliationErrorRepository.save(error);

        return mapToErrorResponse(savedError);
    }

    // Validate reconciliation exists
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

    // Map result entity to response DTO
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

    // Map error entity to response DTO
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

    private void saveMatches(
            Reconciliation reconciliation,
            List<ReconciliationMatch> matches,
            Map<Long, Transaction> transactionMap) {

        for (ReconciliationMatch match : matches) {

            ReconciliationResult reconciliationResult =
                    new ReconciliationResult();

            reconciliationResult.setReconciliation(reconciliation);
            reconciliationResult.setmInTransaction(
                    transactionMap.get(match.mInTransaction().transactionId())
            );

            reconciliationResult.setmOutTransaction(
                    transactionMap.get(match.mOutTransaction().transactionId())
            );

            reconciliationResult.setMatchStatus("MATCHED");
            reconciliationResult.setErrorType(null);
            reconciliationResult.setErrorReason(null);
            reconciliationResult.setCreatedAt(LocalDateTime.now());

            reconciliationResultRepository.save(reconciliationResult);
        }
    }

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
                            : transactionMap.get(issue.mInTransaction().transactionId())
            );

            reconciliationResult.setmOutTransaction(
                    issue.mOutTransaction() == null
                            ? null
                            : transactionMap.get(issue.mOutTransaction().transactionId())
            );

            reconciliationResult.setMatchStatus("ISSUE");
            reconciliationResult.setErrorType(errorType);
            reconciliationResult.setErrorReason(issue.description());
            reconciliationResult.setCreatedAt(LocalDateTime.now());

            ReconciliationResult savedResult =
                    reconciliationResultRepository.save(reconciliationResult);

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