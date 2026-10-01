package com.company.reconciliation.reconciliation.dto.response;

import java.time.LocalDateTime;

public class ReconciliationResultResponse {

    private Long id;
    private Long reconciliationId;
    private Long mInTransactionId;
    private Long mOutTransactionId;
    private String matchStatus;
    private String errorType;
    private String errorReason;
    private LocalDateTime createdAt;

    public ReconciliationResultResponse() {
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

    public Long getmInTransactionId() {
        return mInTransactionId;
    }

    public void setmInTransactionId(Long mInTransactionId) {
        this.mInTransactionId = mInTransactionId;
    }

    public Long getmOutTransactionId() {
        return mOutTransactionId;
    }

    public void setmOutTransactionId(Long mOutTransactionId) {
        this.mOutTransactionId = mOutTransactionId;
    }

    public String getMatchStatus() {
        return matchStatus;
    }

    public void setMatchStatus(String matchStatus) {
        this.matchStatus = matchStatus;
    }

    public String getErrorType() {
        return errorType;
    }

    public void setErrorType(String errorType) {
        this.errorType = errorType;
    }

    public String getErrorReason() {
        return errorReason;
    }

    public void setErrorReason(String errorReason) {
        this.errorReason = errorReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}