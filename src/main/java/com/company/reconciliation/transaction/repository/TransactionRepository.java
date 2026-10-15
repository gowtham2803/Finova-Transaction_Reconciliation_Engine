package com.company.reconciliation.transaction.repository;

import com.company.reconciliation.transaction.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByReconciliationId(Long reconciliationId);

    List<Transaction> findByReconciliationIdAndSourceSheet(
            Long reconciliationId,
            String sourceSheet
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Transaction t WHERE t.reconciliation.id = :reconciliationId")
    void deleteByReconciliationId(@org.springframework.data.repository.query.Param("reconciliationId") Long reconciliationId);
}