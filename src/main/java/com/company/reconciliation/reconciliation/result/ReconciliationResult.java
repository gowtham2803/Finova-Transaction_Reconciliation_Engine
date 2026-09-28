package com.company.reconciliation.reconciliation.result;

import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.transaction.entity.Transaction;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_results")
public class ReconciliationResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciliation_id", nullable = false)
    private Reconciliation reconciliation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "m_in_transaction_id")
    private Transaction mInTransaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "m_out_transaction_id")
    private Transaction mOutTransaction;

    @Column(name = "match_status", nullable = false, length = 30)
    private String matchStatus;

    @Column(name = "error_type", length = 50)
    private String errorType;

    @Column(name = "error_reason", length = 500)
    private String errorReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Getters and Setters
}