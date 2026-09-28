package com.company.reconciliation.reconciliation.error.repository;

import com.company.reconciliation.reconciliation.error.ReconciliationError;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReconciliationErrorRepository
        extends JpaRepository<ReconciliationError, Long> {

    List<ReconciliationError> findByReconciliationResultId(Long reconciliationResultId);

    List<ReconciliationError> findByStatus(String status);
}