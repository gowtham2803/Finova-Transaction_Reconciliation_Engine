
package com.company.reconciliation.reconciliation.engine;

import java.util.List;
import java.util.Objects;

/**
 * Holds the intermediate results of transaction matching.
 */
public record TransactionMatchingResult(
        List<ReconciliationMatch> matches,
        List<AmountMismatch> amountMismatches,
        List<NormalizedTransaction> unmatchedMIn,
        List<NormalizedTransaction> unmatchedMOut
) {

    public TransactionMatchingResult {
        Objects.requireNonNull(matches,
                "Matches cannot be null");

        Objects.requireNonNull(amountMismatches,
                "Amount mismatches cannot be null");

        Objects.requireNonNull(unmatchedMIn,
                "Unmatched M In cannot be null");

        Objects.requireNonNull(unmatchedMOut,
                "Unmatched M Out cannot be null");

        matches = List.copyOf(matches);
        amountMismatches = List.copyOf(amountMismatches);
        unmatchedMIn = List.copyOf(unmatchedMIn);
        unmatchedMOut = List.copyOf(unmatchedMOut);
    }

    public int matchedCount() {
        return matches.size();
    }

    public int amountMismatchCount() {
        return amountMismatches.size();
    }

    public int unmatchedMInCount() {
        return unmatchedMIn.size();
    }

    public int unmatchedMOutCount() {
        return unmatchedMOut.size();
    }
}