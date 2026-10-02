
package com.company.reconciliation.audit.service;

import com.company.reconciliation.audit.entity.AuditLog;
import com.company.reconciliation.audit.repository.AuditLogRepository;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import com.company.reconciliation.user.entity.User;
import com.company.reconciliation.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ReconciliationRepository reconciliationRepository;
    private final TransactionRepository transactionRepository;

    public AuditService(
            AuditLogRepository auditLogRepository,
            UserRepository userRepository,
            ReconciliationRepository reconciliationRepository,
            TransactionRepository transactionRepository
    ) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.transactionRepository = transactionRepository;
    }

    public AuditLog recordAction(
            Long userId,
            Long reconciliationId,
            Long transactionId,
            String action,
            String fieldName,
            String oldValue,
            String newValue,
            String reason,
            String requestId
    ) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("A valid user ID is required");
        }

        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("Audit action is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "User not found with ID: " + userId
                ));

        Reconciliation reconciliation = null;
        if (reconciliationId != null) {
            reconciliation = reconciliationRepository.findById(reconciliationId)
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Reconciliation not found with ID: " + reconciliationId
                    ));
        }

        Transaction transaction = null;
        if (transactionId != null) {
            transaction = transactionRepository.findById(transactionId)
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Transaction not found with ID: " + transactionId
                    ));
        }

        AuditLog auditLog = new AuditLog();
        auditLog.setUser(user);
        auditLog.setReconciliation(reconciliation);
        auditLog.setTransaction(transaction);
        auditLog.setAction(action.trim());
        auditLog.setFieldName(fieldName);
        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);
        auditLog.setReason(reason);
        auditLog.setRequestId(requestId);
        auditLog.setCreatedAt(LocalDateTime.now());

        return auditLogRepository.save(auditLog);
    }
}