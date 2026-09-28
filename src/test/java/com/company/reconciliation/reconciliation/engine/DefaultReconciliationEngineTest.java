
package com.company.reconciliation.reconciliation.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DefaultReconciliationEngineTest {

    private DefaultReconciliationEngine engine;

    @BeforeEach
    void setUp() {
        engine = new DefaultReconciliationEngine(
                new TransactionMatcher(),
                new CommissionValidator(),
                new TransactionDataValidator()
        );
    }

    private NormalizedTransaction transaction(
            Long id,
            Long fromBranchId,
            Long toBranchId,
            String amount,
            String commission,
            String sourceSheet) {

        return new NormalizedTransaction(
                id,
                fromBranchId,
                toBranchId,
                amount == null ? null : new BigDecimal(amount),
                commission == null ? null : new BigDecimal(commission),
                sourceSheet
        );
    }

    // ==========================================
    // SUCCESSFUL MATCHING TESTS
    // ==========================================

    @Test
    void shouldMatchTransactionsWithValidCommission() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(1, result.matchedCount());
        assertEquals(0, result.issueCount());
        assertTrue(result.issues().isEmpty());

        assertSame(mIn, result.matches().getFirst().mInTransaction());
        assertSame(mOut, result.matches().getFirst().mOutTransaction());
    }

    // ==========================================
    // COMMISSION VALIDATION TESTS
    // ==========================================

    @Test
    void shouldReportCommissionCollectedOnBothSides() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00", "100", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(1, result.matchedCount());
        assertEquals(1, result.issueCount());

        assertEquals(
                ReconciliationIssueType.COMMISSION_BOTH_SIDES,
                result.issues().getFirst().issueType()
        );
    }

    @Test
    void shouldReportMissingCommissionOnBothSides() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "0", "M_IN"
        );

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(1, result.matchedCount());
        assertEquals(1, result.issueCount());

        assertEquals(
                ReconciliationIssueType.COMMISSION_MISSING,
                result.issues().getFirst().issueType()
        );
    }

    // ==========================================
    // AMOUNT MISMATCH TESTS
    // ==========================================

    @Test
    void shouldReportAmountMismatchForSameRoute() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "6000.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(0, result.matchedCount());
        assertEquals(1, result.issueCount());

        assertEquals(
                ReconciliationIssueType.AMOUNT_MISMATCH,
                result.issues().getFirst().issueType()
        );

        assertSame(
                mIn,
                result.issues().getFirst().mInTransaction()
        );

        assertSame(
                mOut,
                result.issues().getFirst().mOutTransaction()
        );
    }

    // ==========================================
    // MISSING TRANSACTION TESTS
    // ==========================================

    @Test
    void shouldReportMissingMOutTransaction() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(mIn),
                List.of()
        );

        assertEquals(0, result.matchedCount());
        assertEquals(1, result.issueCount());

        ReconciliationIssue issue = result.issues().getFirst();

        assertEquals(
                ReconciliationIssueType.MISSING_M_OUT,
                issue.issueType()
        );

        assertSame(mIn, issue.mInTransaction());
        assertNull(issue.mOutTransaction());
    }

    @Test
    void shouldReportMissingMInTransaction() {

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00", "100", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(),
                List.of(mOut)
        );

        assertEquals(0, result.matchedCount());
        assertEquals(1, result.issueCount());

        ReconciliationIssue issue = result.issues().getFirst();

        assertEquals(
                ReconciliationIssueType.MISSING_M_IN,
                issue.issueType()
        );

        assertNull(issue.mInTransaction());
        assertSame(mOut, issue.mOutTransaction());
    }

    // ==========================================
    // MULTIPLE ISSUE TEST
    // ==========================================

    @Test
    void shouldReportMultipleIssuesAcrossTransactions() {

        NormalizedTransaction validMIn = transaction(
                1L, 10L, 20L, "1000.00", "50", "M_IN"
        );

        NormalizedTransaction validMOut = transaction(
                2L, 10L, 20L, "1000.00", "0", "M_OUT"
        );

        NormalizedTransaction commissionErrorMIn = transaction(
                3L, 30L, 40L, "2000.00", "50", "M_IN"
        );

        NormalizedTransaction commissionErrorMOut = transaction(
                4L, 30L, 40L, "2000.00", "60", "M_OUT"
        );

        NormalizedTransaction missingMIn = transaction(
                5L, 50L, 60L, "3000.00", "0", "M_IN"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(
                        validMIn,
                        commissionErrorMIn,
                        missingMIn
                ),
                List.of(
                        validMOut,
                        commissionErrorMOut
                )
        );

        assertEquals(2, result.matchedCount());
        assertEquals(2, result.issueCount());

        assertTrue(result.issues().stream().anyMatch(
                issue -> issue.issueType()
                        == ReconciliationIssueType.COMMISSION_BOTH_SIDES
        ));

        assertTrue(result.issues().stream().anyMatch(
                issue -> issue.issueType()
                        == ReconciliationIssueType.MISSING_M_OUT
        ));
    }

    // ==========================================
    // EMPTY INPUT TEST
    // ==========================================

    @Test
    void shouldHandleEmptyTransactionLists() {

        ReconciliationEngineResult result = engine.reconcile(
                List.of(),
                List.of()
        );

        assertEquals(0, result.matchedCount());
        assertEquals(0, result.issueCount());
        assertTrue(result.matches().isEmpty());
        assertTrue(result.issues().isEmpty());
    }

    // ==========================================
    // NULL INPUT TESTS
    // ==========================================

    @Test
    void shouldThrowExceptionWhenMInListIsNull() {

        assertThrows(
                NullPointerException.class,
                () -> engine.reconcile(null, List.of())
        );
    }

    @Test
    void shouldThrowExceptionWhenMOutListIsNull() {

        assertThrows(
                NullPointerException.class,
                () -> engine.reconcile(List.of(), null)
        );
    }

    // ==========================================
    // DATA VALIDATION INTEGRATION TESTS
    // ==========================================

    @Test
    void shouldReportInvalidDataAndContinueMatchingValidTransactions() {

        NormalizedTransaction validMIn = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        NormalizedTransaction invalidMIn = transaction(
                2L, 30L, 40L, "-500.00", "0", "M_IN"
        );

        NormalizedTransaction validMOut = transaction(
                3L, 10L, 20L, "5000.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(validMIn, invalidMIn),
                List.of(validMOut)
        );

        assertEquals(1, result.matchedCount());
        assertEquals(1, result.issueCount());

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                result.issues().getFirst().issueType()
        );

        assertSame(
                invalidMIn,
                result.issues().getFirst().mInTransaction()
        );
    }

    @Test
    void shouldNotAttemptToMatchInvalidTransactions() {

        NormalizedTransaction invalidMIn = transaction(
                1L, null, 20L, "5000.00", "100", "M_IN"
        );

        NormalizedTransaction validMOut = transaction(
                2L, 10L, 20L, "5000.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(invalidMIn),
                List.of(validMOut)
        );

        assertEquals(0, result.matchedCount());
        assertEquals(2, result.issueCount());

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                result.issues().get(0).issueType()
        );

        assertEquals(
                ReconciliationIssueType.MISSING_M_IN,
                result.issues().get(1).issueType()
        );
    }

    @Test
    void shouldReportInvalidDataFromBothSheets() {

        NormalizedTransaction invalidMIn = transaction(
                1L, 10L, 20L, "0", "100", "M_IN"
        );

        NormalizedTransaction invalidMOut = transaction(
                2L, 10L, 20L, "5000.00", "-10", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(invalidMIn),
                List.of(invalidMOut)
        );

        assertEquals(0, result.matchedCount());
        assertEquals(2, result.issueCount());

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                result.issues().get(0).issueType()
        );

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                result.issues().get(1).issueType()
        );

        assertSame(
                invalidMIn,
                result.issues().get(0).mInTransaction()
        );

        assertSame(
                invalidMOut,
                result.issues().get(1).mOutTransaction()
        );
    }

    @Test
    void shouldHandleNullTransactionEntryWithoutCrashing() {

        NormalizedTransaction validMOut = transaction(
                2L, 10L, 20L, "5000.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                Arrays.asList((NormalizedTransaction) null),
                List.of(validMOut)
        );

        assertEquals(0, result.matchedCount());
        assertEquals(2, result.issueCount());

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                result.issues().get(0).issueType()
        );

        assertEquals(
                ReconciliationIssueType.MISSING_M_IN,
                result.issues().get(1).issueType()
        );
    }

    @Test
    void shouldGenerateCorrectSummaryForSuccessfulReconciliation() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(mIn),
                List.of(mOut)
        );

        ReconciliationSummary summary = result.summary();

        assertEquals(1, summary.matchedCount());
        assertEquals(0, summary.issueCount());

        assertTrue(summary.issueCountsByType().isEmpty());

        assertEquals(
                ReconciliationStatus.RECONCILED,
                summary.status()
        );
    }

    @Test
    void shouldGenerateCorrectSummaryForMultipleIssueTypes() {

        NormalizedTransaction commissionErrorMIn = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        NormalizedTransaction commissionErrorMOut = transaction(
                2L, 10L, 20L, "5000.00", "100", "M_OUT"
        );

        NormalizedTransaction missingMIn = transaction(
                3L, 30L, 40L, "2000.00", "0", "M_IN"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(commissionErrorMIn, missingMIn),
                List.of(commissionErrorMOut)
        );

        ReconciliationSummary summary = result.summary();

        assertEquals(1, summary.matchedCount());
        assertEquals(2, summary.issueCount());

        assertEquals(
                1,
                summary.issueCountsByType().get(
                        ReconciliationIssueType.COMMISSION_BOTH_SIDES
                )
        );

        assertEquals(
                1,
                summary.issueCountsByType().get(
                        ReconciliationIssueType.MISSING_M_OUT
                )
        );

        assertEquals(
                ReconciliationStatus.ISSUES_FOUND,
                summary.status()
        );
    }

    @Test
    void shouldIncludeInvalidDataInSummary() {

        NormalizedTransaction invalidMIn = transaction(
                1L, 10L, 20L, "-500.00", "0", "M_IN"
        );

        NormalizedTransaction validMOut = transaction(
                2L, 10L, 20L, "500.00", "0", "M_OUT"
        );

        ReconciliationEngineResult result = engine.reconcile(
                List.of(invalidMIn),
                List.of(validMOut)
        );

        ReconciliationSummary summary = result.summary();

        assertEquals(0, summary.matchedCount());
        assertEquals(2, summary.issueCount());

        assertEquals(
                1,
                summary.issueCountsByType().get(
                        ReconciliationIssueType.INVALID_DATA
                )
        );

        assertEquals(
                1,
                summary.issueCountsByType().get(
                        ReconciliationIssueType.MISSING_M_IN
                )
        );

        assertEquals(
                ReconciliationStatus.ISSUES_FOUND,
                summary.status()
        );
    }
}