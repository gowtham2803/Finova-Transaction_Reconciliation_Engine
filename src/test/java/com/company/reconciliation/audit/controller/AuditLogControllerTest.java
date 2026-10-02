
package com.company.reconciliation.audit.controller;

import com.company.reconciliation.audit.dto.response.AuditLogResponse;
import com.company.reconciliation.audit.service.AuditLogQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogControllerTest {

    @Mock
    private AuditLogQueryService auditLogQueryService;

    @InjectMocks
    private AuditLogController auditLogController;

    @Test
    void getAuditLogs_shouldReturnOkResponse() {
        AuditLogResponse auditLog = new AuditLogResponse(
                1L,
                1L,
                10L,
                null,
                "RECONCILIATION_CREATED",
                "status",
                null,
                "PENDING",
                "Reconciliation created",
                null,
                java.time.LocalDateTime.of(
                        2026, 10, 2, 10, 0
                )
        );

        Page<AuditLogResponse> expected =
                new org.springframework.data.domain.PageImpl<>(
                        List.of(auditLog)
                );

        when(auditLogQueryService.searchAuditLogs(
                isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(),
                eq(0), eq(20),
                eq("createdAt"), eq("DESC")
        )).thenReturn(expected);

        ResponseEntity<Page<AuditLogResponse>> response =
                auditLogController.getAuditLogs(
                        null, null, null, null,
                        null, null,
                        0, 20,
                        "createdAt", "DESC"
                );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        assertEquals(1, response.getBody().getTotalElements());

        verify(auditLogQueryService).searchAuditLogs(
                isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(),
                eq(0), eq(20),
                eq("createdAt"), eq("DESC")
        );
    }

    @Test
    void getAuditLogs_shouldPassFiltersToService() {
        java.time.LocalDateTime start =
                java.time.LocalDateTime.of(2026, 10, 1, 0, 0);
        java.time.LocalDateTime end =
                java.time.LocalDateTime.of(2026, 10, 3, 23, 59);

        when(auditLogQueryService.searchAuditLogs(
                1L, 10L, 100L,
                "TRANSACTION_UPDATED",
                start, end,
                1, 10,
                "id", "ASC"
        )).thenReturn(Page.empty());

        ResponseEntity<Page<AuditLogResponse>> response =
                auditLogController.getAuditLogs(
                        1L, 10L, 100L,
                        "TRANSACTION_UPDATED",
                        start, end,
                        1, 10,
                        "id", "ASC"
                );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());

        verify(auditLogQueryService).searchAuditLogs(
                1L, 10L, 100L,
                "TRANSACTION_UPDATED",
                start, end,
                1, 10,
                "id", "ASC"
        );
    }
}