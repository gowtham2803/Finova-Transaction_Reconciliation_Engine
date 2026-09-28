package com.company.reconciliation.reconciliation.result.repository;

import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReconciliationResultRepository
        extends JpaRepository<ReconciliationResult, Long> {

    List<ReconciliationResult> findByReconciliationId(Long reconciliationId);
}