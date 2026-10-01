package com.company.reconciliation.transaction.controller;

import com.company.reconciliation.transaction.dto.TransactionCreateRequest;
import com.company.reconciliation.transaction.dto.TransactionFilterRequest;
import com.company.reconciliation.transaction.dto.TransactionResponse;
import com.company.reconciliation.transaction.dto.TransactionUpdateRequest;
import com.company.reconciliation.transaction.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    // 1. Create a single transaction
    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(
            @Valid @RequestBody TransactionCreateRequest request) {

        TransactionResponse response =
                transactionService.createTransaction(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 2. Create multiple transactions
    @PostMapping("/bulk")
    public ResponseEntity<List<TransactionResponse>> createBulkTransactions(
            @Valid @RequestBody
            List<@Valid TransactionCreateRequest> requests) {

        List<TransactionResponse> responses =
                transactionService.createBulkTransactions(requests);

        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    // 3. Retrieve a transaction by ID
    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> getTransactionById(
            @PathVariable Long transactionId) {

        TransactionResponse response =
                transactionService.getTransactionById(transactionId);

        return ResponseEntity.ok(response);
    }

    // 4. Retrieve all transactions for a reconciliation
    @GetMapping("/reconciliation/{reconciliationId}")
    public ResponseEntity<List<TransactionResponse>>
    getTransactionsByReconciliation(
            @PathVariable Long reconciliationId) {

        List<TransactionResponse> responses =
                transactionService.getTransactionsByReconciliation(
                        reconciliationId);

        return ResponseEntity.ok(responses);
    }

    // 5. Update an existing transaction
    @PutMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @PathVariable Long transactionId,
            @Valid @RequestBody TransactionUpdateRequest request) {

        TransactionResponse response =
                transactionService.updateTransaction(
                        transactionId, request);

        return ResponseEntity.ok(response);
    }

    // 6. Retrieve transactions using filters
    @GetMapping("/filter")
    public ResponseEntity<List<TransactionResponse>> getTransactionsByFilter(
            @Valid @ModelAttribute TransactionFilterRequest filter) {

        List<TransactionResponse> responses =
                transactionService.getTransactionsByFilter(filter);

        return ResponseEntity.ok(responses);
    }
}