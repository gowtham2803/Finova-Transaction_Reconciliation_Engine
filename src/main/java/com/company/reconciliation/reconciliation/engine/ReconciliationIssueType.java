
package com.company.reconciliation.reconciliation.engine;

/**
 * Defines the types of reconciliation issues
 * that can be identified by the engine.
 */
public enum ReconciliationIssueType {

    MISSING_M_IN,

    MISSING_M_OUT,

    AMOUNT_MISMATCH,

    COMMISSION_BOTH_SIDES,

    COMMISSION_MISSING,

    INVALID_DATA,

    VALIDATION_ERROR
}