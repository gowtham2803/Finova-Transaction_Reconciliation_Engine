package com.company.reconciliation.branch.service;

import com.company.reconciliation.branch.dto.BranchResponse;
import com.company.reconciliation.branch.entity.Branch;

import java.util.List;

public interface BranchService {

    List<BranchResponse> getActiveBranches();

    Branch getOrCreateBranch(String branchName);

    List<BranchResponse> ensureBranches(List<String> branchNames);
}