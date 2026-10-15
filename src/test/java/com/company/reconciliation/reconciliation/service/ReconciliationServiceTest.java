
package com.company.reconciliation.reconciliation.service;

import com.company.reconciliation.audit.service.AuditService;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;
import com.company.reconciliation.reconciliation.engine.MatchingKey;
import com.company.reconciliation.reconciliation.engine.NormalizedTransaction;
import com.company.reconciliation.reconciliation.engine.ReconciliationEngine;
import com.company.reconciliation.reconciliation.engine.ReconciliationEngineResult;
import com.company.reconciliation.reconciliation.engine.ReconciliationIssue;
import com.company.reconciliation.reconciliation.engine.ReconciliationIssueType;
import com.company.reconciliation.reconciliation.engine.ReconciliationMatch;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.error.ReconciliationError;
import com.company.reconciliation.reconciliation.error.repository.ReconciliationErrorRepository;
import com.company.reconciliation.reconciliation.error.resolution.repository.ErrorResolutionRepository;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import com.company.reconciliation.reconciliation.result.repository.ReconciliationResultRepository;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import com.company.reconciliation.user.entity.User;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock
    private ReconciliationRepository reconciliationRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private ReconciliationResultRepository reconciliationResultRepository;

    @Mock
    private ReconciliationErrorRepository reconciliationErrorRepository;

    @Mock
    private ErrorResolutionRepository errorResolutionRepository;

    @Mock
    private ReconciliationEngine reconciliationEngine;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private ReconciliationService reconciliationService;

    @Test
    void reconcile_shouldSaveMatchedTransactions() {

        Long reconciliationId = 1L;

        Reconciliation reconciliation = mock(Reconciliation.class);
        User user = mock(User.class);

        when(reconciliation.getId()).thenReturn(reconciliationId);
        when(user.getId()).thenReturn(1L);
        when(reconciliation.getCreatedBy()).thenReturn(user);
        when(reconciliation.getStatus()).thenReturn("PENDING");
        when(reconciliation.getStartedAt()).thenReturn(null);

        when(reconciliationRepository.findById(reconciliationId))
                .thenReturn(Optional.of(reconciliation));

        Transaction mIn = createTransaction(
                101L, "M_IN", 10L, 20L
        );

        Transaction mOut = createTransaction(
                201L, "M_OUT", 10L, 20L
        );

        when(transactionRepository.findByReconciliationId(reconciliationId))
                .thenReturn(List.of(mIn, mOut));

        NormalizedTransaction normalizedMIn =
                new NormalizedTransaction(
                        101L,
                        10L,
                        20L,
                        new BigDecimal("100.00"),
                        new BigDecimal("2.00"),
                        "M_IN"
                );

        NormalizedTransaction normalizedMOut =
                new NormalizedTransaction(
                        201L,
                        10L,
                        20L,
                        new BigDecimal("100.00"),
                        BigDecimal.ZERO,
                        "M_OUT"
                );

        MatchingKey matchingKey = new MatchingKey(
                10L,
                20L,
                new BigDecimal("100.00")
        );

        ReconciliationMatch match = new ReconciliationMatch(
                matchingKey,
                normalizedMIn,
                normalizedMOut
        );

        ReconciliationEngineResult engineResult =
                new ReconciliationEngineResult(
                        List.of(match),
                        List.of()
                );

        when(reconciliationEngine.reconcile(anyList(), anyList()))
                .thenReturn(engineResult);

        ReconciliationEngineResult result =
                reconciliationService.reconcile(reconciliationId);

        ArgumentCaptor<ReconciliationResult> resultCaptor =
                ArgumentCaptor.forClass(ReconciliationResult.class);

        verify(reconciliationResultRepository)
                .save(resultCaptor.capture());

        ReconciliationResult savedResult = resultCaptor.getValue();

        assertEquals("MATCHED", savedResult.getMatchStatus());
        assertSame(mIn, savedResult.getmInTransaction());
        assertSame(mOut, savedResult.getmOutTransaction());
        assertNull(savedResult.getErrorType());

        verify(reconciliationErrorRepository, never()).save(any());
        verify(reconciliationRepository).save(reconciliation);
        verify(reconciliation).setStatus("RECONCILED");

        assertEquals(1, result.matchedCount());
        assertEquals(0, result.issueCount());

        verify(auditService).recordAction(
                eq(1L),
                eq(reconciliationId),
                eq((Long) null),
                eq("RECONCILIATION_EXECUTED"),
                eq("status"),
                eq("PENDING"),
                eq("RECONCILED"),
                eq("Reconciliation execution completed"),
                eq((String) null)
        );
    }

    @Test
    void reconcile_shouldSaveIssueAndLinkedError() {

        Long reconciliationId = 2L;

        Reconciliation reconciliation = mock(Reconciliation.class);
        User user = mock(User.class);

        when(reconciliation.getId()).thenReturn(reconciliationId);
        when(user.getId()).thenReturn(1L);
        when(reconciliation.getCreatedBy()).thenReturn(user);
        when(reconciliation.getStatus()).thenReturn("PENDING");
        when(reconciliation.getStartedAt()).thenReturn(null);

        when(reconciliationRepository.findById(reconciliationId))
                .thenReturn(Optional.of(reconciliation));

        Transaction mIn = createTransaction(
                102L, "M_IN", 10L, 20L
        );

        when(transactionRepository.findByReconciliationId(reconciliationId))
                .thenReturn(List.of(mIn));

        NormalizedTransaction normalizedMIn =
                new NormalizedTransaction(
                        102L,
                        10L,
                        20L,
                        new BigDecimal("150.00"),
                        BigDecimal.ZERO,
                        "M_IN"
                );

        ReconciliationIssue issue = new ReconciliationIssue(
                ReconciliationIssueType.MISSING_M_OUT,
                normalizedMIn,
                null,
                "M Out transaction is missing"
        );

        ReconciliationEngineResult engineResult =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of(issue)
                );

        when(reconciliationEngine.reconcile(anyList(), anyList()))
                .thenReturn(engineResult);

        when(reconciliationResultRepository.save(
                any(ReconciliationResult.class)
        )).thenAnswer(invocation -> invocation.getArgument(0));

        ReconciliationEngineResult result =
                reconciliationService.reconcile(reconciliationId);

        ArgumentCaptor<ReconciliationResult> resultCaptor =
                ArgumentCaptor.forClass(ReconciliationResult.class);

        verify(reconciliationResultRepository)
                .save(resultCaptor.capture());

        ReconciliationResult savedResult = resultCaptor.getValue();

        assertEquals("UNMATCHED", savedResult.getMatchStatus());
        assertEquals("MISSING_M_OUT", savedResult.getErrorType());
        assertEquals(
                "M Out transaction is missing",
                savedResult.getErrorReason()
        );
        assertSame(mIn, savedResult.getmInTransaction());
        assertNull(savedResult.getmOutTransaction());

        ArgumentCaptor<ReconciliationError> errorCaptor =
                ArgumentCaptor.forClass(ReconciliationError.class);

        verify(reconciliationErrorRepository)
                .save(errorCaptor.capture());

        ReconciliationError savedError = errorCaptor.getValue();

        assertSame(savedResult, savedError.getReconciliationResult());
        assertEquals("MISSING_M_OUT", savedError.getErrorType());
        assertEquals("MISSING_M_OUT", savedError.getErrorCode());
        assertEquals(
                "M Out transaction is missing",
                savedError.getDescription()
        );
        assertEquals("OPEN", savedError.getStatus());

        verify(reconciliationRepository).save(reconciliation);
        verify(reconciliation).setStatus("ISSUES_FOUND");

        assertEquals(0, result.matchedCount());
        assertEquals(1, result.issueCount());

        verify(auditService).recordAction(
                eq(1L),
                eq(reconciliationId),
                eq((Long) null),
                eq("RECONCILIATION_EXECUTED"),
                eq("status"),
                eq("PENDING"),
                eq("ISSUES_FOUND"),
                eq("Reconciliation execution completed"),
                eq((String) null)
        );
    }

    @Test
    void reconcile_shouldSaveMatchedTransactionWithIssue_asSingleResult() {

        Long reconciliationId = 4L;

        Reconciliation reconciliation = mock(Reconciliation.class);
        User user = mock(User.class);

        when(reconciliation.getId()).thenReturn(reconciliationId);
        when(user.getId()).thenReturn(1L);
        when(reconciliation.getCreatedBy()).thenReturn(user);
        when(reconciliation.getStatus()).thenReturn("PENDING");
        when(reconciliation.getStartedAt()).thenReturn(null);

        when(reconciliationRepository.findById(reconciliationId))
                .thenReturn(Optional.of(reconciliation));

        Transaction mIn = createTransaction(103L, "M_IN", 10L, 20L);
        Transaction mOut = createTransaction(203L, "M_OUT", 10L, 20L);

        when(transactionRepository.findByReconciliationId(reconciliationId))
                .thenReturn(List.of(mIn, mOut));

        NormalizedTransaction normMIn = new NormalizedTransaction(
                103L, 10L, 20L, new BigDecimal("200.00"), new BigDecimal("10.00"), "M_IN"
        );
        NormalizedTransaction normMOut = new NormalizedTransaction(
                203L, 10L, 20L, new BigDecimal("200.00"), new BigDecimal("10.00"), "M_OUT"
        );

        MatchingKey key = new MatchingKey(10L, 20L, new BigDecimal("200.00"));
        ReconciliationMatch match = new ReconciliationMatch(key, normMIn, normMOut);

        ReconciliationIssue issue = new ReconciliationIssue(
                ReconciliationIssueType.COMMISSION_BOTH_SIDES,
                normMIn,
                normMOut,
                "Commission was collected on both M In and M Out."
        );

        ReconciliationEngineResult engineResult = new ReconciliationEngineResult(
                List.of(match),
                List.of(issue)
        );

        when(reconciliationEngine.reconcile(anyList(), anyList()))
                .thenReturn(engineResult);

        when(reconciliationResultRepository.save(any(ReconciliationResult.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ReconciliationEngineResult result = reconciliationService.reconcile(reconciliationId);

        ArgumentCaptor<ReconciliationResult> resultCaptor =
                ArgumentCaptor.forClass(ReconciliationResult.class);

        // Verify save was called EXACTLY ONCE (single row for this matched pair with issue)
        verify(reconciliationResultRepository, times(1))
                .save(resultCaptor.capture());

        ReconciliationResult savedResult = resultCaptor.getValue();
        assertEquals("ISSUE", savedResult.getMatchStatus());
        assertEquals("COMMISSION_BOTH_SIDES", savedResult.getErrorType());
        assertEquals("Commission was collected on both M In and M Out.", savedResult.getErrorReason());
        assertSame(mIn, savedResult.getmInTransaction());
        assertSame(mOut, savedResult.getmOutTransaction());

        ArgumentCaptor<ReconciliationError> errorCaptor =
                ArgumentCaptor.forClass(ReconciliationError.class);
        verify(reconciliationErrorRepository, times(1))
                .save(errorCaptor.capture());

        ReconciliationError savedError = errorCaptor.getValue();
        assertSame(savedResult, savedError.getReconciliationResult());
        assertEquals("COMMISSION_BOTH_SIDES", savedError.getErrorType());
        assertEquals("OPEN", savedError.getStatus());
    }

    @Test
    void reconcile_shouldRecordRerunAudit() {

        Long reconciliationId = 3L;

        Reconciliation reconciliation = mock(Reconciliation.class);
        User user = mock(User.class);

        when(reconciliation.getId()).thenReturn(reconciliationId);
        when(user.getId()).thenReturn(1L);
        when(reconciliation.getCreatedBy()).thenReturn(user);
        when(reconciliation.getStatus()).thenReturn("RECONCILED");
        when(reconciliation.getStartedAt())
                .thenReturn(LocalDateTime.now().minusMinutes(5));

        when(reconciliationRepository.findById(reconciliationId))
                .thenReturn(Optional.of(reconciliation));

        when(transactionRepository.findByReconciliationId(reconciliationId))
                .thenReturn(List.of());

        ReconciliationEngineResult engineResult =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of()
                );

        when(reconciliationEngine.reconcile(anyList(), anyList()))
                .thenReturn(engineResult);

        reconciliationService.reconcile(reconciliationId);

        verify(reconciliationRepository).save(reconciliation);

        verify(auditService).recordAction(
                eq(1L),
                eq(reconciliationId),
                eq((Long) null),
                eq("RECONCILIATION_RERUN"),
                eq("status"),
                eq("RECONCILED"),
                any(String.class),
                eq("Reconciliation rerun completed"),
                eq((String) null)
        );
    }

    @Test
    void reconcile_shouldThrowExceptionWhenReconciliationDoesNotExist() {

        Long reconciliationId = 999L;

        when(reconciliationRepository.findById(reconciliationId))
                .thenReturn(Optional.empty());

        assertThrows(
                EntityNotFoundException.class,
                () -> reconciliationService.reconcile(reconciliationId)
        );

        verify(transactionRepository, never())
                .findByReconciliationId(any());

        verify(reconciliationResultRepository, never())
                .save(any());

        verify(reconciliationErrorRepository, never())
                .save(any());

        verifyNoInteractions(auditService);
    }

    @Test
    void resolveError_shouldRecordAudit() {

        Long errorId = 50L;
        Long reconciliationId = 5L;

        ReconciliationError error = mock(ReconciliationError.class);
        ReconciliationResult result = mock(ReconciliationResult.class);
        Reconciliation reconciliation = mock(Reconciliation.class);
        User user = mock(User.class);

        when(user.getId()).thenReturn(1L);
        when(reconciliation.getId()).thenReturn(reconciliationId);
        when(reconciliation.getCreatedBy()).thenReturn(user);

        when(result.getReconciliation()).thenReturn(reconciliation);
        when(error.getReconciliationResult()).thenReturn(result);
        when(error.getStatus()).thenReturn("OPEN");

        when(reconciliationErrorRepository.findById(errorId))
                .thenReturn(Optional.of(error));

        when(reconciliationErrorRepository.save(error))
                .thenReturn(error);

        ReconciliationErrorResponse response =
                reconciliationService.resolveError(errorId);

        assertNotNull(response);

        verify(error).setStatus("RESOLVED");
        verify(reconciliationErrorRepository).save(error);

        verify(auditService).recordAction(
                eq(1L),
                eq(reconciliationId),
                eq((Long) null),
                eq("ERROR_RESOLVED"),
                eq("status"),
                eq("OPEN"),
                eq("RESOLVED"),
                eq("Reconciliation error resolved"),
                eq((String) null)
        );
    }

    private Transaction createTransaction(
            Long id,
            String sourceSheet,
            Long fromBranchId,
            Long toBranchId) {

        Branch fromBranch = mock(Branch.class);
        Branch toBranch = mock(Branch.class);

        when(fromBranch.getId()).thenReturn(fromBranchId);
        when(toBranch.getId()).thenReturn(toBranchId);

        Transaction transaction = mock(Transaction.class);

        when(transaction.getId()).thenReturn(id);
        when(transaction.getSourceSheet()).thenReturn(sourceSheet);
        when(transaction.getFromBranch()).thenReturn(fromBranch);
        when(transaction.getToBranch()).thenReturn(toBranch);
        when(transaction.getAmount()).thenReturn(new BigDecimal("100.00"));
        when(transaction.getCommission()).thenReturn(BigDecimal.ZERO);

        return transaction;
    }
}