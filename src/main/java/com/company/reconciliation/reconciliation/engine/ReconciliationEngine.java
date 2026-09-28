
package com.company.reconciliation.reconciliation.engine;

import java.util.List;

/**
 * Defines the contract for the reconciliation engine.
 *
 * The matching and validation algorithm will be
 * implemented in the next phase.
 */
public interface ReconciliationEngine {

    /**
     * Reconciles transactions from M In and M Out.
     *
     * @param mInTransactions transactions from M In
     * @param mOutTransactions transactions from M Out
     * @return reconciliation matches and issues
     */
    ReconciliationEngineResult reconcile(
            List<NormalizedTransaction> mInTransactions,
            List<NormalizedTransaction> mOutTransactions
    );
}