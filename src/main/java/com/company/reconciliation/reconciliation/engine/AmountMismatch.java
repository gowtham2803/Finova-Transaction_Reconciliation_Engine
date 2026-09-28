
package com.company.reconciliation.reconciliation.engine;

import java.util.Objects;

/**
 * Represents two transactions with the same route
 * but different transaction amounts.
 */
public record AmountMismatch(
        NormalizedTransaction mInTransaction,
        NormalizedTransaction mOutTransaction
) {

    public AmountMismatch {
        Objects.requireNonNull(mInTransaction,
                "M In transaction cannot be null");

        Objects.requireNonNull(mOutTransaction,
                "M Out transaction cannot be null");

        if (!Objects.equals(
                mInTransaction.fromBranchId(),
                mOutTransaction.fromBranchId())) {
            throw new IllegalArgumentException(
                    "From branch IDs must match");
        }

        if (!Objects.equals(
                mInTransaction.toBranchId(),
                mOutTransaction.toBranchId())) {
            throw new IllegalArgumentException(
                    "To branch IDs must match");
        }

        if (mInTransaction.amount() == null
                || mOutTransaction.amount() == null) {
            throw new IllegalArgumentException(
                    "Transaction amounts cannot be null");
        }

        if (mInTransaction.amount().compareTo(
                mOutTransaction.amount()) == 0) {
            throw new IllegalArgumentException(
                    "Amounts must be different");
        }
    }
}