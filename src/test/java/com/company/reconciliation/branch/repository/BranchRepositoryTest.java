package com.company.reconciliation.branch.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BranchRepositoryTest {

    @Autowired
    private BranchRepository branchRepository;

    @Test
    void shouldFindInitialBranches() {

        long count = branchRepository.count();

        assertTrue(count >= 34, "Initial branches count should be at least 34");
        assertTrue(branchRepository.findByCode("PY").isPresent(), "Branch PY should exist");
        assertTrue(branchRepository.findByCode("CBE").isPresent(), "Branch CBE should exist");
        assertTrue(branchRepository.findByCode("PKT").isPresent(), "Branch PKT should exist");
    }
}