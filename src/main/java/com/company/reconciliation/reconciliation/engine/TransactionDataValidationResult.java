
package com.company.reconciliation.reconciliation.engine;

import java.util.List;
import java.util.Objects;

public record TransactionDataValidationResult(
        List<NormalizedTransaction> validTransactions,
        List<ReconciliationIssue> issues) {

    public TransactionDataValidationResult {
        Objects.requireNonNull(
                validTransactions,
                "Valid transactions cannot be null"
        );

        Objects.requireNonNull(
                issues,
                "Issues cannot be null"
        );

        validTransactions = List.copyOf(validTransactions);
        issues = List.copyOf(issues);
    }

    public int validCount() {
        return validTransactions.size();
    }

    public int issueCount() {
        return issues.size();
    }
}