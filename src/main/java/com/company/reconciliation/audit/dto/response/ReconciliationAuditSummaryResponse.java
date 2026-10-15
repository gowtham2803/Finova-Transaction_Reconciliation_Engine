package com.company.reconciliation.audit.dto.response;

import java.time.LocalDateTime;

public record ReconciliationAuditSummaryResponse(
        Long reconciliationId,
        String reconciliationCode,
        long totalRecords,
        LocalDateTime latestTimestamp,
        Long latestUserId,
        String latestUsername,
        String latestAction,
        String latestOldValue,
        String latestNewValue,
        String latestDescription
) {}
