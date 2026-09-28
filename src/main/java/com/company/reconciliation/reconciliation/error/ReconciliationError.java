package com.company.reconciliation.reconciliation.error;

import com.company.reconciliation.reconciliation.result.ReconciliationResult;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_errors")
public class ReconciliationError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciliation_result_id", nullable = false)
    private ReconciliationResult reconciliationResult;

    @Column(name = "error_type", nullable = false, length = 50)
    private String errorType;

    @Column(name = "error_code", nullable = false, length = 50)
    private String errorCode;

    @Column(name = "description", nullable = false, length = 1000)
    private String description;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "OPEN";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Getters and Setters
}