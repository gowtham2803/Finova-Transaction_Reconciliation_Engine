package com.company.reconciliation.reconciliation.dto.response;

import java.time.LocalDateTime;

public class ReconciliationErrorResponse {

    private Long id;
    private Long reconciliationId;
    private Long reconciliationResultId;
    private String errorType;
    private String errorCode;
    private String description;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ReconciliationErrorResponse() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getReconciliationId() {
        return reconciliationId;
    }

    public void setReconciliationId(Long reconciliationId) {
        this.reconciliationId = reconciliationId;
    }

    public Long getReconciliationResultId() {
        return reconciliationResultId;
    }

    public void setReconciliationResultId(Long reconciliationResultId) {
        this.reconciliationResultId = reconciliationResultId;
    }

    public String getErrorType() {
        return errorType;
    }

    public void setErrorType(String errorType) {
        this.errorType = errorType;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}