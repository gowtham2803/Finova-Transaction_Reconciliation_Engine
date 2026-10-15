package com.company.reconciliation.reconciliation.repository;

import com.company.reconciliation.reconciliation.entity.Reconciliation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReconciliationRepository extends JpaRepository<Reconciliation, Long> {

    Optional<Reconciliation> findByReconciliationCode(String reconciliationCode);

    boolean existsByReconciliationNameIgnoreCase(String reconciliationName);

    Optional<Reconciliation> findByReconciliationNameIgnoreCase(String reconciliationName);
}