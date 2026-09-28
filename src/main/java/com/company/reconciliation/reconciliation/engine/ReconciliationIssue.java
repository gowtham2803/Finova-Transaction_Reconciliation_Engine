
package com.company.reconciliation.reconciliation.engine;

import java.util.Objects;

/**
 * Represents an issue identified during reconciliation.
 *
 * One or both transactions may be null depending
 * on the type of issue.
 */
public record ReconciliationIssue(
        ReconciliationIssueType issueType,
        NormalizedTransaction mInTransaction,
        NormalizedTransaction mOutTransaction,
        String description
) {

    public ReconciliationIssue {
        Objects.requireNonNull(issueType,
                "Issue type cannot be null");

        Objects.requireNonNull(description,
                "Description cannot be null");
    }
}