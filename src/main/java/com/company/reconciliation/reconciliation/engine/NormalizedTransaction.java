
package com.company.reconciliation.reconciliation.engine;

import java.math.BigDecimal;

/**
 * Represents a transaction normalized into
 * a common structure for reconciliation.
 */
public record NormalizedTransaction(
        Long transactionId,
        Long fromBranchId,
        Long toBranchId,
        BigDecimal amount,
        BigDecimal commission,
        String sourceSheet
) {
}