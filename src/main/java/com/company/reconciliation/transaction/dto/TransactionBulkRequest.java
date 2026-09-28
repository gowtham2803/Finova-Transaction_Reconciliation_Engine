
package com.company.reconciliation.transaction.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class TransactionBulkRequest {

    @NotEmpty(message = "Transaction list cannot be empty")
    @Valid
    private List<TransactionCreateRequest> transactions;

    public TransactionBulkRequest() {
    }

    public List<TransactionCreateRequest> getTransactions() {
        return transactions;
    }

    public void setTransactions(
            List<TransactionCreateRequest> transactions) {
        this.transactions = transactions;
    }
}