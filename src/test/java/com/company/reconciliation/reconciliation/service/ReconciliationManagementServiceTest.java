package com.company.reconciliation.reconciliation.service;

import com.company.reconciliation.reconciliation.dto.request.ReconciliationCreateRequest;
import com.company.reconciliation.reconciliation.dto.response.ReconciliationResponse;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.user.entity.User;
import com.company.reconciliation.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationManagementServiceTest {

    @Mock
    private ReconciliationRepository reconciliationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ReconciliationManagementService managementService;

    @Test
    void createReconciliation_shouldSaveAndReturnResponse() {

        User user = new User();
        user.setId(1L);

        ReconciliationCreateRequest request =
                new ReconciliationCreateRequest();
        request.setCreatedByUserId(1L);

        when(userRepository.findById(1L))
                .thenReturn(Optional.of(user));

        when(reconciliationRepository.save(
                any(Reconciliation.class)
        )).thenAnswer(invocation -> {
            Reconciliation reconciliation = invocation.getArgument(0);
            reconciliation.setId(10L);
            return reconciliation;
        });

        ReconciliationResponse response =
                managementService.createReconciliation(request);

        ArgumentCaptor<Reconciliation> captor =
                ArgumentCaptor.forClass(Reconciliation.class);

        verify(reconciliationRepository).save(captor.capture());

        Reconciliation saved = captor.getValue();

        assertEquals(10L, response.getId());
        assertEquals(1L, response.getCreatedByUserId());
        assertEquals("PENDING", response.getStatus());

        assertNotNull(response.getReconciliationCode());
        assertTrue(response.getReconciliationCode().startsWith("REC-"));

        assertSame(user, saved.getCreatedBy());
        assertEquals("PENDING", saved.getStatus());
        assertEquals(1, saved.getVersion());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
        assertNull(saved.getStartedAt());
        assertNull(saved.getCompletedAt());
    }

    @Test
    void createReconciliation_shouldThrowWhenUserDoesNotExist() {

        ReconciliationCreateRequest request =
                new ReconciliationCreateRequest();
        request.setCreatedByUserId(999L);

        when(userRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThrows(
                EntityNotFoundException.class,
                () -> managementService.createReconciliation(request)
        );

        verify(reconciliationRepository, never())
                .save(any(Reconciliation.class));
    }

    @Test
    void getReconciliationById_shouldReturnResponse() {

        User user = new User();
        user.setId(1L);

        Reconciliation reconciliation = new Reconciliation();
        reconciliation.setId(10L);
        reconciliation.setReconciliationCode("REC-TEST123");
        reconciliation.setCreatedBy(user);
        reconciliation.setStatus("PENDING");
        reconciliation.setVersion(1);

        when(reconciliationRepository.findById(10L))
                .thenReturn(Optional.of(reconciliation));

        ReconciliationResponse response =
                managementService.getReconciliationById(10L);

        assertEquals(10L, response.getId());
        assertEquals("REC-TEST123", response.getReconciliationCode());
        assertEquals(1L, response.getCreatedByUserId());
        assertEquals("PENDING", response.getStatus());
    }

    @Test
    void getReconciliationById_shouldThrowWhenNotFound() {

        when(reconciliationRepository.findById(999L))
                .thenReturn(Optional.empty());

        assertThrows(
                EntityNotFoundException.class,
                () -> managementService.getReconciliationById(999L)
        );
    }

    @Test
    void getReconciliationById_shouldRejectInvalidId() {

        assertThrows(
                IllegalArgumentException.class,
                () -> managementService.getReconciliationById(0L)
        );

        verify(reconciliationRepository, never()).findById(any());
    }

    @Test
    void getAllReconciliations_shouldReturnResponses() {

        User user = new User();
        user.setId(1L);

        Reconciliation first = new Reconciliation();
        first.setId(1L);
        first.setReconciliationCode("REC-FIRST");
        first.setCreatedBy(user);
        first.setStatus("PENDING");
        first.setVersion(1);

        Reconciliation second = new Reconciliation();
        second.setId(2L);
        second.setReconciliationCode("REC-SECOND");
        second.setCreatedBy(user);
        second.setStatus("RECONCILED");
        second.setVersion(1);

        when(reconciliationRepository.findAll())
                .thenReturn(List.of(first, second));

        List<ReconciliationResponse> responses =
                managementService.getAllReconciliations();

        assertEquals(2, responses.size());
        assertEquals(1L, responses.get(0).getId());
        assertEquals(2L, responses.get(1).getId());
        assertEquals("PENDING", responses.get(0).getStatus());
        assertEquals("RECONCILED", responses.get(1).getStatus());
    }

    @Test
    void getAllReconciliations_shouldReturnEmptyList() {

        when(reconciliationRepository.findAll())
                .thenReturn(List.of());

        List<ReconciliationResponse> responses =
                managementService.getAllReconciliations();

        assertNotNull(responses);
        assertTrue(responses.isEmpty());
    }
}