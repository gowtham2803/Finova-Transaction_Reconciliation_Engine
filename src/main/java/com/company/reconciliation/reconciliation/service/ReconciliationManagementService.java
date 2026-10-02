package com.company.reconciliation.reconciliation.service;

import com.company.reconciliation.reconciliation.dto.request.ReconciliationCreateRequest;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResponse;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.user.entity.User;
import com.company.reconciliation.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.company.reconciliation.audit.service.AuditService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ReconciliationManagementService {

    private final ReconciliationRepository reconciliationRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ReconciliationManagementService(
            ReconciliationRepository reconciliationRepository,
            UserRepository userRepository,
            AuditService auditService
    ) {
        this.reconciliationRepository = reconciliationRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    // 1. Create a reconciliation
    public ReconciliationResponse createReconciliation(
            ReconciliationCreateRequest request
    ) {
        if (request == null || request.getCreatedByUserId() == null) {
            throw new IllegalArgumentException(
                    "A valid creator user ID is required"
            );
        }

        Long userId = request.getCreatedByUserId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "User not found with ID: " + userId
                ));

        LocalDateTime now = LocalDateTime.now();

        Reconciliation reconciliation = new Reconciliation();

        reconciliation.setReconciliationCode(generateReconciliationCode());
        reconciliation.setCreatedBy(user);
        reconciliation.setStatus("PENDING");
        reconciliation.setVersion(1);
        reconciliation.setStartedAt(null);
        reconciliation.setCompletedAt(null);
        reconciliation.setCreatedAt(now);
        reconciliation.setUpdatedAt(now);

        Reconciliation saved =
                reconciliationRepository.save(reconciliation);

        // Record reconciliation creation in the audit log
        auditService.recordAction(
                userId,
                saved.getId(),
                null,
                "RECONCILIATION_CREATED",
                "status",
                null,
                saved.getStatus(),
                "Reconciliation created",
                null
        );

        return mapToResponse(saved);
    }

    // 2. Retrieve a reconciliation by ID
    @Transactional(readOnly = true)
    public ReconciliationResponse getReconciliationById(Long id) {
        validateId(id);

        Reconciliation reconciliation = reconciliationRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reconciliation not found with ID: " + id
                ));

        return mapToResponse(reconciliation);
    }

    // 3. Retrieve all reconciliations
    @Transactional(readOnly = true)
    public List<ReconciliationResponse> getAllReconciliations() {
        return reconciliationRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // 4. Generate a unique reconciliation code
    private String generateReconciliationCode() {
        return "REC-" + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 20)
                .toUpperCase();
    }

    // 5. Validate reconciliation ID
    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(
                    "Reconciliation ID must be positive"
            );
        }
    }

    // 6. Convert entity to response DTO
    private ReconciliationResponse mapToResponse(
            Reconciliation reconciliation
    ) {
        ReconciliationResponse response =
                new ReconciliationResponse();

        response.setId(reconciliation.getId());
        response.setReconciliationCode(
                reconciliation.getReconciliationCode()
        );

        response.setCreatedByUserId(
                reconciliation.getCreatedBy() != null
                        ? reconciliation.getCreatedBy().getId()
                        : null
        );

        response.setStatus(reconciliation.getStatus());
        response.setVersion(reconciliation.getVersion());
        response.setStartedAt(reconciliation.getStartedAt());
        response.setCompletedAt(reconciliation.getCompletedAt());
        response.setCreatedAt(reconciliation.getCreatedAt());
        response.setUpdatedAt(reconciliation.getUpdatedAt());

        return response;
    }
}