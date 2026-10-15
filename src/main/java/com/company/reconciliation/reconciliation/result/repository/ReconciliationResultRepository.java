package com.company.reconciliation.reconciliation.result.repository;

import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReconciliationResultRepository
        extends JpaRepository<ReconciliationResult, Long> {

    List<ReconciliationResult> findByReconciliationId(Long reconciliationId);

    @Query("SELECT r FROM ReconciliationResult r WHERE r.mInTransaction.id IN :ids OR r.mOutTransaction.id IN :ids")
    List<ReconciliationResult> findByTransactionIds(@Param("ids") List<Long> ids);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ReconciliationResult r WHERE r.reconciliation.id = :reconciliationId")
    void deleteByReconciliationId(@Param("reconciliationId") Long reconciliationId);
}