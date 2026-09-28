package com.company.reconciliation.transaction.entity;

import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciliation_id", nullable = false)
    private Reconciliation reconciliation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(name = "source_sheet", nullable = false, length = 10)
    private String sourceSheet;

    @Column(name = "source_row")
    private Integer sourceRow;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_branch_id", nullable = false)
    private Branch fromBranch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_branch_id", nullable = false)
    private Branch toBranch;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "commission", nullable = false, precision = 19, scale = 4)
    private BigDecimal commission = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Getters and Setters
}
