
package com.company.reconciliation.reconciliation.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CommissionValidatorTest {

    private CommissionValidator validator;

    @BeforeEach
    void setUp() {
        validator = new CommissionValidator();
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
                new BigDecimal(amount),
                commission == null ? null : new BigDecimal(commission),
                sourceSheet
        );
    }

    private ReconciliationMatch match(
            String mInCommission,
            String mOutCommission) {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00",
                mInCommission, "M_IN"
        );

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00",
                mOutCommission, "M_OUT"
        );

        MatchingKey key = new MatchingKey(
                10L,
                20L,
                new BigDecimal("5000.00")
        );

        return new ReconciliationMatch(key, mIn, mOut);
    }

    @Test
    void shouldPassWhenCommissionCollectedOnMInOnly() {

        ReconciliationMatch match = match("100", "0");

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertTrue(issues.isEmpty());
    }

    @Test
    void shouldPassWhenCommissionCollectedOnMOutOnly() {

        ReconciliationMatch match = match("0", "100");

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertTrue(issues.isEmpty());
    }

    @Test
    void shouldReportWhenCommissionCollectedOnBothSides() {

        ReconciliationMatch match = match("100", "100");

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertEquals(1, issues.size());

        assertEquals(
                ReconciliationIssueType.COMMISSION_BOTH_SIDES,
                issues.getFirst().issueType()
        );
    }

    @Test
    void shouldReportWhenCommissionMissingOnBothSides() {

        ReconciliationMatch match = match("0", "0");

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertEquals(1, issues.size());

        assertEquals(
                ReconciliationIssueType.COMMISSION_MISSING,
                issues.getFirst().issueType()
        );
    }

    @Test
    void shouldReportInvalidDataWhenMInCommissionIsNull() {

        ReconciliationMatch match = match(null, "100");

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertEquals(1, issues.size());

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                issues.getFirst().issueType()
        );

        assertEquals(
                "Commission value cannot be null.",
                issues.getFirst().description()
        );
    }

    @Test
    void shouldReportInvalidDataWhenMOutCommissionIsNull() {

        ReconciliationMatch match = match("100", null);

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertEquals(1, issues.size());

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                issues.getFirst().issueType()
        );
    }

    @Test
    void shouldReportInvalidDataWhenCommissionIsNegative() {

        ReconciliationMatch match = match("-10", "100");

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertEquals(1, issues.size());

        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                issues.getFirst().issueType()
        );

        assertEquals(
                "Commission cannot be negative.",
                issues.getFirst().description()
        );
    }

    @Test
    void shouldAcceptCommissionWithDifferentBigDecimalScales() {

        ReconciliationMatch match = match("100.00", "0.000");

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match));

        assertTrue(issues.isEmpty());
    }

    @Test
    void shouldValidateMultipleMatches() {

        List<ReconciliationMatch> matches = List.of(
                match("100", "0"),
                match("100", "100"),
                match("0", "0")
        );

        List<ReconciliationIssue> issues =
                validator.validate(matches);

        assertEquals(2, issues.size());

        assertEquals(
                ReconciliationIssueType.COMMISSION_BOTH_SIDES,
                issues.get(0).issueType()
        );

        assertEquals(
                ReconciliationIssueType.COMMISSION_MISSING,
                issues.get(1).issueType()
        );
    }

    @Test
    void shouldReturnEmptyListWhenNoMatchesExist() {

        List<ReconciliationIssue> issues =
                validator.validate(List.of());

        assertTrue(issues.isEmpty());
    }

    @Test
    void shouldThrowExceptionWhenMatchesIsNull() {

        assertThrows(
                NullPointerException.class,
                () -> validator.validate(null)
        );
    }

    @Test
    void shouldThrowExceptionWhenMatchIsNull() {

        List<ReconciliationMatch> matches =
                java.util.Arrays.asList((ReconciliationMatch) null);

        assertThrows(
                NullPointerException.class,
                () -> validator.validate(matches)
        );
    }

    @Test
    void shouldReturnUnmodifiableIssueList() {

        List<ReconciliationIssue> issues =
                validator.validate(List.of(match("100", "100")));

        assertThrows(
                UnsupportedOperationException.class,
                () -> issues.add(
                        new ReconciliationIssue(
                                ReconciliationIssueType.COMMISSION_MISSING,
                                match("0", "0").mInTransaction(),
                                match("0", "0").mOutTransaction(),
                                "Test issue"
                        )
                )
        );
    }
}