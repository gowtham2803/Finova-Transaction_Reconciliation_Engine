package com.company.reconciliation.branch.service;

import com.company.reconciliation.branch.dto.BranchResponse;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.branch.repository.BranchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BranchServiceTest {

    @Mock
    private BranchRepository branchRepository;

    @InjectMocks
    private BranchServiceImpl branchService;

    private Branch pyBranch;
    private Branch cbeBranch;

    @BeforeEach
    void setUp() {
        pyBranch = new Branch();
        pyBranch.setId(1L);
        pyBranch.setCode("PY");
        pyBranch.setName("PONDICHERRY");
        pyBranch.setActive(true);

        cbeBranch = new Branch();
        cbeBranch.setId(11L);
        cbeBranch.setCode("CBE");
        cbeBranch.setName("COIMBATORE");
        cbeBranch.setActive(true);
    }

    @Test
    void getActiveBranches_shouldReturnAllActiveBranches() {
        when(branchRepository.findByActiveTrueOrderByIdAsc())
                .thenReturn(List.of(pyBranch, cbeBranch));

        List<BranchResponse> responses = branchService.getActiveBranches();

        assertEquals(2, responses.size());
        assertEquals("PY", responses.get(0).getCode());
        assertEquals("PONDICHERRY", responses.get(0).getName());
        assertEquals("CBE", responses.get(1).getCode());
    }

    @Test
    void getOrCreateBranch_withExistingName_shouldReturnBranch() {
        when(branchRepository.findByNameIgnoreCase("PONDICHERRY"))
                .thenReturn(Optional.of(pyBranch));

        Branch result = branchService.getOrCreateBranch("PONDICHERRY");

        assertNotNull(result);
        assertEquals("PY", result.getCode());
        verify(branchRepository, never()).save(any());
    }

    @Test
    void getOrCreateBranch_withExistingCode_shouldReturnBranch() {
        when(branchRepository.findByNameIgnoreCase("PY"))
                .thenReturn(Optional.empty());
        when(branchRepository.findByCodeIgnoreCase("PY"))
                .thenReturn(Optional.of(pyBranch));

        Branch result = branchService.getOrCreateBranch("PY");

        assertNotNull(result);
        assertEquals("PONDICHERRY", result.getName());
        verify(branchRepository, never()).save(any());
    }

    @Test
    void getOrCreateBranch_withUnknownBranch_shouldThrowExceptionAndNotSave() {
        when(branchRepository.findByNameIgnoreCase("UNKNOWN_BRANCH"))
                .thenReturn(Optional.empty());
        when(branchRepository.findByCodeIgnoreCase("UNKNOWN_BRANCH"))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> branchService.getOrCreateBranch("UNKNOWN_BRANCH")
        );

        assertTrue(ex.getMessage().contains("does not exist in the database"));
        assertTrue(ex.getMessage().contains("Only registered branches are allowed"));
        verify(branchRepository, never()).save(any());
    }

    @Test
    void ensureBranches_withValidBranches_shouldReturnActiveBranches() {
        when(branchRepository.findByNameIgnoreCase("PY"))
                .thenReturn(Optional.empty());
        when(branchRepository.findByCodeIgnoreCase("PY"))
                .thenReturn(Optional.of(pyBranch));

        when(branchRepository.findByActiveTrueOrderByIdAsc())
                .thenReturn(List.of(pyBranch, cbeBranch));

        List<BranchResponse> responses = branchService.ensureBranches(List.of("PY"));

        assertEquals(2, responses.size());
        verify(branchRepository, never()).save(any());
    }

    @Test
    void ensureBranches_withUnknownBranches_shouldThrowExceptionListingInvalidBranches() {
        when(branchRepository.findByNameIgnoreCase("INVALID_BRANCH"))
                .thenReturn(Optional.empty());
        when(branchRepository.findByCodeIgnoreCase("INVALID_BRANCH"))
                .thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> branchService.ensureBranches(List.of("INVALID_BRANCH"))
        );

        assertTrue(ex.getMessage().contains("INVALID_BRANCH"));
        assertTrue(ex.getMessage().contains("do not exist in the database"));
        verify(branchRepository, never()).save(any());
    }
}
