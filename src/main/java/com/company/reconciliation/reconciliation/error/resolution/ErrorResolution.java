package com.company.reconciliation.reconciliation.error.resolution;

import com.company.reconciliation.reconciliation.error.ReconciliationError;
import com.company.reconciliation.user.entity.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "error_resolutions")
public class ErrorResolution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "error_id", nullable = false)
    private ReconciliationError error;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resolved_by", nullable = false)
    private User resolvedBy;

    @Column(name = "resolution_type", nullable = false, length = 50)
    private String resolutionType;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Getters and Setters
}