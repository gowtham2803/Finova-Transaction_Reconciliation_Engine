package com.company.reconciliation.reconciliation.service;

import com.company.reconciliation.audit.repository.AuditLogRepository;
import com.company.reconciliation.audit.service.AuditService;
import com.company.reconciliation.reconciliation.dto.request.ReconciliationCreateRequest;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResponse;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.error.repository.ReconciliationErrorRepository;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.reconciliation.result.repository.ReconciliationResultRepository;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import com.company.reconciliation.user.entity.User;
import com.company.reconciliation.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ReconciliationManagementService {

    private final ReconciliationRepository reconciliationRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;
    private final ReconciliationResultRepository reconciliationResultRepository;
    private final ReconciliationErrorRepository reconciliationErrorRepository;
    private final TransactionRepository transactionRepository;

    public ReconciliationManagementService(
            ReconciliationRepository reconciliationRepository,
            UserRepository userRepository,
            AuditService auditService,
            AuditLogRepository auditLogRepository,
            ReconciliationResultRepository reconciliationResultRepository,
            ReconciliationErrorRepository reconciliationErrorRepository,
            TransactionRepository transactionRepository
    ) {
        this.reconciliationRepository = reconciliationRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
        this.reconciliationResultRepository = reconciliationResultRepository;
        this.reconciliationErrorRepository = reconciliationErrorRepository;
        this.transactionRepository = transactionRepository;
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

        String rawName = request.getReconciliationName();
        if (rawName == null || rawName.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Reconciliation name is required"
            );
        }

        String trimmedName = rawName.trim();
        if (reconciliationRepository.existsByReconciliationNameIgnoreCase(trimmedName)) {
            throw new IllegalArgumentException(
                    "A reconciliation with this name already exists. Please choose a different name."
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
        reconciliation.setReconciliationName(trimmedName);
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
        response.setReconciliationName(
                reconciliation.getReconciliationName()
        );

        response.setCreatedByUserId(
                reconciliation.getCreatedBy() != null
                        ? reconciliation.getCreatedBy().getId()
                        : null
        );

        response.setCreatedByUsername(
                reconciliation.getCreatedBy() != null
                        ? reconciliation.getCreatedBy().getUsername()
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

    // 7. Check if reconciliation name exists
    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return false;
        }
        return reconciliationRepository.existsByReconciliationNameIgnoreCase(name.trim());
    }

    // 8. Delete reconciliation and its child records
    public void deleteReconciliation(Long id) {
        validateId(id);
        Reconciliation reconciliation = reconciliationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reconciliation not found with ID: " + id
                ));

        reconciliationErrorRepository.deleteByReconciliationId(id);
        reconciliationResultRepository.deleteByReconciliationId(id);
        auditLogRepository.deleteByReconciliationId(id);
        transactionRepository.deleteByReconciliationId(id);
        reconciliationRepository.delete(reconciliation);
    }
}