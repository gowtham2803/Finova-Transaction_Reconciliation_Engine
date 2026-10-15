package com.company.reconciliation.transaction.service;

import com.company.reconciliation.transaction.dto.TransactionCreateRequest;
import com.company.reconciliation.transaction.dto.TransactionFilterRequest;
import com.company.reconciliation.transaction.dto.TransactionResponse;
import com.company.reconciliation.transaction.dto.TransactionUpdateRequest;

import java.util.List;

public interface TransactionService {

    TransactionResponse createTransaction(TransactionCreateRequest request);

    List<TransactionResponse> createBulkTransactions(
            List<TransactionCreateRequest> requests
    );

    TransactionResponse getTransactionById(Long transactionId);

    List<TransactionResponse> getTransactionsByReconciliation(
            Long reconciliationId
    );

    TransactionResponse updateTransaction(
            Long transactionId,
            TransactionUpdateRequest request
    );

    List<TransactionResponse> getTransactionsByFilter(
            TransactionFilterRequest filter
    );

    void deleteTransaction(Long transactionId);

    void deleteTransactions(List<Long> transactionIds);
}