
package com.company.reconciliation.audit.controller;

import com.company.reconciliation.audit.dto.response.AuditLogResponse;
import com.company.reconciliation.audit.dto.response.ReconciliationAuditSummaryResponse;
import com.company.reconciliation.audit.service.AuditLogQueryService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogQueryService auditLogQueryService;

    public AuditLogController(
            AuditLogQueryService auditLogQueryService
    ) {
        this.auditLogQueryService = auditLogQueryService;
    }

    @GetMapping
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long reconciliationId,
            @RequestParam(required = false) Long transactionId,
            @RequestParam(required = false) String action,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate,

            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction
    ) {
        Page<AuditLogResponse> response =
                auditLogQueryService.searchAuditLogs(
                        userId,
                        reconciliationId,
                        transactionId,
                        action,
                        startDate,
                        endDate,
                        page,
                        size,
                        sortBy,
                        direction
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/summaries")
    public ResponseEntity<List<ReconciliationAuditSummaryResponse>> getAuditSummaries(
            @RequestParam(required = false) String action
    ) {
        List<ReconciliationAuditSummaryResponse> summaries =
                auditLogQueryService.getReconciliationAuditSummaries(action);
        return ResponseEntity.ok(summaries);
    }
}