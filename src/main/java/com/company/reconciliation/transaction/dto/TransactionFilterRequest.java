
package com.company.reconciliation.transaction.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public class TransactionFilterRequest {

    @NotNull(message = "Reconciliation ID is required")
    @Positive(message = "Reconciliation ID must be positive")
    private Long reconciliationId;

    @Pattern(
            regexp = "M_IN|M_OUT",
            message = "Source sheet must be M_IN or M_OUT"
    )
    private String sourceSheet;

    @Positive(message = "Branch ID must be positive")
    private Long branchId;

    private String status;

    public TransactionFilterRequest() {
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

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}