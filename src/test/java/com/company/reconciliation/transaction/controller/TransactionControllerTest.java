package com.company.reconciliation.transaction.controller;

import com.company.reconciliation.transaction.dto.TransactionCreateRequest;
import com.company.reconciliation.transaction.dto.TransactionFilterRequest;
import com.company.reconciliation.transaction.dto.TransactionResponse;
import com.company.reconciliation.transaction.dto.TransactionUpdateRequest;
import com.company.reconciliation.transaction.service.TransactionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionControllerTest {

    @Mock
    private TransactionService transactionService;

    @InjectMocks
    private TransactionController transactionController;

    @Test
    void createTransaction_shouldReturnCreatedResponse() {
        TransactionCreateRequest request =
                mock(TransactionCreateRequest.class);
        TransactionResponse expected =
                mock(TransactionResponse.class);

        when(transactionService.createTransaction(request))
                .thenReturn(expected);

        ResponseEntity<TransactionResponse> response =
                transactionController.createTransaction(request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(transactionService).createTransaction(request);
    }

    @Test
    void createBulkTransactions_shouldReturnCreatedResponse() {
        List<TransactionCreateRequest> requests = List.of(
                mock(TransactionCreateRequest.class),
                mock(TransactionCreateRequest.class)
        );
        List<TransactionResponse> expected = List.of(
                mock(TransactionResponse.class),
                mock(TransactionResponse.class)
        );

        when(transactionService.createBulkTransactions(requests))
                .thenReturn(expected);

        ResponseEntity<List<TransactionResponse>> response =
                transactionController.createBulkTransactions(requests);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(transactionService).createBulkTransactions(requests);
    }

    @Test
    void getTransactionById_shouldReturnOkResponse() {
        Long transactionId = 1L;
        TransactionResponse expected =
                mock(TransactionResponse.class);

        when(transactionService.getTransactionById(transactionId))
                .thenReturn(expected);

        ResponseEntity<TransactionResponse> response =
                transactionController.getTransactionById(transactionId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(transactionService).getTransactionById(transactionId);
    }

    @Test
    void getTransactionsByReconciliation_shouldReturnOkResponse() {
        Long reconciliationId = 1L;
        List<TransactionResponse> expected =
                List.of(mock(TransactionResponse.class));

        when(transactionService.getTransactionsByReconciliation(
                reconciliationId)).thenReturn(expected);

        ResponseEntity<List<TransactionResponse>> response =
                transactionController.getTransactionsByReconciliation(
                        reconciliationId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(transactionService)
                .getTransactionsByReconciliation(reconciliationId);
    }

    @Test
    void updateTransaction_shouldReturnOkResponse() {
        Long transactionId = 1L;
        TransactionUpdateRequest request =
                mock(TransactionUpdateRequest.class);
        TransactionResponse expected =
                mock(TransactionResponse.class);

        when(transactionService.updateTransaction(
                transactionId, request)).thenReturn(expected);

        ResponseEntity<TransactionResponse> response =
                transactionController.updateTransaction(
                        transactionId, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(transactionService)
                .updateTransaction(transactionId, request);
    }

    @Test
    void getTransactionsByFilter_shouldReturnOkResponse() {
        TransactionFilterRequest filter =
                mock(TransactionFilterRequest.class);
        List<TransactionResponse> expected =
                List.of(mock(TransactionResponse.class));

        when(transactionService.getTransactionsByFilter(filter))
                .thenReturn(expected);

        ResponseEntity<List<TransactionResponse>> response =
                transactionController.getTransactionsByFilter(filter);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(transactionService).getTransactionsByFilter(filter);
    }

    @Test
    void deleteTransaction_shouldReturnNoContent() {
        Long transactionId = 1L;

        ResponseEntity<Void> response = transactionController.deleteTransaction(transactionId);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(transactionService).deleteTransaction(transactionId);
    }

    @Test
    void deleteTransactions_shouldReturnNoContent() {
        List<Long> ids = List.of(1L, 2L);

        ResponseEntity<Void> response = transactionController.deleteTransactions(ids);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(transactionService).deleteTransactions(ids);
    }
}