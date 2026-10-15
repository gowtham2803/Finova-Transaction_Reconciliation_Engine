package com.company.reconciliation.reconciliation.controller;

import com.company.reconciliation.reconciliation.dto.request.ReconciliationCreateRequest;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResponse;
import com.company.reconciliation.reconciliation.engine.ReconciliationEngineResult;
import com.company.reconciliation.reconciliation.service.ReconciliationManagementService;
import com.company.reconciliation.reconciliation.service.ReconciliationService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResultResponse;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationErrorResponse;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@RestController
@RequestMapping("/api/reconciliations")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;
    private final ReconciliationManagementService managementService;

    public ReconciliationController(
            ReconciliationService reconciliationService,
            ReconciliationManagementService managementService
    ) {
        this.reconciliationService = reconciliationService;
        this.managementService = managementService;
    }

    // 1. Create a reconciliation
    @PostMapping
    public ResponseEntity<ReconciliationResponse> createReconciliation(
            @Valid @RequestBody ReconciliationCreateRequest request
    ) {
        ReconciliationResponse response =
                managementService.createReconciliation(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // 2. Retrieve all reconciliations
    @GetMapping
    public ResponseEntity<List<ReconciliationResponse>>
    getAllReconciliations() {

        return ResponseEntity.ok(
                managementService.getAllReconciliations()
        );
    }

    // 3. Retrieve a reconciliation by ID
    @GetMapping("/{id}")
    public ResponseEntity<ReconciliationResponse> getReconciliationById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                managementService.getReconciliationById(id)
        );
    }

    // 4. Run reconciliation
    @PostMapping("/{id}/run")
    public ResponseEntity<ReconciliationEngineResult> runReconciliation(
            @PathVariable Long id
    ) {
        try {
            ReconciliationEngineResult result =
                    reconciliationService.reconcile(id);

            return ResponseEntity.ok(result);

        } catch (EntityNotFoundException exception) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    exception.getMessage(),
                    exception
            );
        }
    }

// 5. Retrieve reconciliation results
    @GetMapping("/{id}/results")
    public ResponseEntity<List<ReconciliationResultResponse>>
    getReconciliationResults(@PathVariable Long id) {

        return ResponseEntity.ok(
                reconciliationService.getResultsByReconciliation(id)
        );
    }

    // 6. Retrieve reconciliation errors, optionally by status
    @GetMapping("/{id}/errors")
    public ResponseEntity<List<ReconciliationErrorResponse>>
    getReconciliationErrors(
            @PathVariable Long id,
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                reconciliationService.getErrorsByReconciliation(id, status)
        );
    }

    // 7. Check if reconciliation name already exists (case-insensitive)
    @GetMapping("/check-name")
    public ResponseEntity<Boolean> checkNameExists(@RequestParam String name) {
        return ResponseEntity.ok(managementService.existsByName(name));
    }

    // 8. Delete reconciliation by ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReconciliation(@PathVariable Long id) {
        managementService.deleteReconciliation(id);
        return ResponseEntity.noContent().build();
    }
}