package com.company.reconciliation.branch.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BranchRepositoryTest {

    @Autowired
    private BranchRepository branchRepository;

    @Test
    void shouldFindInitialBranches() {

        long count = branchRepository.count();

        assertEquals(5, count);
    }
}