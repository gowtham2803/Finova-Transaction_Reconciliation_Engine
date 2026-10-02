
package com.company.reconciliation.audit.repository;

import com.company.reconciliation.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository
        extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByUserId(Long userId);

    List<AuditLog> findByReconciliationId(Long reconciliationId);

    List<AuditLog> findByTransactionId(Long transactionId);

    @Query("""
            SELECT a
            FROM AuditLog a
            WHERE (:userId IS NULL OR a.user.id = :userId)
              AND (:reconciliationId IS NULL
                   OR a.reconciliation.id = :reconciliationId)
              AND (:transactionId IS NULL
                   OR a.transaction.id = :transactionId)
              AND (:action IS NULL OR a.action = :action)
              AND (:startDate IS NULL
                   OR a.createdAt >= :startDate)
              AND (:endDate IS NULL
                   OR a.createdAt <= :endDate)
            """)
    Page<AuditLog> searchAuditLogs(
            @Param("userId") Long userId,
            @Param("reconciliationId") Long reconciliationId,
            @Param("transactionId") Long transactionId,
            @Param("action") String action,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );
}