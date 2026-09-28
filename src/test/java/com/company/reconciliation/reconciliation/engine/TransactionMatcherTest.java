
package com.company.reconciliation.reconciliation.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TransactionMatcherTest {

    private TransactionMatcher matcher;

    @BeforeEach
    void setUp() {
        matcher = new TransactionMatcher();
    }

    private NormalizedTransaction transaction(
            Long id,
            Long from,
            Long to,
            String amount,
            String commission,
            String source) {

        return new NormalizedTransaction(
                id,
                from,
                to,
                new BigDecimal(amount),
                new BigDecimal(commission),
                source
        );
    }

    @Test
    void shouldMatchTransactionsWithSameRouteAndAmount() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "0", "M_IN");

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00", "100", "M_OUT");

        TransactionMatchingResult result = matcher.match(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(1, result.matchedCount());
        assertEquals(0, result.amountMismatchCount());
        assertEquals(0, result.unmatchedMInCount());
        assertEquals(0, result.unmatchedMOutCount());

        assertEquals(
                mIn,
                result.matches().getFirst().mInTransaction()
        );

        assertEquals(
                mOut,
                result.matches().getFirst().mOutTransaction()
        );
    }

    @Test
    void shouldSupportRepeatedTransactions() {

        NormalizedTransaction mIn1 = transaction(
                1L, 10L, 20L, "5000.00", "0", "M_IN");

        NormalizedTransaction mIn2 = transaction(
                2L, 10L, 20L, "5000.00", "0", "M_IN");

        NormalizedTransaction mOut1 = transaction(
                3L, 10L, 20L, "5000.00", "100", "M_OUT");

        TransactionMatchingResult result = matcher.match(
                List.of(mIn1, mIn2),
                List.of(mOut1)
        );

        assertEquals(1, result.matchedCount());
        assertEquals(0, result.amountMismatchCount());
        assertEquals(1, result.unmatchedMInCount());
        assertEquals(0, result.unmatchedMOutCount());

        assertEquals(
                mIn1,
                result.matches().getFirst().mInTransaction()
        );

        assertEquals(
                mIn2,
                result.unmatchedMIn().getFirst()
        );
    }

    @Test
    void shouldIdentifyAmountMismatchOnSameRoute() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "0", "M_IN");

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "7000.00", "100", "M_OUT");

        TransactionMatchingResult result = matcher.match(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(0, result.matchedCount());
        assertEquals(1, result.amountMismatchCount());
        assertEquals(0, result.unmatchedMInCount());
        assertEquals(0, result.unmatchedMOutCount());

        AmountMismatch mismatch =
                result.amountMismatches().getFirst();

        assertEquals(mIn, mismatch.mInTransaction());
        assertEquals(mOut, mismatch.mOutTransaction());
    }

    @Test
    void shouldNotMatchTransactionsOnDifferentRoutes() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.00", "0", "M_IN");

        NormalizedTransaction mOut = transaction(
                2L, 10L, 30L, "5000.00", "100", "M_OUT");

        TransactionMatchingResult result = matcher.match(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(0, result.matchedCount());
        assertEquals(0, result.amountMismatchCount());
        assertEquals(1, result.unmatchedMInCount());
        assertEquals(1, result.unmatchedMOutCount());
    }

    @Test
    void shouldMatchAmountsWithDifferentScales() {

        NormalizedTransaction mIn = transaction(
                1L, 10L, 20L, "5000.0", "0", "M_IN");

        NormalizedTransaction mOut = transaction(
                2L, 10L, 20L, "5000.00", "100", "M_OUT");

        TransactionMatchingResult result = matcher.match(
                List.of(mIn),
                List.of(mOut)
        );

        assertEquals(1, result.matchedCount());
        assertEquals(0, result.amountMismatchCount());
    }

    @Test
    void shouldHandleEmptyTransactionLists() {

        TransactionMatchingResult result = matcher.match(
                List.of(),
                List.of()
        );

        assertEquals(0, result.matchedCount());
        assertEquals(0, result.amountMismatchCount());
        assertEquals(0, result.unmatchedMInCount());
        assertEquals(0, result.unmatchedMOutCount());
    }

    @Test
    void shouldRejectNullTransactionList() {

        assertThrows(
                NullPointerException.class,
                () -> matcher.match(null, List.of())
        );
    }

    @Test
    void shouldRejectTransactionWithNullAmount() {

        NormalizedTransaction invalid = new NormalizedTransaction(
                1L,
                10L,
                20L,
                null,
                BigDecimal.ZERO,
                "M_IN"
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> matcher.match(List.of(invalid), List.of())
        );
    }
}