package com.company.reconciliation.reconciliation.engine;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ReconciliationEngineResultTest {

    @Test
    void shouldReturnCorrectMatchedCount() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(
                                createMatch(),
                                createMatch()
                        ),
                        List.of()
                );

        assertEquals(2, result.matchedCount());
    }

    @Test
    void shouldReturnCorrectIssueCount() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of(
                                createIssue(
                                        ReconciliationIssueType.MISSING_M_IN),
                                createIssue(
                                        ReconciliationIssueType.MISSING_M_OUT)
                        )
                );

        assertEquals(2, result.issueCount());
    }

    @Test
    void shouldReturnReconciledStatusWhenNoIssuesExist() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of()
                );

        ReconciliationSummary summary = result.summary();

        assertEquals(
                ReconciliationStatus.RECONCILED,
                summary.status()
        );

        assertEquals(0, summary.issueCount());
        assertTrue(summary.issueCountsByType().isEmpty());
    }

    @Test
    void shouldReturnIssuesFoundStatusWhenIssuesExist() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of(
                                createIssue(
                                        ReconciliationIssueType.COMMISSION_BOTH_SIDES)
                        )
                );

        ReconciliationSummary summary = result.summary();

        assertEquals(
                ReconciliationStatus.ISSUES_FOUND,
                summary.status()
        );

        assertEquals(1, summary.issueCount());
    }

    @Test
    void shouldAggregateIssuesByType() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of(
                                createIssue(
                                        ReconciliationIssueType.MISSING_M_IN),
                                createIssue(
                                        ReconciliationIssueType.MISSING_M_IN),
                                createIssue(
                                        ReconciliationIssueType.COMMISSION_BOTH_SIDES),
                                createIssue(
                                        ReconciliationIssueType.COMMISSION_MISSING)
                        )
                );

        ReconciliationSummary summary = result.summary();

        assertEquals(4, summary.issueCount());

        assertEquals(
                2,
                summary.issueCountsByType().get(
                        ReconciliationIssueType.MISSING_M_IN)
        );

        assertEquals(
                1,
                summary.issueCountsByType().get(
                        ReconciliationIssueType.COMMISSION_BOTH_SIDES)
        );

        assertEquals(
                1,
                summary.issueCountsByType().get(
                        ReconciliationIssueType.COMMISSION_MISSING)
        );
    }

    @Test
    void shouldIncludeMatchedAndIssueCountsInSummary() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(
                                createMatch(),
                                createMatch(),
                                createMatch()
                        ),
                        List.of(
                                createIssue(
                                        ReconciliationIssueType.MISSING_M_OUT),
                                createIssue(
                                        ReconciliationIssueType.INVALID_DATA)
                        )
                );

        ReconciliationSummary summary = result.summary();

        assertEquals(3, summary.matchedCount());
        assertEquals(2, summary.issueCount());
        assertEquals(
                ReconciliationStatus.ISSUES_FOUND,
                summary.status()
        );
    }

    @Test
    void shouldReturnImmutableIssueCounts() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of(
                                createIssue(
                                        ReconciliationIssueType.MISSING_M_IN)
                        )
                );

        ReconciliationSummary summary = result.summary();

        assertThrows(
                UnsupportedOperationException.class,
                () -> summary.issueCountsByType().put(
                        ReconciliationIssueType.INVALID_DATA,
                        5
                )
        );
    }

    @Test
    void shouldKeepResultListsImmutable() {
        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of()
                );

        assertThrows(
                UnsupportedOperationException.class,
                () -> result.matches().add(createMatch())
        );

        assertThrows(
                UnsupportedOperationException.class,
                () -> result.issues().add(
                        createIssue(
                                ReconciliationIssueType.INVALID_DATA)
                )
        );
    }

    private ReconciliationIssue createIssue(
            ReconciliationIssueType issueType) {

        return new ReconciliationIssue(
                issueType,
                null,
                null,
                "Test issue"
        );
    }

    private ReconciliationMatch createMatch() {

        MatchingKey matchingKey = new MatchingKey(
                1L,
                2L,
                new BigDecimal("100.00")
        );

        NormalizedTransaction mInTransaction =
                new NormalizedTransaction(
                        1L,
                        1L,
                        2L,
                        new BigDecimal("100.00"),
                        new BigDecimal("5.00"),
                        "M_IN"
                );

        NormalizedTransaction mOutTransaction =
                new NormalizedTransaction(
                        2L,
                        1L,
                        2L,
                        new BigDecimal("100.00"),
                        BigDecimal.ZERO,
                        "M_OUT"
                );

        return new ReconciliationMatch(
                matchingKey,
                mInTransaction,
                mOutTransaction
        );
    }
}