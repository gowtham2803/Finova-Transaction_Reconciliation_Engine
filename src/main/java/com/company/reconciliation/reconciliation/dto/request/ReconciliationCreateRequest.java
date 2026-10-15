package com.company.reconciliation.reconciliation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class ReconciliationCreateRequest {

    @NotBlank(message = "Reconciliation name is required")
    @Size(max = 150, message = "Reconciliation name cannot exceed 150 characters")
    private String reconciliationName;

    @NotNull(message = "Created by user ID is required")
    @Positive(message = "Created by user ID must be positive")
    private Long createdByUserId;

    public String getReconciliationName() {
        return reconciliationName;
    }

    public void setReconciliationName(String reconciliationName) {
        this.reconciliationName = reconciliationName;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }
}