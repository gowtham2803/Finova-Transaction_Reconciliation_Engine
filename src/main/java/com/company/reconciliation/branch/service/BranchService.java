package com.company.reconciliation.branch.service;

import com.company.reconciliation.branch.dto.BranchResponse;

import java.util.List;

public interface BranchService {

    List<BranchResponse> getActiveBranches();
}