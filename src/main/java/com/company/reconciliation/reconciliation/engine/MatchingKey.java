
package com.company.reconciliation.reconciliation.engine;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Represents the unique combination of fields
 * used to match transactions between M In and M Out.
 *
 * Matching is based on:
 * - From Branch ID
 * - To Branch ID
 * - Transaction Amount
 */
public record MatchingKey(
        Long fromBranchId,
        Long toBranchId,
        BigDecimal amount
) {

    public MatchingKey {
        Objects.requireNonNull(fromBranchId,
                "From branch ID cannot be null");

        Objects.requireNonNull(toBranchId,
                "To branch ID cannot be null");

        Objects.requireNonNull(amount,
                "Transaction amount cannot be null");

        // Normalize the amount to avoid BigDecimal
        // scale differences during key comparison.
        amount = amount.stripTrailingZeros();
    }
}