
package com.company.reconciliation.reconciliation.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TransactionDataValidatorTest {

    private TransactionDataValidator validator;

    @BeforeEach
    void setUp() {
        validator = new TransactionDataValidator();
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

    @Test
    void shouldAcceptValidMInTransaction() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, "5000.00", "100", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(1, result.validCount());
        assertEquals(0, result.issueCount());
        assertSame(transaction, result.validTransactions().getFirst());
    }

    @Test
    void shouldAcceptValidMOutTransaction() {

        NormalizedTransaction transaction = transaction(
                2L, 10L, 20L, "5000.00", "0", "M_OUT"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_OUT");

        assertEquals(1, result.validCount());
        assertTrue(result.issues().isEmpty());
    }

    @Test
    void shouldRejectMissingFromBranchId() {

        NormalizedTransaction transaction = transaction(
                1L, null, 20L, "5000", "100", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                result.issues().getFirst().issueType()
        );
        assertTrue(
                result.issues().getFirst().description()
                        .contains("From Branch ID is required.")
        );
        assertSame(
                transaction,
                result.issues().getFirst().mInTransaction()
        );
    }

    @Test
    void shouldRejectMissingToBranchId() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, null, "5000", "100", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
        assertTrue(
                result.issues().getFirst().description()
                        .contains("To Branch ID is required.")
        );
    }

    @Test
    void shouldRejectNullAmount() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, null, "100", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
        assertTrue(
                result.issues().getFirst().description()
                        .contains("Transaction amount is required.")
        );
    }

    @Test
    void shouldRejectZeroAmount() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, "0", "100", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
        assertTrue(
                result.issues().getFirst().description()
                        .contains("Transaction amount must be greater than zero.")
        );
    }

    @Test
    void shouldRejectNegativeAmount() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, "-500", "100", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
    }

    @Test
    void shouldRejectNullCommission() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, "5000", null, "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
        assertTrue(
                result.issues().getFirst().description()
                        .contains("Commission value is required.")
        );
    }

    @Test
    void shouldRejectNegativeCommission() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, "5000", "-10", "M_OUT"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_OUT");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
        assertNull(result.issues().getFirst().mInTransaction());
        assertSame(
                transaction,
                result.issues().getFirst().mOutTransaction()
        );
    }

    @Test
    void shouldReportMultipleInvalidFieldsTogether() {

        NormalizedTransaction transaction = transaction(
                1L, null, null, "0", "-10", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());

        String description =
                result.issues().getFirst().description();

        assertTrue(description.contains("From Branch ID is required."));
        assertTrue(description.contains("To Branch ID is required."));
        assertTrue(description.contains("Transaction amount must be greater than zero."));
        assertTrue(description.contains("Commission cannot be negative."));
    }

    @Test
    void shouldRejectNullTransaction() {

        TransactionDataValidationResult result =
                validator.validate(
                        Arrays.asList((NormalizedTransaction) null),
                        "M_IN"
                );

        assertEquals(0, result.validCount());
        assertEquals(1, result.issueCount());
        assertEquals(
                ReconciliationIssueType.INVALID_DATA,
                result.issues().getFirst().issueType()
        );
        assertTrue(
                result.issues().getFirst().description()
                        .contains("A null transaction was found in M_IN.")
        );
    }

    @Test
    void shouldValidateMixedTransactions() {

        NormalizedTransaction valid = transaction(
                1L, 10L, 20L, "5000", "100", "M_IN"
        );

        NormalizedTransaction invalid = transaction(
                2L, 10L, 20L, "-100", "0", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(
                        List.of(valid, invalid),
                        "M_IN"
                );

        assertEquals(1, result.validCount());
        assertEquals(1, result.issueCount());
        assertSame(valid, result.validTransactions().getFirst());
    }

    @Test
    void shouldAcceptZeroCommission() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, "5000", "0.00", "M_OUT"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_OUT");

        assertEquals(1, result.validCount());
        assertTrue(result.issues().isEmpty());
    }

    @Test
    void shouldHandleEmptyList() {

        TransactionDataValidationResult result =
                validator.validate(List.of(), "M_IN");

        assertEquals(0, result.validCount());
        assertEquals(0, result.issueCount());
    }

    @Test
    void shouldThrowExceptionWhenTransactionsIsNull() {

        assertThrows(
                NullPointerException.class,
                () -> validator.validate(null, "M_IN")
        );
    }

    @Test
    void shouldThrowExceptionWhenSourceSheetIsNull() {

        assertThrows(
                NullPointerException.class,
                () -> validator.validate(List.of(), null)
        );
    }

    @Test
    void shouldReturnUnmodifiableLists() {

        NormalizedTransaction transaction = transaction(
                1L, 10L, 20L, "5000", "100", "M_IN"
        );

        TransactionDataValidationResult result =
                validator.validate(List.of(transaction), "M_IN");

        assertThrows(
                UnsupportedOperationException.class,
                () -> result.validTransactions().add(transaction)
        );

        assertThrows(
                UnsupportedOperationException.class,
                () -> result.issues().add(
                        new ReconciliationIssue(
                                ReconciliationIssueType.INVALID_DATA,
                                transaction,
                                null,
                                "Test issue"
                        )
                )
        );
    }
}