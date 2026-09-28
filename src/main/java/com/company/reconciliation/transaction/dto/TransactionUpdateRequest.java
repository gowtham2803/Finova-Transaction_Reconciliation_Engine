
package com.company.reconciliation.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public class TransactionUpdateRequest {

    @NotNull(message = "From branch ID is required")
    @Positive(message = "From branch ID must be positive")
    private Long fromBranchId;

    @NotNull(message = "To branch ID is required")
    @Positive(message = "To branch ID must be positive")
    private Long toBranchId;

    @NotNull(message = "Amount is required")
    @DecimalMin(
            value = "0.0",
            inclusive = false,
            message = "Amount must be greater than zero"
    )
    @Digits(
            integer = 15,
            fraction = 4,
            message = "Amount must have up to 15 integer and 4 decimal digits"
    )
    private BigDecimal amount;

    @NotNull(message = "Commission is required")
    @DecimalMin(
            value = "0.0",
            message = "Commission cannot be negative"
    )
    @Digits(
            integer = 15,
            fraction = 4,
            message = "Commission must have up to 15 integer and 4 decimal digits"
    )
    private BigDecimal commission;

    public TransactionUpdateRequest() {
    }

    public Long getFromBranchId() {
        return fromBranchId;
    }

    public void setFromBranchId(Long fromBranchId) {
        this.fromBranchId = fromBranchId;
    }

    public Long getToBranchId() {
        return toBranchId;
    }

    public void setToBranchId(Long toBranchId) {
        this.toBranchId = toBranchId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getCommission() {
        return commission;
    }

    public void setCommission(BigDecimal commission) {
        this.commission = commission;
    }
}