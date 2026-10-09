package com.company.reconciliation.branch.service;

import com.company.reconciliation.branch.dto.BranchResponse;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.branch.repository.BranchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
                branchRepository.findByActiveTrueOrderByNameAsc();

        return branches.stream()
                .map(branch -> new BranchResponse(
                        branch.getId(),
                        branch.getCode(),
                        branch.getName()
                ))
                .toList();
    }
}