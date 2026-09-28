
package com.company.reconciliation.reconciliation.engine;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Component
public class TransactionDataValidator {

    public TransactionDataValidationResult validate(
            List<NormalizedTransaction> transactions,
            String sourceSheet) {

        Objects.requireNonNull(
                transactions,
                "Transactions cannot be null"
        );

        Objects.requireNonNull(
                sourceSheet,
                "Source sheet cannot be null"
        );

        List<NormalizedTransaction> validTransactions =
                new ArrayList<>();

        List<ReconciliationIssue> issues =
                new ArrayList<>();

        for (NormalizedTransaction transaction : transactions) {

            if (transaction == null) {
                issues.add(new ReconciliationIssue(
                        ReconciliationIssueType.INVALID_DATA,
                        null,
                        null,
                        "A null transaction was found in "
                                + sourceSheet + "."
                ));
                continue;
            }

            List<String> errors = new ArrayList<>();

            if (transaction.fromBranchId() == null) {
                errors.add("From Branch ID is required.");
            }

            if (transaction.toBranchId() == null) {
                errors.add("To Branch ID is required.");
            }

            if (transaction.amount() == null) {
                errors.add("Transaction amount is required.");
            } else if (transaction.amount()
                    .compareTo(BigDecimal.ZERO) <= 0) {
                errors.add("Transaction amount must be greater than zero.");
            }

            if (transaction.commission() == null) {
                errors.add("Commission value is required.");
            } else if (transaction.commission()
                    .compareTo(BigDecimal.ZERO) < 0) {
                errors.add("Commission cannot be negative.");
            }

            if (errors.isEmpty()) {
                validTransactions.add(transaction);
            } else {
                String description = String.join(" ", errors);

                if ("M_IN".equalsIgnoreCase(sourceSheet)) {
                    issues.add(new ReconciliationIssue(
                            ReconciliationIssueType.INVALID_DATA,
                            transaction,
                            null,
                            description
                    ));
                } else if ("M_OUT".equalsIgnoreCase(sourceSheet)) {
                    issues.add(new ReconciliationIssue(
                            ReconciliationIssueType.INVALID_DATA,
                            null,
                            transaction,
                            description
                    ));
                } else {
                    issues.add(new ReconciliationIssue(
                            ReconciliationIssueType.INVALID_DATA,
                            transaction,
                            null,
                            "Unknown source sheet: "
                                    + sourceSheet + ". " + description
                    ));
                }
            }
        }

        return new TransactionDataValidationResult(
                validTransactions,
                issues
        );
    }
}