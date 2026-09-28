
package com.company.reconciliation.reconciliation.engine;

import java.util.Objects;

/**
 * Represents a matched M In and M Out transaction pair.
 */
public record ReconciliationMatch(
        MatchingKey matchingKey,
        NormalizedTransaction mInTransaction,
        NormalizedTransaction mOutTransaction
) {

    public ReconciliationMatch {
        Objects.requireNonNull(matchingKey,
                "Matching key cannot be null");

        Objects.requireNonNull(mInTransaction,
                "M In transaction cannot be null");

        Objects.requireNonNull(mOutTransaction,
                "M Out transaction cannot be null");
    }
}