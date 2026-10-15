
package com.company.reconciliation.transaction.service;

import com.company.reconciliation.audit.repository.AuditLogRepository;
import com.company.reconciliation.audit.service.AuditService;
import com.company.reconciliation.branch.entity.Branch;
import com.company.reconciliation.branch.repository.BranchRepository;
import com.company.reconciliation.reconciliation.entity.Reconciliation;
import com.company.reconciliation.reconciliation.error.repository.ReconciliationErrorRepository;
import com.company.reconciliation.reconciliation.error.resolution.repository.ErrorResolutionRepository;
import com.company.reconciliation.reconciliation.repository.ReconciliationRepository;
import com.company.reconciliation.reconciliation.result.repository.ReconciliationResultRepository;
import com.company.reconciliation.transaction.dto.TransactionCreateRequest;
import com.company.reconciliation.transaction.dto.TransactionResponse;
import com.company.reconciliation.transaction.entity.Transaction;
import com.company.reconciliation.transaction.repository.TransactionRepository;
import com.company.reconciliation.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private ReconciliationRepository reconciliationRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private ReconciliationResultRepository reconciliationResultRepository;

    @Mock
    private ReconciliationErrorRepository reconciliationErrorRepository;

    @Mock
    private ErrorResolutionRepository errorResolutionRepository;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    private Reconciliation reconciliation;
    private Branch fromBranch;
    private Branch toBranch;
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);

        reconciliation = new Reconciliation();
        reconciliation.setId(10L);
        reconciliation.setCreatedBy(user);

        fromBranch = new Branch();
        fromBranch.setCode("CHN");
        fromBranch.setName("Chennai");

        toBranch = new Branch();
        toBranch.setCode("MDU");
        toBranch.setName("Madurai");
    }

    @Test
    void createTransactionSuccessfully() {
        when(reconciliationRepository.findById(10L))
                .thenReturn(Optional.of(reconciliation));

        when(branchRepository.findById(1L))
                .thenReturn(Optional.of(fromBranch));

        when(branchRepository.findById(2L))
                .thenReturn(Optional.of(toBranch));

        when(transactionRepository.save(any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TransactionCreateRequest request = createRequest();

        TransactionResponse response =
                transactionService.createTransaction(request);

        assertNotNull(response);
        assertEquals("M_IN", response.getSourceSheet());
        assertEquals("Chennai", response.getFromBranchName());
        assertEquals("Madurai", response.getToBranchName());
        assertEquals(new BigDecimal("1250.5000"), response.getAmount());
        assertEquals(new BigDecimal("10.0000"), response.getCommission());
        assertEquals("PENDING", response.getStatus());

        verify(transactionRepository, times(1))
                .save(any(Transaction.class));

        verify(auditService, times(1))
                .recordAction(
                        eq(user.getId()),
                        eq(reconciliation.getId()),
                        any(),
                        eq("TRANSACTION_CREATED"),
                        eq("transaction"),
                        isNull(),
                        anyString(),
                        eq("Transaction created"),
                        isNull()
                );
    }

    @Test
    void createTransactionWhenReconciliationDoesNotExist() {
        when(reconciliationRepository.findById(99L))
                .thenReturn(Optional.empty());

        TransactionCreateRequest request = createRequest();
        request.setReconciliationId(99L);

        assertThrows(
                IllegalArgumentException.class,
                () -> transactionService.createTransaction(request)
        );

        verify(transactionRepository, never())
                .save(any(Transaction.class));

        verifyNoInteractions(auditService);
    }

    @Test
    void createBulkTransactionsSuccessfully() {
        when(reconciliationRepository.findById(10L))
                .thenReturn(Optional.of(reconciliation));

        when(branchRepository.findById(1L))
                .thenReturn(Optional.of(fromBranch));

        when(branchRepository.findById(2L))
                .thenReturn(Optional.of(toBranch));

        when(transactionRepository.save(any(Transaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TransactionCreateRequest firstRequest = createRequest();
        TransactionCreateRequest secondRequest = createRequest();

        // Identical transaction details are allowed.
        List<TransactionCreateRequest> requests =
                List.of(firstRequest, secondRequest);

        List<TransactionResponse> responses =
                transactionService.createBulkTransactions(requests);

        assertEquals(2, responses.size());
        assertEquals("Chennai", responses.get(0).getFromBranchName());
        assertEquals("Chennai", responses.get(1).getFromBranchName());

        verify(transactionRepository, times(2))
                .save(any(Transaction.class));

        verify(auditService, times(2))
                .recordAction(
                        eq(user.getId()),
                        eq(reconciliation.getId()),
                        any(),
                        eq("TRANSACTION_CREATED"),
                        eq("transaction"),
                        isNull(),
                        anyString(),
                        eq("Transaction created"),
                        isNull()
                );
    }

    @Test
    void createBulkTransactionsWithEmptyList() {
        assertThrows(
                IllegalArgumentException.class,
                () -> transactionService.createBulkTransactions(List.of())
        );

        verify(transactionRepository, never())
                .save(any(Transaction.class));

        verifyNoInteractions(auditService);
    }

    @Test
    void deleteTransaction_withValidId_shouldDetachAuditAndCascadeDelete() {
        when(reconciliationResultRepository.findByTransactionIds(List.of(1L)))
                .thenReturn(List.of());

        transactionService.deleteTransaction(1L);

        verify(auditLogRepository).detachTransactions(List.of(1L));
        verify(transactionRepository).deleteAllById(List.of(1L));
    }

    @Test
    void deleteTransaction_withInvalidId_shouldThrowException() {
        assertThrows(IllegalArgumentException.class, () -> transactionService.deleteTransaction(null));
        assertThrows(IllegalArgumentException.class, () -> transactionService.deleteTransaction(-1L));
    }

    @Test
    void deleteTransactions_withEmptyList_shouldDoNothing() {
        transactionService.deleteTransactions(null);
        transactionService.deleteTransactions(List.of());

        verifyNoInteractions(auditLogRepository);
        verifyNoInteractions(transactionRepository);
    }

    private TransactionCreateRequest createRequest() {
        TransactionCreateRequest request = new TransactionCreateRequest();

        request.setReconciliationId(10L);
        request.setSourceSheet("M_IN");
        request.setSourceRow(1);
        request.setFromBranchId(1L);
        request.setToBranchId(2L);
        request.setAmount(new BigDecimal("1250.5000"));
        request.setCommission(new BigDecimal("10.0000"));

        return request;
    }
}