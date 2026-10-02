
package com.company.reconciliation.audit.service;

import com.company.reconciliation.audit.dto.response.AuditLogResponse;
import com.company.reconciliation.audit.entity.AuditLog;
import com.company.reconciliation.audit.repository.AuditLogRepository;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogQueryServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditLogQueryService auditLogQueryService;

    @Test
    void searchAuditLogs_shouldReturnMappedPage() {
        User user = new User();
        user.setId(1L);

        Reconciliation reconciliation = new Reconciliation();
        reconciliation.setId(10L);

        Transaction transaction = new Transaction();
        transaction.setId(100L);

        LocalDateTime createdAt = LocalDateTime.of(
                2026, 10, 2, 10, 30
        );

        AuditLog auditLog = new AuditLog();
        auditLog.setId(5L);
        auditLog.setUser(user);
        auditLog.setReconciliation(reconciliation);
        auditLog.setTransaction(transaction);
        auditLog.setAction("TRANSACTION_UPDATED");
        auditLog.setFieldName("amount");
        auditLog.setOldValue("100.00");
        auditLog.setNewValue("150.00");
        auditLog.setReason("Correction");
        auditLog.setRequestId("REQ-001");
        auditLog.setCreatedAt(createdAt);

        Page<AuditLog> auditPage = new PageImpl<>(
                List.of(auditLog),
                PageRequest.of(0, 20),
                1
        );

        when(auditLogRepository.searchAuditLogs(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        )).thenReturn(auditPage);

        Page<AuditLogResponse> result =
                auditLogQueryService.searchAuditLogs(
                        null, null, null, null,
                        null, null,
                        0, 20, "createdAt", "DESC"
                );

        assertEquals(1, result.getTotalElements());
        assertEquals(0, result.getNumber());
        assertEquals(20, result.getSize());

        AuditLogResponse response = result.getContent().get(0);

        assertEquals(5L, response.id());
        assertEquals(1L, response.userId());
        assertEquals(10L, response.reconciliationId());
        assertEquals(100L, response.transactionId());
        assertEquals("TRANSACTION_UPDATED", response.action());
        assertEquals("amount", response.fieldName());
        assertEquals("100.00", response.oldValue());
        assertEquals("150.00", response.newValue());
        assertEquals("Correction", response.reason());
        assertEquals("REQ-001", response.requestId());
        assertEquals(createdAt, response.createdAt());

        verify(auditLogRepository).searchAuditLogs(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                any(Pageable.class)
        );
    }

    @Test
    void searchAuditLogs_shouldPassFiltersToRepository() {
        LocalDateTime startDate =
                LocalDateTime.of(2026, 10, 1, 0, 0);
        LocalDateTime endDate =
                LocalDateTime.of(2026, 10, 3, 23, 59);

        when(auditLogRepository.searchAuditLogs(
                eq(1L),
                eq(10L),
                eq(100L),
                eq("TRANSACTION_UPDATED"),
                eq(startDate),
                eq(endDate),
                any(Pageable.class)
        )).thenReturn(Page.empty());

        Page<AuditLogResponse> result =
                auditLogQueryService.searchAuditLogs(
                        1L, 10L, 100L,
                        " TRANSACTION_UPDATED ",
                        startDate, endDate,
                        0, 10, "id", "ASC"
                );

        assertTrue(result.isEmpty());

        verify(auditLogRepository).searchAuditLogs(
                eq(1L),
                eq(10L),
                eq(100L),
                eq("TRANSACTION_UPDATED"),
                eq(startDate),
                eq(endDate),
                any(Pageable.class)
        );
    }

    @Test
    void searchAuditLogs_shouldRejectInvalidUserId() {
        assertThrows(
                IllegalArgumentException.class,
                () -> auditLogQueryService.searchAuditLogs(
                        0L, null, null, null,
                        null, null,
                        0, 20, "createdAt", "DESC"
                )
        );

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void searchAuditLogs_shouldRejectInvalidPage() {
        assertThrows(
                IllegalArgumentException.class,
                () -> auditLogQueryService.searchAuditLogs(
                        null, null, null, null,
                        null, null,
                        -1, 20, "createdAt", "DESC"
                )
        );

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void searchAuditLogs_shouldRejectInvalidPageSize() {
        assertThrows(
                IllegalArgumentException.class,
                () -> auditLogQueryService.searchAuditLogs(
                        null, null, null, null,
                        null, null,
                        0, 101, "createdAt", "DESC"
                )
        );

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void searchAuditLogs_shouldRejectInvalidDateRange() {
        LocalDateTime start =
                LocalDateTime.of(2026, 10, 3, 0, 0);
        LocalDateTime end =
                LocalDateTime.of(2026, 10, 1, 0, 0);

        assertThrows(
                IllegalArgumentException.class,
                () -> auditLogQueryService.searchAuditLogs(
                        null, null, null, null,
                        start, end,
                        0, 20, "createdAt", "DESC"
                )
        );

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void searchAuditLogs_shouldRejectUnsupportedSortField() {
        assertThrows(
                IllegalArgumentException.class,
                () -> auditLogQueryService.searchAuditLogs(
                        null, null, null, null,
                        null, null,
                        0, 20, "user.password", "ASC"
                )
        );

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void searchAuditLogs_shouldRejectInvalidSortDirection() {
        assertThrows(
                IllegalArgumentException.class,
                () -> auditLogQueryService.searchAuditLogs(
                        null, null, null, null,
                        null, null,
                        0, 20, "createdAt", "INVALID"
                )
        );

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void searchAuditLogs_shouldReturnEmptyPage() {
        when(auditLogRepository.searchAuditLogs(
                isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(), any(Pageable.class)
        )).thenReturn(Page.empty());

        Page<AuditLogResponse> result =
                auditLogQueryService.searchAuditLogs(
                        null, null, null, null,
                        null, null,
                        0, 20, "createdAt", "DESC"
                );

        assertNotNull(result);
        assertTrue(result.isEmpty());
        assertEquals(0, result.getTotalElements());
    }
}