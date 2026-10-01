package com.company.reconciliation.reconciliation.controller;

import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationErrorControllerTest {

    @Mock
    private ReconciliationService reconciliationService;

    @InjectMocks
    private ReconciliationErrorController errorController;

    @Test
    void getErrorById_shouldReturnOkResponse() {
        Long errorId = 1L;
        ReconciliationErrorResponse expected =
                mock(ReconciliationErrorResponse.class);

        when(reconciliationService.getErrorById(errorId))
                .thenReturn(expected);

        ResponseEntity<ReconciliationErrorResponse> response =
                errorController.getErrorById(errorId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(expected, response.getBody());
        verify(reconciliationService).getErrorById(errorId);
    }

    @Test
    void getErrorById_shouldReturnNotFoundWhenMissing() {
        Long errorId = 999L;

        when(reconciliationService.getErrorById(errorId))
                .thenThrow(new EntityNotFoundException(
                        "Error not found: " + errorId));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> errorController.getErrorById(errorId));

        assertEquals(HttpStatus.NOT_FOUND.value(),
                exception.getStatusCode().value());
        verify(reconciliationService).getErrorById(errorId);
    }

    @Test
    void getErrorById_shouldReturnBadRequestForInvalidId() {
        Long errorId = 0L;

        when(reconciliationService.getErrorById(errorId))
                .thenThrow(new IllegalArgumentException(
                        "Error ID must be positive"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> errorController.getErrorById(errorId));

        assertEquals(HttpStatus.BAD_REQUEST.value(),
                exception.getStatusCode().value());
        verify(reconciliationService).getErrorById(errorId);
    }

    @Test
    void resolveError_shouldReturnResolvedError() {
        Long errorId = 1L;
        ReconciliationErrorResponse expected =
                mock(ReconciliationErrorResponse.class);

        when(reconciliationService.resolveError(errorId))
                .thenReturn(expected);

        ReconciliationErrorResponse response =
                errorController.resolveError(errorId);

        assertSame(expected, response);
        verify(reconciliationService).resolveError(errorId);
    }

    @Test
    void resolveError_shouldReturnNotFoundWhenMissing() {
        Long errorId = 999L;

        when(reconciliationService.resolveError(errorId))
                .thenThrow(new EntityNotFoundException(
                        "Error not found: " + errorId));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> errorController.resolveError(errorId));

        assertEquals(HttpStatus.NOT_FOUND.value(),
                exception.getStatusCode().value());
        verify(reconciliationService).resolveError(errorId);
    }

    @Test
    void resolveError_shouldReturnBadRequestForInvalidId() {
        Long errorId = 0L;

        when(reconciliationService.resolveError(errorId))
                .thenThrow(new IllegalArgumentException(
                        "Error ID must be positive"));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> errorController.resolveError(errorId));

        assertEquals(HttpStatus.BAD_REQUEST.value(),
                exception.getStatusCode().value());
        verify(reconciliationService).resolveError(errorId);
    }

    @Test
    void resolveError_shouldReturnConflictWhenAlreadyResolved() {
        Long errorId = 1L;

        when(reconciliationService.resolveError(errorId))
                .thenThrow(new IllegalStateException(
                        "This error has already been resolved."));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> errorController.resolveError(errorId));

        assertEquals(HttpStatus.CONFLICT.value(),
                exception.getStatusCode().value());
        verify(reconciliationService).resolveError(errorId);
    }
}