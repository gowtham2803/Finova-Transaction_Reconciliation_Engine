package com.company.reconciliation.branch.repository;

import com.company.reconciliation.branch.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long> {

    Optional<Branch> findByCode(String code);

    Optional<Branch> findByName(String name);

    List<Branch> findByActiveTrueOrderByNameAsc();
}