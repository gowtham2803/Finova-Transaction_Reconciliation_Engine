package com.company.reconciliation.reconciliation.error.repository;

import com.company.reconciliation.reconciliation.error.ReconciliationError;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReconciliationErrorRepository
        extends JpaRepository<ReconciliationError, Long> {

    List<ReconciliationError> findByReconciliationResultId(Long reconciliationResultId);

    List<ReconciliationError> findByStatus(String status);

    List<ReconciliationError>
    findByReconciliationResultReconciliationId(Long reconciliationId);

    List<ReconciliationError>
    findByReconciliationResultReconciliationIdAndStatus(
            Long reconciliationId,
            String status
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ReconciliationError e WHERE e.reconciliationResult.reconciliation.id = :reconciliationId")
    void deleteByReconciliationId(@org.springframework.data.repository.query.Param("reconciliationId") Long reconciliationId);
}