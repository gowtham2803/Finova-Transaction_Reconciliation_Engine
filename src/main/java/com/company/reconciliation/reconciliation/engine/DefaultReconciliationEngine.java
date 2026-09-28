
package com.company.reconciliation.reconciliation.engine;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Component
public class DefaultReconciliationEngine implements ReconciliationEngine {

    private final TransactionMatcher transactionMatcher;
    private final CommissionValidator commissionValidator;
    private final TransactionDataValidator transactionDataValidator;

    public DefaultReconciliationEngine(
            TransactionMatcher transactionMatcher,
            CommissionValidator commissionValidator,
            TransactionDataValidator transactionDataValidator) {

        this.transactionMatcher = Objects.requireNonNull(
                transactionMatcher,
                "TransactionMatcher cannot be null"
        );

        this.commissionValidator = Objects.requireNonNull(
                commissionValidator,
                "CommissionValidator cannot be null"
        );

        this.transactionDataValidator = Objects.requireNonNull(
                transactionDataValidator,
                "TransactionDataValidator cannot be null"
        );
    }

    @Override
    public ReconciliationEngineResult reconcile(
            List<NormalizedTransaction> mInTransactions,
            List<NormalizedTransaction> mOutTransactions) {

        Objects.requireNonNull(
                mInTransactions,
                "M In transactions cannot be null"
        );

        Objects.requireNonNull(
                mOutTransactions,
                "M Out transactions cannot be null"
        );

        // Step 1: Validate M In transactions.
        TransactionDataValidationResult mInValidation =
                transactionDataValidator.validate(
                        mInTransactions,
                        "M_IN"
                );

        // Step 2: Validate M Out transactions.
        TransactionDataValidationResult mOutValidation =
                transactionDataValidator.validate(
                        mOutTransactions,
                        "M_OUT"
                );

        // Step 3: Match only valid transactions.
        TransactionMatchingResult matchingResult =
                transactionMatcher.match(
                        mInValidation.validTransactions(),
                        mOutValidation.validTransactions()
                );

        List<ReconciliationMatch> matches =
                matchingResult.matches();

        List<ReconciliationIssue> issues = new ArrayList<>();

        // Step 4: Add invalid-data issues.
        issues.addAll(mInValidation.issues());
        issues.addAll(mOutValidation.issues());

        // Step 5: Add amount mismatch issues.
        for (AmountMismatch mismatch :
                matchingResult.amountMismatches()) {

            issues.add(new ReconciliationIssue(
                    ReconciliationIssueType.AMOUNT_MISMATCH,
                    mismatch.mInTransaction(),
                    mismatch.mOutTransaction(),
                    "Transaction amounts do not match for the same branch route."
            ));
        }

        // Step 6: Add missing M Out issues.
        for (NormalizedTransaction mIn :
                matchingResult.unmatchedMIn()) {

            issues.add(new ReconciliationIssue(
                    ReconciliationIssueType.MISSING_M_OUT,
                    mIn,
                    null,
                    "No matching M Out transaction was found."
            ));
        }

        // Step 7: Add missing M In issues.
        for (NormalizedTransaction mOut :
                matchingResult.unmatchedMOut()) {

            issues.add(new ReconciliationIssue(
                    ReconciliationIssueType.MISSING_M_IN,
                    null,
                    mOut,
                    "No matching M In transaction was found."
            ));
        }

        // Step 8: Validate commissions on exact matches.
        issues.addAll(
                commissionValidator.validate(matches)
        );

        // Step 9: Return combined results.
        return new ReconciliationEngineResult(
                matches,
                issues
        );
    }
}