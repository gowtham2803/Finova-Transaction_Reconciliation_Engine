package com.company.reconciliation.reconciliation.error.resolution.repository;

import com.company.reconciliation.reconciliation.error.resolution.ErrorResolution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ErrorResolutionRepository
        extends JpaRepository<ErrorResolution, Long> {

    List<ErrorResolution> findByErrorId(Long errorId);

    List<ErrorResolution> findByResolvedById(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ErrorResolution er WHERE er.error.reconciliationResult.reconciliation.id = :reconciliationId")
    void deleteByReconciliationId(@org.springframework.data.repository.query.Param("reconciliationId") Long reconciliationId);
}