
package com.company.reconciliation.reconciliation.engine;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class CommissionValidator {

    public List<ReconciliationIssue> validate(
            List<ReconciliationMatch> matches) {

        Objects.requireNonNull(matches, "Matches cannot be null");

        List<ReconciliationIssue> issues = new ArrayList<>();

        for (ReconciliationMatch match : matches) {

            Objects.requireNonNull(match, "Match cannot be null");

            NormalizedTransaction mIn = match.mInTransaction();
            NormalizedTransaction mOut = match.mOutTransaction();

            BigDecimal mInCommission = mIn.commission();
            BigDecimal mOutCommission = mOut.commission();

            if (mInCommission == null || mOutCommission == null) {
                issues.add(new ReconciliationIssue(
                        ReconciliationIssueType.INVALID_DATA,
                        mIn,
                        mOut,
                        "Commission value cannot be null."
                ));
                continue;
            }

            if (mInCommission.compareTo(BigDecimal.ZERO) < 0
                    || mOutCommission.compareTo(BigDecimal.ZERO) < 0) {
                issues.add(new ReconciliationIssue(
                        ReconciliationIssueType.INVALID_DATA,
                        mIn,
                        mOut,
                        "Commission cannot be negative."
                ));
                continue;
            }

            boolean mInCollected =
                    mInCommission.compareTo(BigDecimal.ZERO) > 0;

            boolean mOutCollected =
                    mOutCommission.compareTo(BigDecimal.ZERO) > 0;

            if (mInCollected && mOutCollected) {

                issues.add(new ReconciliationIssue(
                        ReconciliationIssueType.COMMISSION_BOTH_SIDES,
                        mIn,
                        mOut,
                        "Commission was collected on both M In and M Out."
                ));

            } else if (!mInCollected && !mOutCollected) {

                issues.add(new ReconciliationIssue(
                        ReconciliationIssueType.COMMISSION_MISSING,
                        mIn,
                        mOut,
                        "Commission was not collected on either side."
                ));
            }
        }

        return List.copyOf(issues);
    }
}