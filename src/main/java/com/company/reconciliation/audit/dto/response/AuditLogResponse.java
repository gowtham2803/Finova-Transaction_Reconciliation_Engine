
package com.company.reconciliation.audit.dto.response;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        Long userId,
        Long reconciliationId,
        Long transactionId,
        String action,
        String fieldName,
        String oldValue,
        String newValue,
        String reason,
        String requestId,
        LocalDateTime createdAt
) {
}