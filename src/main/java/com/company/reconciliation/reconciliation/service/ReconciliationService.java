
package com.company.reconciliation.reconciliation.service;

import com.company.reconciliation.audit.service.AuditService;
import com.company.reconciliation.reconciliation.engine.*;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.error.ReconciliationError;
import com.company.reconciliation.reconciliation.error.repository.ReconciliationErrorRepository;
import com.company.reconciliation.reconciliation.error.resolution.ErrorResolution;
import com.company.reconciliation.reconciliation.error.resolution.repository.ErrorResolutionRepository;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import com.company.reconciliation.reconciliation.result.repository.ReconciliationResultRepository;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResultResponse;
import com.company.reconciliation.security.UserContext;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import com.company.reconciliation.user.entity.User;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReconciliationService {

    private final ReconciliationRepository reconciliationRepository;
    private final TransactionRepository transactionRepository;
    private final ReconciliationResultRepository reconciliationResultRepository;
    private final ReconciliationErrorRepository reconciliationErrorRepository;
    private final ErrorResolutionRepository errorResolutionRepository;
    private final ReconciliationEngine reconciliationEngine;
    private final AuditService auditService;

    public ReconciliationService(
            ReconciliationRepository reconciliationRepository,
            TransactionRepository transactionRepository,
            ReconciliationResultRepository reconciliationResultRepository,
            ReconciliationErrorRepository reconciliationErrorRepository,
            ErrorResolutionRepository errorResolutionRepository,
            ReconciliationEngine reconciliationEngine,
            AuditService auditService) {

        this.reconciliationRepository = reconciliationRepository;
        this.transactionRepository = transactionRepository;
        this.reconciliationResultRepository = reconciliationResultRepository;
        this.reconciliationErrorRepository = reconciliationErrorRepository;
        this.errorResolutionRepository = errorResolutionRepository;
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

        // Clear previous errors and results for this reconciliation to prevent stale duplicates on rerun
        List<ReconciliationError> existingErrors =
                reconciliationErrorRepository.findByReconciliationResultReconciliationId(reconciliationId);
        if (!existingErrors.isEmpty()) {
            for (ReconciliationError err : existingErrors) {
                List<ErrorResolution> resolutions = errorResolutionRepository.findByErrorId(err.getId());
                if (!resolutions.isEmpty()) {
                    errorResolutionRepository.deleteAllInBatch(resolutions);
                }
            }
            reconciliationErrorRepository.deleteAllInBatch(existingErrors);
            reconciliationErrorRepository.flush();
        }

        List<ReconciliationResult> existingResults =
                reconciliationResultRepository.findByReconciliationId(reconciliationId);
        if (!existingResults.isEmpty()) {
            reconciliationResultRepository.deleteAllInBatch(existingResults);
            reconciliationResultRepository.flush();
        }

        ReconciliationEngineResult result =
                reconciliationEngine.reconcile(
                        mInTransactions,
                        mOutTransactions
                );

        // Update transaction statuses in database based on the latest reconciliation run
        for (Transaction transaction : transactions) {
            transaction.setStatus("PENDING");
        }

        for (ReconciliationMatch match : result.matches()) {
            Transaction mIn = transactionMap.get(match.mInTransaction().transactionId());
            if (mIn != null) {
                mIn.setStatus("MATCHED");
            }
            Transaction mOut = transactionMap.get(match.mOutTransaction().transactionId());
            if (mOut != null) {
                mOut.setStatus("MATCHED");
            }
        }

        for (ReconciliationIssue issue : result.issues()) {
            if (issue.issueType() == ReconciliationIssueType.MISSING_M_IN) {
                if (issue.mOutTransaction() != null) {
                    Transaction mOut = transactionMap.get(issue.mOutTransaction().transactionId());
                    if (mOut != null) {
                        mOut.setStatus("UNMATCHED");
                    }
                }
            } else if (issue.issueType() == ReconciliationIssueType.MISSING_M_OUT) {
                if (issue.mInTransaction() != null) {
                    Transaction mIn = transactionMap.get(issue.mInTransaction().transactionId());
                    if (mIn != null) {
                        mIn.setStatus("UNMATCHED");
                    }
                }
            } else {
                if (issue.mInTransaction() != null) {
                    Transaction mIn = transactionMap.get(issue.mInTransaction().transactionId());
                    if (mIn != null) {
                        mIn.setStatus("ERROR");
                    }
                }
                if (issue.mOutTransaction() != null) {
                    Transaction mOut = transactionMap.get(issue.mOutTransaction().transactionId());
                    if (mOut != null) {
                        mOut.setStatus("ERROR");
                    }
                }
            }
        }

        transactionRepository.saveAll(transactions);

        saveResultsAndErrors(reconciliation, result.matches(), result.issues(), transactionMap);

        ReconciliationSummary summary = result.summary();

        String finalStatus = summary.status().name();

        reconciliation.setStatus(finalStatus);
        if (isRerun && reconciliation.getVersion() != null) {
            reconciliation.setVersion(reconciliation.getVersion() + 1);
        } else if (reconciliation.getVersion() == null) {
            reconciliation.setVersion(1);
        }
        reconciliation.setCompletedAt(LocalDateTime.now());
        reconciliation.setUpdatedAt(LocalDateTime.now());

        reconciliationRepository.save(reconciliation);

        // Record audit only after successful reconciliation processing.
        Long actorUserId = UserContext.getCurrentUser() != null
                ? UserContext.getCurrentUser().getId()
                : (reconciliation.getCreatedBy() != null && reconciliation.getCreatedBy().getId() != null
                        ? reconciliation.getCreatedBy().getId()
                        : 1L);

        if (actorUserId == null) {
            throw new IllegalStateException(
                    "User identity is required for audit logging"
            );
        }

        auditService.recordAction(
                actorUserId,
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

        List<ReconciliationResult> results = reconciliationResultRepository
                .findByReconciliationId(reconciliationId);

        // Consolidate in case legacy runs had duplicate rows for the same transaction pair
        Map<String, ReconciliationResult> consolidatedMap = new LinkedHashMap<>();

        for (ReconciliationResult r : results) {
            String key;
            if (r.getmInTransaction() != null && r.getmOutTransaction() != null) {
                key = "PAIR:" + r.getmInTransaction().getId() + ":" + r.getmOutTransaction().getId();
            } else if (r.getmInTransaction() != null) {
                key = "MIN:" + r.getmInTransaction().getId();
            } else if (r.getmOutTransaction() != null) {
                key = "MOUT:" + r.getmOutTransaction().getId();
            } else {
                key = "ID:" + r.getId();
            }

            if (!consolidatedMap.containsKey(key)) {
                consolidatedMap.put(key, r);
            } else {
                ReconciliationResult existing = consolidatedMap.get(key);
                // If existing is MATCHED but current has an ISSUE or UNMATCHED, current takes precedence
                if ("MATCHED".equalsIgnoreCase(existing.getMatchStatus()) && !"MATCHED".equalsIgnoreCase(r.getMatchStatus())) {
                    consolidatedMap.put(key, r);
                }
            }
        }

        return consolidatedMap.values()
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

        Long actorUserId = UserContext.getCurrentUser() != null
                ? UserContext.getCurrentUser().getId()
                : (reconciliation.getCreatedBy() != null && reconciliation.getCreatedBy().getId() != null
                        ? reconciliation.getCreatedBy().getId()
                        : 1L);

        if (actorUserId == null) {
            throw new IllegalStateException(
                    "User identity is required for audit logging"
            );
        }

        auditService.recordAction(
                actorUserId,
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

        String matchStatus = result.getMatchStatus();
        if ("ISSUE".equalsIgnoreCase(matchStatus) &&
                ("MISSING_M_OUT".equalsIgnoreCase(result.getErrorType()) || "MISSING_M_IN".equalsIgnoreCase(result.getErrorType()))) {
            matchStatus = "UNMATCHED";
        }

        response.setMatchStatus(matchStatus);
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

    // 10. Persist reconciliation results and errors, ensuring exactly one row per transaction pair or transaction
    private void saveResultsAndErrors(
            Reconciliation reconciliation,
            List<ReconciliationMatch> matches,
            List<ReconciliationIssue> issues,
            Map<Long, Transaction> transactionMap) {

        // Index issues by the matched pair (mInId + ":" + mOutId)
        Map<String, ReconciliationIssue> matchIssueMap = new LinkedHashMap<>();
        Set<ReconciliationIssue> attachedIssues = Collections.newSetFromMap(new IdentityHashMap<>());

        for (ReconciliationIssue issue : issues) {
            if (issue.mInTransaction() != null && issue.mOutTransaction() != null) {
                String key = issue.mInTransaction().transactionId() + ":" + issue.mOutTransaction().transactionId();
                matchIssueMap.put(key, issue);
            }
        }

        // 1. Process all matched pairs
        for (ReconciliationMatch match : matches) {
            Long mInId = match.mInTransaction().transactionId();
            Long mOutId = match.mOutTransaction().transactionId();
            String key = mInId + ":" + mOutId;

            ReconciliationIssue issue = matchIssueMap.get(key);

            ReconciliationResult reconciliationResult = new ReconciliationResult();
            reconciliationResult.setReconciliation(reconciliation);
            reconciliationResult.setmInTransaction(transactionMap.get(mInId));
            reconciliationResult.setmOutTransaction(transactionMap.get(mOutId));

            if (issue != null) {
                attachedIssues.add(issue);
                String errorType = issue.issueType().name();
                reconciliationResult.setMatchStatus("ISSUE");
                reconciliationResult.setErrorType(errorType);
                reconciliationResult.setErrorReason(issue.description());
                reconciliationResult.setCreatedAt(LocalDateTime.now());

                ReconciliationResult savedResult =
                        reconciliationResultRepository.save(reconciliationResult);

                ReconciliationError reconciliationError = new ReconciliationError();
                reconciliationError.setReconciliationResult(savedResult);
                reconciliationError.setErrorType(errorType);
                reconciliationError.setErrorCode(errorType);
                reconciliationError.setDescription(issue.description());
                reconciliationError.setStatus("OPEN");
                reconciliationError.setCreatedAt(LocalDateTime.now());
                reconciliationError.setUpdatedAt(LocalDateTime.now());

                reconciliationErrorRepository.save(reconciliationError);
            } else {
                reconciliationResult.setMatchStatus("MATCHED");
                reconciliationResult.setErrorType(null);
                reconciliationResult.setErrorReason(null);
                reconciliationResult.setCreatedAt(LocalDateTime.now());

                reconciliationResultRepository.save(reconciliationResult);
            }
        }

        // 2. Process issues not associated with a match (e.g. AMOUNT_MISMATCH, MISSING_M_OUT, MISSING_M_IN, invalid data)
        for (ReconciliationIssue issue : issues) {
            if (attachedIssues.contains(issue)) {
                continue;
            }

            String errorType = issue.issueType().name();
            ReconciliationResult reconciliationResult = new ReconciliationResult();
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

            String matchStatus;
            if (issue.issueType() == ReconciliationIssueType.MISSING_M_OUT
                    || issue.issueType() == ReconciliationIssueType.MISSING_M_IN) {
                matchStatus = "UNMATCHED";
            } else {
                matchStatus = "ISSUE";
            }

            reconciliationResult.setMatchStatus(matchStatus);
            reconciliationResult.setErrorType(errorType);
            reconciliationResult.setErrorReason(issue.description());
            reconciliationResult.setCreatedAt(LocalDateTime.now());

            ReconciliationResult savedResult =
                    reconciliationResultRepository.save(reconciliationResult);

            ReconciliationError reconciliationError = new ReconciliationError();
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