
package com.company.reconciliation.reconciliation.controller;

import com.company.reconciliation.reconciliation.engine.ReconciliationEngineResult;
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

    @InjectMocks
    private ReconciliationController reconciliationController;

    @Test
    void runReconciliation_shouldReturnOkResponse() {

        Long reconciliationId = 1L;

        ReconciliationEngineResult result =
                new ReconciliationEngineResult(
                        List.of(),
                        List.of()
                );

        when(reconciliationService.reconcile(reconciliationId))
                .thenReturn(result);

        ResponseEntity<ReconciliationEngineResult> response =
                reconciliationController.runReconciliation(reconciliationId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(result, response.getBody());

        verify(reconciliationService).reconcile(reconciliationId);
    }

    @Test
    void runReconciliation_shouldReturnNotFoundWhenMissing() {

        Long reconciliationId = 999L;

        when(reconciliationService.reconcile(reconciliationId))
                .thenThrow(new EntityNotFoundException(
                        "Reconciliation not found: " + reconciliationId
                ));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> reconciliationController.runReconciliation(reconciliationId)
        );

        assertEquals(404, exception.getStatusCode().value());

        verify(reconciliationService).reconcile(reconciliationId);
    }
}