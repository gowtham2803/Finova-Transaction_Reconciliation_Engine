package com.company.reconciliation.reconciliation.engine;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Holds the results produced by the reconciliation engine.
 */
public record ReconciliationEngineResult(
        List<ReconciliationMatch> matches,
        List<ReconciliationIssue> issues
) {

    public ReconciliationEngineResult {
        Objects.requireNonNull(matches,
                "Matches cannot be null");

        Objects.requireNonNull(issues,
                "Issues cannot be null");

        matches = List.copyOf(matches);
        issues = List.copyOf(issues);
    }

    public int matchedCount() {
        return matches.size();
    }

    public int issueCount() {
        return issues.size();
    }

    /**
     * Generates a summary of the reconciliation result.
     */
    public ReconciliationSummary summary() {

        Map<ReconciliationIssueType, Integer> issueCounts =
                new EnumMap<>(ReconciliationIssueType.class);

        for (ReconciliationIssue issue : issues) {
            issueCounts.merge(
                    issue.issueType(),
                    1,
                    Integer::sum
            );
        }

        ReconciliationStatus status = issues.isEmpty()
                ? ReconciliationStatus.RECONCILED
                : ReconciliationStatus.ISSUES_FOUND;

        return new ReconciliationSummary(
                matchedCount(),
                issueCount(),
                issueCounts,
                status
        );
    }
}