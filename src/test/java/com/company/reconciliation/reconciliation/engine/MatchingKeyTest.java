
package com.company.reconciliation.reconciliation.engine;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MatchingKeyTest {

    @Test
    void shouldMatchKeysWithDifferentAmountScales() {

        MatchingKey key1 = new MatchingKey(
                1L,
                2L,
                new BigDecimal("5000.00")
        );

        MatchingKey key2 = new MatchingKey(
                1L,
                2L,
                new BigDecimal("5000.0")
        );

        assertEquals(key1, key2);
        assertEquals(key1.hashCode(), key2.hashCode());
    }

    @Test
    void shouldNotMatchDifferentRoutes() {

        MatchingKey key1 = new MatchingKey(
                1L,
                2L,
                new BigDecimal("5000.00")
        );

        MatchingKey key2 = new MatchingKey(
                1L,
                3L,
                new BigDecimal("5000.00")
        );

        assertNotEquals(key1, key2);
    }

    @Test
    void shouldNotMatchDifferentAmounts() {

        MatchingKey key1 = new MatchingKey(
                1L,
                2L,
                new BigDecimal("5000.00")
        );

        MatchingKey key2 = new MatchingKey(
                1L,
                2L,
                new BigDecimal("7000.00")
        );

        assertNotEquals(key1, key2);
    }

    @Test
    void shouldRejectNullAmount() {

        assertThrows(
                NullPointerException.class,
                () -> new MatchingKey(1L, 2L, null)
        );
    }
}