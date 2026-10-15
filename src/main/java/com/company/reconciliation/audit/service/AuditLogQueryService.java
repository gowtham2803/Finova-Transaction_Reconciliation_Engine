
package com.company.reconciliation.audit.service;

import com.company.reconciliation.audit.dto.response.AuditLogResponse;
import com.company.reconciliation.audit.dto.response.ReconciliationAuditSummaryResponse;
import com.company.reconciliation.audit.entity.AuditLog;
import com.company.reconciliation.audit.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class AuditLogQueryService {

    private static final int MAX_PAGE_SIZE = 100;

    private static final Set<String> ALLOWED_SORT_FIELDS =
            Set.of("id", "action", "createdAt", "fieldName");

    private final AuditLogRepository auditLogRepository;

    public AuditLogQueryService(
            AuditLogRepository auditLogRepository
    ) {
        this.auditLogRepository = auditLogRepository;
    }

    public Page<AuditLogResponse> searchAuditLogs(
            Long userId,
            Long reconciliationId,
            Long transactionId,
            String action,
            LocalDateTime startDate,
            LocalDateTime endDate,
            int page,
            int size,
            String sortBy,
            String direction
    ) {
        validateOptionalId(userId, "User ID");
        validateOptionalId(reconciliationId, "Reconciliation ID");
        validateOptionalId(transactionId, "Transaction ID");

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page number cannot be negative"
            );
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException(
                    "Page size must be between 1 and "
                            + MAX_PAGE_SIZE
            );
        }

        if (startDate != null && endDate != null
                && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException(
                    "Start date must not be after end date"
            );
        }

        String normalizedAction =
                action == null || action.isBlank()
                        ? null
                        : action.trim();

        String normalizedSortBy =
                sortBy == null || sortBy.isBlank()
                        ? "createdAt"
                        : sortBy.trim();

        if (!ALLOWED_SORT_FIELDS.contains(normalizedSortBy)) {
            throw new IllegalArgumentException(
                    "Invalid sort field: " + normalizedSortBy
            );
        }

        Sort.Direction sortDirection;
        try {
            sortDirection = direction == null
                    || direction.isBlank()
                    ? Sort.Direction.DESC
                    : Sort.Direction.fromString(direction);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(
                    "Sort direction must be ASC or DESC"
            );
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(sortDirection, normalizedSortBy)
        );

        Page<AuditLog> auditLogs =
                auditLogRepository.searchAuditLogs(
                        userId,
                        reconciliationId,
                        transactionId,
                        normalizedAction,
                        startDate,
                        endDate,
                        pageable
                );

        return auditLogs.map(this::mapToResponse);
    }

    private void validateOptionalId(Long id, String fieldName) {
        if (id != null && id <= 0) {
            throw new IllegalArgumentException(
                    fieldName + " must be positive"
            );
        }
    }

    private AuditLogResponse mapToResponse(AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getUser() != null
                        ? auditLog.getUser().getId()
                        : null,
                auditLog.getUser() != null
                        ? auditLog.getUser().getUsername()
                        : null,
                auditLog.getReconciliation() != null
                        ? auditLog.getReconciliation().getId()
                        : null,
                auditLog.getTransaction() != null
                        ? auditLog.getTransaction().getId()
                        : null,
                auditLog.getAction(),
                auditLog.getFieldName(),
                auditLog.getOldValue(),
                auditLog.getNewValue(),
                auditLog.getReason(),
                auditLog.getRequestId(),
                auditLog.getCreatedAt()
        );
    }

    public List<ReconciliationAuditSummaryResponse> getReconciliationAuditSummaries(String action) {
        String trimmedAction = (action != null && !action.isBlank() && !"ALL".equalsIgnoreCase(action.trim()))
                ? action.trim()
                : null;

        List<Object[]> aggregates = auditLogRepository.getReconciliationAuditSummaryAggregates(trimmedAction);
        List<ReconciliationAuditSummaryResponse> results = new ArrayList<>();

        for (Object[] row : aggregates) {
            Long recId = (Long) row[0];
            long totalRecords = ((Number) row[1]).longValue();
            LocalDateTime latestTimestamp = (LocalDateTime) row[2];

            AuditLog latestLog = trimmedAction != null
                    ? auditLogRepository.findFirstByReconciliationIdAndActionOrderByCreatedAtDescIdDesc(recId, trimmedAction)
                    : auditLogRepository.findFirstByReconciliationIdOrderByCreatedAtDescIdDesc(recId);

            if (latestLog != null) {
                String recCode = latestLog.getReconciliation() != null
                        ? latestLog.getReconciliation().getReconciliationCode()
                        : null;
                Long userId = latestLog.getUser() != null ? latestLog.getUser().getId() : null;
                String username = latestLog.getUser() != null ? latestLog.getUser().getUsername() : null;

                results.add(new ReconciliationAuditSummaryResponse(
                        recId,
                        recCode,
                        totalRecords,
                        latestTimestamp,
                        userId,
                        username,
                        latestLog.getAction(),
                        latestLog.getOldValue(),
                        latestLog.getNewValue(),
                        latestLog.getReason()
                ));
            }
        }

        return results;
    }
}