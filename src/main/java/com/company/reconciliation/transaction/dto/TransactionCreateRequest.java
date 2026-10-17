
package com.company.reconciliation.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public class TransactionCreateRequest {

    @NotNull(message = "Reconciliation ID is required")
    @Positive(message = "Reconciliation ID must be positive")
    private Long reconciliationId;

    @NotBlank(message = "Source sheet is required")
    @Pattern(
            regexp = "M_IN|M_OUT",
            message = "Source sheet must be M_IN or M_OUT"
    )
    private String sourceSheet;

    @Positive(message = "Source row must be positive")
    private Integer sourceRow;

    @Positive(message = "From branch ID must be positive")
    private Long fromBranchId;

    private String fromBranchName;

    @Positive(message = "To branch ID must be positive")
    private Long toBranchId;

    private String toBranchName;

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

    @DecimalMin(
            value = "0.0",
            message = "Commission cannot be negative"
    )
    @Digits(
            integer = 15,
            fraction = 4,
            message = "Commission must have up to 15 integer and 4 decimal digits"
    )
    private BigDecimal commission = BigDecimal.ZERO;

    public TransactionCreateRequest() {
    }

    public Long getReconciliationId() {
        return reconciliationId;
    }

    public void setReconciliationId(Long reconciliationId) {
        this.reconciliationId = reconciliationId;
    }

    public String getSourceSheet() {
        return sourceSheet;
    }

    public void setSourceSheet(String sourceSheet) {
        this.sourceSheet = sourceSheet;
    }

    public Integer getSourceRow() {
        return sourceRow;
    }

    public void setSourceRow(Integer sourceRow) {
        this.sourceRow = sourceRow;
    }

    public Long getFromBranchId() {
        return fromBranchId;
    }

    public void setFromBranchId(Long fromBranchId) {
        this.fromBranchId = fromBranchId;
    }

    public String getFromBranchName() {
        return fromBranchName;
    }

    public void setFromBranchName(String fromBranchName) {
        this.fromBranchName = fromBranchName;
    }

    public Long getToBranchId() {
        return toBranchId;
    }

    public void setToBranchId(Long toBranchId) {
        this.toBranchId = toBranchId;
    }

    public String getToBranchName() {
        return toBranchName;
    }

    public void setToBranchName(String toBranchName) {
        this.toBranchName = toBranchName;
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