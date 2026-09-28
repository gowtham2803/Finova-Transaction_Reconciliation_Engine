package com.company.reconciliation.reconciliation.controller;

import com.company.reconciliation.reconciliation.engine.ReconciliationEngineResult;
import com.company.reconciliation.reconciliation.service.ReconciliationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reconciliations")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    public ReconciliationController(
            ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<ReconciliationEngineResult> runReconciliation(
            @PathVariable Long id) {

        try {
            ReconciliationEngineResult result =
                    reconciliationService.reconcile(id);

            return ResponseEntity.ok(result);

        } catch (EntityNotFoundException exception) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    exception.getMessage()
            );
        }
    }
}