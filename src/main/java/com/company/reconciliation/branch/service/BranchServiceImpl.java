package com.company.reconciliation.branch.service;

import com.company.reconciliation.branch.dto.BranchResponse;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.branch.repository.BranchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class BranchServiceImpl implements BranchService {

    private final BranchRepository branchRepository;

    public BranchServiceImpl(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    @Override
    public List<BranchResponse> getActiveBranches() {

        List<Branch> branches =
                branchRepository.findByActiveTrueOrderByIdAsc();

        return branches.stream()
                .map(branch -> new BranchResponse(
                        branch.getId(),
                        branch.getCode(),
                        branch.getName()
                ))
                .toList();
    }

    @Override
    public Branch getOrCreateBranch(String branchName) {
        if (branchName == null || branchName.trim().isEmpty()) {
            throw new IllegalArgumentException("Branch name cannot be empty");
        }

        String cleanName = branchName.trim();

        // 1. Match existing branch by name (case-insensitive)
        Optional<Branch> existing = branchRepository.findByNameIgnoreCase(cleanName);
        if (existing.isPresent()) {
            Branch b = existing.get();
            if (!Boolean.TRUE.equals(b.getActive())) {
                throw new IllegalArgumentException("Branch '" + cleanName + "' is inactive in the database.");
            }
            return b;
        }

        // 2. Match existing branch by code (case-insensitive)
        existing = branchRepository.findByCodeIgnoreCase(cleanName);
        if (existing.isPresent()) {
            Branch b = existing.get();
            if (!Boolean.TRUE.equals(b.getActive())) {
                throw new IllegalArgumentException("Branch '" + cleanName + "' is inactive in the database.");
            }
            return b;
        }

        // Reject unknown branch - do not auto-create
        throw new IllegalArgumentException("Branch '" + cleanName + "' does not exist in the database. Only registered branches are allowed.");
    }

    @Override
    public List<BranchResponse> ensureBranches(List<String> branchNames) {
        if (branchNames != null && !branchNames.isEmpty()) {
            List<String> invalidBranches = new java.util.ArrayList<>();
            for (String name : branchNames) {
                if (name != null && !name.trim().isEmpty()) {
                    String clean = name.trim();
                    Optional<Branch> byName = branchRepository.findByNameIgnoreCase(clean);
                    Optional<Branch> byCode = branchRepository.findByCodeIgnoreCase(clean);
                    Branch b = byName.orElse(byCode.orElse(null));
                    if (b == null || !Boolean.TRUE.equals(b.getActive())) {
                        invalidBranches.add(clean);
                    }
                }
            }
            if (!invalidBranches.isEmpty()) {
                throw new IllegalArgumentException(
                        "The following branches do not exist in the database: "
                        + String.join(", ", invalidBranches)
                        + ". Only registered branches are allowed."
                );
            }
        }
        return getActiveBranches();
    }
}