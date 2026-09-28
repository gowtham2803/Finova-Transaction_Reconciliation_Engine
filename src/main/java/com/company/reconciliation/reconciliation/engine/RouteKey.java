
package com.company.reconciliation.reconciliation.engine;

import java.util.Objects;

/**
 * Identifies a transaction route without considering
 * the transaction amount.
 */
public record RouteKey(
        Long fromBranchId,
        Long toBranchId
) {

    public RouteKey {
        Objects.requireNonNull(fromBranchId,
                "From branch ID cannot be null");

        Objects.requireNonNull(toBranchId,
                "To branch ID cannot be null");
    }
}