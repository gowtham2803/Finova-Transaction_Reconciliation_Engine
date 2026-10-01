package com.company.reconciliation.reconciliation.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class ReconciliationCreateRequest {

    @NotNull(message = "Created by user ID is required")
    @Positive(message = "Created by user ID must be positive")
    private Long createdByUserId;

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }
}