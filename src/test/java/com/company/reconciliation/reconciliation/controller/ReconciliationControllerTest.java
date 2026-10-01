package com.company.reconciliation.reconciliation.controller;

import com.company.reconciliation.reconciliation.dto.request.ReconciliationCreateRequest;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResponse;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResultResponse;
import com.company.reconciliation.reconciliation.engine.ReconciliationEngineResult;
import com.company.reconciliation.reconciliation.service.ReconciliationManagementService;
import com.company.reconciliation.reconciliation.service.ReconciliationService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationControllerTest {

    @Mock
    private ReconciliationService reconciliationService;

    @Mock
    private ReconciliationManagementService managementService;

    @InjectMocks
    private ReconciliationController reconciliationController;

    @Test
    void createReconciliation_shouldReturnCreatedResponse() {
        ReconciliationCreateRequest request =
                mock(ReconciliationCreateRequest.class);
        ReconciliationResponse expected =
                mock(ReconciliationResponse.class);

        when(managementService.createReconciliation(request))
                .thenReturn(expected);

        ResponseEntity<ReconciliationResponse> response =
                reconciliationController.createReconciliation(request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(managementService).createReconciliation(request);
    }

    @Test
    void getAllReconciliations_shouldReturnOkResponse() {
        List<ReconciliationResponse> expected =
                List.of(mock(ReconciliationResponse.class));

        when(managementService.getAllReconciliations())
                .thenReturn(expected);

        ResponseEntity<List<ReconciliationResponse>> response =
                reconciliationController.getAllReconciliations();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(managementService).getAllReconciliations();
    }

    @Test
    void getReconciliationById_shouldReturnOkResponse() {
        Long reconciliationId = 1L;
        ReconciliationResponse expected =
                mock(ReconciliationResponse.class);

        when(managementService.getReconciliationById(reconciliationId))
                .thenReturn(expected);

        ResponseEntity<ReconciliationResponse> response =
                reconciliationController.getReconciliationById(
                        reconciliationId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(managementService).getReconciliationById(reconciliationId);
    }

    @Test
    void runReconciliation_shouldReturnOkResponse() {
        Long reconciliationId = 1L;
        ReconciliationEngineResult expected =
                new ReconciliationEngineResult(List.of(), List.of());

        when(reconciliationService.reconcile(reconciliationId))
                .thenReturn(expected);

        ResponseEntity<ReconciliationEngineResult> response =
                reconciliationController.runReconciliation(
                        reconciliationId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(reconciliationService).reconcile(reconciliationId);
    }

    @Test
    void runReconciliation_shouldReturnNotFoundWhenMissing() {
        Long reconciliationId = 999L;

        when(reconciliationService.reconcile(reconciliationId))
                .thenThrow(new EntityNotFoundException(
                        "Reconciliation not found: " + reconciliationId));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> reconciliationController.runReconciliation(
                        reconciliationId));

        assertEquals(HttpStatus.NOT_FOUND.value(),
                exception.getStatusCode().value());

        verify(reconciliationService).reconcile(reconciliationId);
    }

    @Test
    void getReconciliationResults_shouldReturnOkResponse() {
        Long reconciliationId = 1L;
        List<ReconciliationResultResponse> expected =
                List.of(mock(ReconciliationResultResponse.class));

        when(reconciliationService.getResultsByReconciliation(
                reconciliationId)).thenReturn(expected);

        ResponseEntity<List<ReconciliationResultResponse>> response =
                reconciliationController.getReconciliationResults(
                        reconciliationId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(reconciliationService)
                .getResultsByReconciliation(reconciliationId);
    }

    @Test
    void getReconciliationErrors_shouldReturnOkResponse() {
        Long reconciliationId = 1L;
        String status = "OPEN";

        List<ReconciliationErrorResponse> expected =
                List.of(mock(ReconciliationErrorResponse.class));

        when(reconciliationService.getErrorsByReconciliation(
                reconciliationId, status)).thenReturn(expected);

        ResponseEntity<List<ReconciliationErrorResponse>> response =
                reconciliationController.getReconciliationErrors(
                        reconciliationId, status);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(reconciliationService)
                .getErrorsByReconciliation(reconciliationId, status);
    }

    @Test
    void getReconciliationErrors_withoutStatus_shouldPassNullStatus() {
        Long reconciliationId = 1L;
        List<ReconciliationErrorResponse> expected = List.of();

        when(reconciliationService.getErrorsByReconciliation(
                reconciliationId, null)).thenReturn(expected);

        ResponseEntity<List<ReconciliationErrorResponse>> response =
                reconciliationController.getReconciliationErrors(
                        reconciliationId, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(reconciliationService)
                .getErrorsByReconciliation(reconciliationId, null);
    }
}