package com.company.reconciliation.reconciliation.controller;

import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;
import com.company.reconciliation.reconciliation.service.ReconciliationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/errors")
public class ReconciliationErrorController {

    private final ReconciliationService reconciliationService;

    public ReconciliationErrorController(
            ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    // Retrieve one reconciliation error
    @GetMapping("/{errorId}")
    public ResponseEntity<ReconciliationErrorResponse> getErrorById(
            @PathVariable Long errorId) {

        try {
            return ResponseEntity.ok(
                    reconciliationService.getErrorById(errorId)
            );
        } catch (EntityNotFoundException exception) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    exception.getMessage(),
                    exception
            );
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }

    @PatchMapping("/{errorId}/resolve")
    public ReconciliationErrorResponse resolveError(
            @PathVariable Long errorId) {

        try {
            return reconciliationService.resolveError(errorId);

        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    ex.getMessage()
            );

        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    ex.getMessage()
            );

        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    ex.getMessage()
            );
        }
    }
}