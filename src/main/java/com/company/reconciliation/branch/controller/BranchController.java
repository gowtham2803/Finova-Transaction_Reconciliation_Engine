package com.company.reconciliation.branch.controller;

import com.company.reconciliation.branch.dto.BranchResponse;
import com.company.reconciliation.branch.service.BranchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchService branchService;

    public BranchController(BranchService branchService) {
        this.branchService = branchService;
    }

    // Retrieve all active branches
    @GetMapping
    public ResponseEntity<List<BranchResponse>> getActiveBranches() {

        List<BranchResponse> branches =
                branchService.getActiveBranches();

        return ResponseEntity.ok(branches);
    }
}