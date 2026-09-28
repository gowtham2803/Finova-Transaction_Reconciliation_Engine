package com.company.reconciliation.reconciliation.engine;

import java.util.Map;
import java.util.Objects;

/**
 * Provides a summary of reconciliation results.
 */
public record ReconciliationSummary(
        int matchedCount,
        int issueCount,
        Map<ReconciliationIssueType, Integer> issueCountsByType,
        ReconciliationStatus status
) {

    public ReconciliationSummary {
        if (matchedCount < 0) {
            throw new IllegalArgumentException(
                    "Matched count cannot be negative");
        }

        if (issueCount < 0) {
            throw new IllegalArgumentException(
                    "Issue count cannot be negative");
        }

        Objects.requireNonNull(issueCountsByType,
                "Issue counts cannot be null");

        Objects.requireNonNull(status,
                "Status cannot be null");

        issueCountsByType = Map.copyOf(issueCountsByType);
    }
}