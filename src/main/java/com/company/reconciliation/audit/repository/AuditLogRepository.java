package com.company.reconciliation.audit.repository;

import com.company.reconciliation.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByUserId(Long userId);

    List<AuditLog> findByReconciliationId(Long reconciliationId);

    List<AuditLog> findByTransactionId(Long transactionId);
}