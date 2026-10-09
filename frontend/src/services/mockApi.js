import { mockBranches } from "../mock/mockBranches";
import { initialMockReconciliations } from "../mock/mockReconciliations";
import { initialMockTransactions } from "../mock/mockTransactions";
import { initialMockResults } from "../mock/mockResults";
import { initialMockErrors } from "../mock/mockErrors";
import { initialMockAuditLogs } from "../mock/mockAuditLogs";

const STORAGE_KEYS = {
    RECONCILIATIONS: "yescapital_reconciliations_v1",
    TRANSACTIONS: "yescapital_transactions_v1",
    RESULTS: "yescapital_results_v1",
    ERRORS: "yescapital_errors_v1",
    AUDIT_LOGS: "yescapital_audit_logs_v1"
};

function loadStorage(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        if (item) {
            return JSON.parse(item);
        }
    } catch {
        // Fallback if local storage not available
    }
    return fallback;
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage errors in restricted contexts
    }
}

// In-memory persistent state initialized from localStorage or defaults
let reconciliationsState = loadStorage(STORAGE_KEYS.RECONCILIATIONS, initialMockReconciliations);
let transactionsState = loadStorage(STORAGE_KEYS.TRANSACTIONS, initialMockTransactions);
let resultsState = loadStorage(STORAGE_KEYS.RESULTS, initialMockResults);
let errorsState = loadStorage(STORAGE_KEYS.ERRORS, initialMockErrors);
let auditLogsState = loadStorage(STORAGE_KEYS.AUDIT_LOGS, initialMockAuditLogs);

// Delay helper to simulate network latency realistically (50-200ms)
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getBranches() {
    await delay(50);
    return [...mockBranches];
}

export async function getReconciliations() {
    await delay(100);
    return [...reconciliationsState];
}

export async function getReconciliation(reconciliationId) {
    await delay(80);
    const id = Number(reconciliationId);
    const rec = reconciliationsState.find((item) => Number(item.id) === id);
    if (!rec) {
        throw new Error(`Reconciliation #${reconciliationId} not found.`);
    }
    return { ...rec };
}

export async function createReconciliation(payload) {
    await delay(150);
    const newId = reconciliationsState.length > 0 
        ? Math.max(...reconciliationsState.map((r) => Number(r.id) || 0)) + 1 
        : 1;

    const dateStr = payload.reconciliationDate || new Date().toISOString().split("T")[0];
    const yearMonth = dateStr.slice(0, 7).replace("-", "");
    const code = `REC-${yearMonth}-${String(newId).padStart(3, "0")}`;

    const newReconciliation = {
        id: newId,
        reconciliationCode: code,
        reconciliationName: payload.reconciliationName || `Reconciliation ${code}`,
        reconciliationDate: dateStr,
        description: payload.description || "Created via YesCapital workspace",
        referenceBatch: payload.referenceBatch || `BATCH-${yearMonth}-${newId}`,
        notes: payload.notes || "",
        status: "PENDING",
        version: 1,
        transactionCount: 0,
        mInCount: 0,
        mOutCount: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        errorCount: 0,
        createdByUserId: payload.createdByUserId || "finance_ops_user",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        updatedAt: new Date().toISOString()
    };

    reconciliationsState = [newReconciliation, ...reconciliationsState];
    saveStorage(STORAGE_KEYS.RECONCILIATIONS, reconciliationsState);

    // Audit log
    const auditLog = {
        id: Date.now(),
        reconciliationId: newId,
        reconciliationName: newReconciliation.reconciliationName,
        action: "RECONCILIATION_CREATED",
        entity: "Reconciliation",
        entityId: String(newId),
        transactionId: null,
        user: newReconciliation.createdByUserId,
        userRole: "Operations Lead",
        oldValue: null,
        newValue: `${newReconciliation.reconciliationName} (${newReconciliation.reconciliationCode})`,
        description: `Created new reconciliation batch ${newReconciliation.referenceBatch}.`,
        createdAt: new Date().toISOString()
    };

    auditLogsState = [auditLog, ...auditLogsState];
    saveStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogsState);

    return newReconciliation;
}

export async function getTransactionsByReconciliation(reconciliationId) {
    await delay(100);
    const recId = Number(reconciliationId);
    return transactionsState.filter((txn) => Number(txn.reconciliationId) === recId);
}

export async function saveTransactions(reconciliationId, { newRows = [], updatedRows = [] }) {
    await delay(180);
    const recId = Number(reconciliationId);

    let maxId = transactionsState.length > 0 
        ? Math.max(...transactionsState.map((t) => Number(t.id) || 0)) 
        : 1000;

    const createdRows = newRows.map((row) => {
        maxId += 1;
        return {
            ...row,
            id: maxId,
            reconciliationId: recId,
            amount: Number(row.amount) || 0,
            commission: Number(row.commission) || 0,
            status: "PENDING",
            matchedTransactionId: null,
            matchDetails: null
        };
    });

    const updatedMap = new Map();
    updatedRows.forEach((row) => {
        updatedMap.set(Number(row.id), {
            ...row,
            reconciliationId: recId,
            amount: Number(row.amount) || 0,
            commission: Number(row.commission) || 0
        });
    });

    transactionsState = transactionsState.map((txn) => {
        if (Number(txn.reconciliationId) === recId && updatedMap.has(Number(txn.id))) {
            return updatedMap.get(Number(txn.id));
        }
        return txn;
    }).concat(createdRows);

    saveStorage(STORAGE_KEYS.TRANSACTIONS, transactionsState);

    // Update reconciliation counts
    const recTxns = transactionsState.filter((t) => Number(t.reconciliationId) === recId);
    const mIns = recTxns.filter((t) => t.sourceSheet === "M_IN");
    const mOuts = recTxns.filter((t) => t.sourceSheet === "M_OUT");

    reconciliationsState = reconciliationsState.map((rec) => {
        if (Number(rec.id) === recId) {
            return {
                ...rec,
                transactionCount: recTxns.length,
                mInCount: mIns.length,
                mOutCount: mOuts.length,
                updatedAt: new Date().toISOString()
            };
        }
        return rec;
    });
    saveStorage(STORAGE_KEYS.RECONCILIATIONS, reconciliationsState);

    // Add audit log
    const auditLog = {
        id: Date.now(),
        reconciliationId: recId,
        reconciliationName: reconciliationsState.find((r) => Number(r.id) === recId)?.reconciliationName || "Reconciliation",
        action: "TRANSACTION_UPDATED",
        entity: "TransactionBatch",
        entityId: String(recId),
        transactionId: null,
        user: "finance_ops_lead",
        userRole: "Operations Lead",
        oldValue: `${recTxns.length - createdRows.length} transactions`,
        newValue: `${recTxns.length} transactions (${createdRows.length} created, ${updatedRows.length} updated)`,
        description: `Saved batch of transactions for reconciliation #${recId}.`,
        createdAt: new Date().toISOString()
    };
    auditLogsState = [auditLog, ...auditLogsState];
    saveStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogsState);

    return {
        success: true,
        savedCount: createdRows.length + updatedRows.length,
        createdCount: createdRows.length,
        updatedCount: updatedRows.length
    };
}

export async function importTransactions(reconciliationId, importedTransactions) {
    await delay(200);
    const recId = Number(reconciliationId);

    let maxId = transactionsState.length > 0 
        ? Math.max(...transactionsState.map((t) => Number(t.id) || 0)) 
        : 1000;

    const formatted = importedTransactions.map((txn, index) => {
        maxId += 1;
        return {
            id: maxId,
            reconciliationId: recId,
            sourceSheet: txn.sourceSheet,
            sourceRow: index + 1,
            fromBranchId: Number(txn.fromBranchId),
            fromBranchName: txn.fromBranchName || mockBranches.find((b) => b.id === Number(txn.fromBranchId))?.name || "Unknown",
            toBranchId: Number(txn.toBranchId),
            toBranchName: txn.toBranchName || mockBranches.find((b) => b.id === Number(txn.toBranchId))?.name || "Unknown",
            amount: Number(txn.amount) || 0,
            commission: Number(txn.commission) || 0,
            status: "PENDING",
            matchedTransactionId: null,
            matchDetails: null
        };
    });

    transactionsState = transactionsState.filter((t) => Number(t.reconciliationId) !== recId).concat(formatted);
    saveStorage(STORAGE_KEYS.TRANSACTIONS, transactionsState);

    const mIns = formatted.filter((t) => t.sourceSheet === "M_IN");
    const mOuts = formatted.filter((t) => t.sourceSheet === "M_OUT");

    reconciliationsState = reconciliationsState.map((rec) => {
        if (Number(rec.id) === recId) {
            return {
                ...rec,
                transactionCount: formatted.length,
                mInCount: mIns.length,
                mOutCount: mOuts.length,
                updatedAt: new Date().toISOString()
            };
        }
        return rec;
    });
    saveStorage(STORAGE_KEYS.RECONCILIATIONS, reconciliationsState);

    return formatted;
}

export async function runReconciliation(reconciliationId) {
    await delay(300);
    const recId = Number(reconciliationId);
    const targetRec = reconciliationsState.find((r) => Number(r.id) === recId);
    if (!targetRec) {
        throw new Error("Reconciliation not found");
    }

    const currentTxns = transactionsState.filter((t) => Number(t.reconciliationId) === recId);
    const mInTxns = currentTxns.filter((t) => t.sourceSheet === "M_IN");
    const mOutTxns = currentTxns.filter((t) => t.sourceSheet === "M_OUT");

    const newResults = [];
    const newErrors = [];
    const matchedMInIds = new Set();
    const matchedMOutIds = new Set();

    let resultIdCounter = 1;
    let errorIdCounter = 100;

    // Rule: Match M_IN and M_OUT
    // M_IN: toBranch is destination, fromBranch is source
    // M_OUT: fromBranch is source, toBranch is destination
    mInTxns.forEach((mIn) => {
        // Find best match in M_OUT
        // 1. exact match: same fromBranch, toBranch, and amount
        const candidateIndex = mOutTxns.findIndex((mOut) => {
            if (matchedMOutIds.has(mOut.id)) return false;
            return (
                Number(mOut.fromBranchId) === Number(mIn.fromBranchId) &&
                Number(mOut.toBranchId) === Number(mIn.toBranchId) &&
                Number(mOut.amount) === Number(mIn.amount)
            );
        });

        if (candidateIndex !== -1) {
            const mOut = mOutTxns[candidateIndex];
            matchedMInIds.add(mIn.id);
            matchedMOutIds.add(mOut.id);

            const mInComm = Number(mIn.commission) || 0;
            const mOutComm = Number(mOut.commission) || 0;

            // Commission rule:
            // Dual commission: ERROR
            // Zero commission on both: ERROR
            // Only one side collects: VALID MATCH
            const hasDualCommission = mInComm > 0 && mOutComm > 0;
            const hasZeroCommission = mInComm === 0 && mOutComm === 0;

            if (hasDualCommission) {
                const errId = `ERR-${targetRec.reconciliationCode}-${errorIdCounter++}`;
                newErrors.push({
                    id: errId,
                    reconciliationId: recId,
                    reconciliationName: targetRec.reconciliationName,
                    transactionId: mIn.id,
                    counterpartTransactionId: mOut.id,
                    transactionInfo: `${mIn.fromBranchName} → ${mIn.toBranchName} (₹${Number(mIn.amount).toLocaleString("en-IN")})`,
                    errorType: "COMMISSION_ERROR",
                    errorCode: "COMM_DUAL_COLLECTION",
                    description: `Dual commission detected: M_IN collected ₹${mInComm} and M_OUT collected ₹${mOutComm}. Only one side allowed.`,
                    status: "OPEN",
                    resolutionNotes: null,
                    resolvedBy: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                newResults.push({
                    id: resultIdCounter++,
                    reconciliationId: recId,
                    mInTransactionId: mIn.id,
                    mOutTransactionId: mOut.id,
                    sourceDescription: `${mIn.fromBranchName} → ${mIn.toBranchName}`,
                    amount: mIn.amount,
                    mInCommission: mInComm,
                    mOutCommission: mOutComm,
                    matchStatus: "ISSUE",
                    errorType: "COMMISSION_ERROR",
                    errorReason: "Dual commission deduction detected on both sheets.",
                    createdAt: new Date().toISOString()
                });

                mIn.status = "ERROR";
                mIn.matchedTransactionId = mOut.id;
                mIn.errorType = "COMMISSION_ERROR";
                mIn.errorReason = "Dual commission deduction.";
                mIn.matchDetails = {
                    counterpartId: mOut.id,
                    counterpartSheet: "M_OUT",
                    counterpartFrom: mOut.fromBranchName,
                    counterpartTo: mOut.toBranchName,
                    counterpartAmount: mOut.amount,
                    counterpartCommission: mOutComm,
                    notes: "Dual commission error."
                };

                mOut.status = "ERROR";
                mOut.matchedTransactionId = mIn.id;
                mOut.errorType = "COMMISSION_ERROR";
                mOut.errorReason = "Dual commission deduction.";
                mOut.matchDetails = {
                    counterpartId: mIn.id,
                    counterpartSheet: "M_IN",
                    counterpartFrom: mIn.fromBranchName,
                    counterpartTo: mIn.toBranchName,
                    counterpartAmount: mIn.amount,
                    counterpartCommission: mInComm,
                    notes: "Dual commission error."
                };

            } else if (hasZeroCommission) {
                const errId = `ERR-${targetRec.reconciliationCode}-${errorIdCounter++}`;
                newErrors.push({
                    id: errId,
                    reconciliationId: recId,
                    reconciliationName: targetRec.reconciliationName,
                    transactionId: mIn.id,
                    counterpartTransactionId: mOut.id,
                    transactionInfo: `${mIn.fromBranchName} → ${mIn.toBranchName} (₹${Number(mIn.amount).toLocaleString("en-IN")})`,
                    errorType: "COMMISSION_ERROR",
                    errorCode: "COMM_ZERO_COLLECTION",
                    description: "Zero commission deducted on both sides. Exactly one side must collect commission.",
                    status: "OPEN",
                    resolutionNotes: null,
                    resolvedBy: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                newResults.push({
                    id: resultIdCounter++,
                    reconciliationId: recId,
                    mInTransactionId: mIn.id,
                    mOutTransactionId: mOut.id,
                    sourceDescription: `${mIn.fromBranchName} → ${mIn.toBranchName}`,
                    amount: mIn.amount,
                    mInCommission: mInComm,
                    mOutCommission: mOutComm,
                    matchStatus: "ISSUE",
                    errorType: "COMMISSION_ERROR",
                    errorReason: "Zero commission detected across both sides.",
                    createdAt: new Date().toISOString()
                });

                mIn.status = "ERROR";
                mIn.matchedTransactionId = mOut.id;
                mIn.errorType = "COMMISSION_ERROR";
                mIn.errorReason = "Zero commission detected.";
                mIn.matchDetails = {
                    counterpartId: mOut.id,
                    counterpartSheet: "M_OUT",
                    counterpartFrom: mOut.fromBranchName,
                    counterpartTo: mOut.toBranchName,
                    counterpartAmount: mOut.amount,
                    counterpartCommission: mOutComm,
                    notes: "Zero commission error."
                };

                mOut.status = "ERROR";
                mOut.matchedTransactionId = mIn.id;
                mOut.errorType = "COMMISSION_ERROR";
                mOut.errorReason = "Zero commission detected.";
                mOut.matchDetails = {
                    counterpartId: mIn.id,
                    counterpartSheet: "M_IN",
                    counterpartFrom: mIn.fromBranchName,
                    counterpartTo: mIn.toBranchName,
                    counterpartAmount: mIn.amount,
                    counterpartCommission: mInComm,
                    notes: "Zero commission error."
                };

            } else {
                // Perfect valid match!
                newResults.push({
                    id: resultIdCounter++,
                    reconciliationId: recId,
                    mInTransactionId: mIn.id,
                    mOutTransactionId: mOut.id,
                    sourceDescription: `${mIn.fromBranchName} → ${mIn.toBranchName}`,
                    amount: mIn.amount,
                    mInCommission: mInComm,
                    mOutCommission: mOutComm,
                    matchStatus: "MATCHED",
                    errorType: null,
                    errorReason: `Exact match. Commission accounted on ${mInComm > 0 ? "M_IN" : "M_OUT"} (₹${mInComm || mOutComm}).`,
                    createdAt: new Date().toISOString()
                });

                mIn.status = "MATCHED";
                mIn.matchedTransactionId = mOut.id;
                mIn.errorType = null;
                mIn.errorReason = null;
                mIn.matchDetails = {
                    counterpartId: mOut.id,
                    counterpartSheet: "M_OUT",
                    counterpartFrom: mOut.fromBranchName,
                    counterpartTo: mOut.toBranchName,
                    counterpartAmount: mOut.amount,
                    counterpartCommission: mOutComm,
                    notes: "Exact match."
                };

                mOut.status = "MATCHED";
                mOut.matchedTransactionId = mIn.id;
                mOut.errorType = null;
                mOut.errorReason = null;
                mOut.matchDetails = {
                    counterpartId: mIn.id,
                    counterpartSheet: "M_IN",
                    counterpartFrom: mIn.fromBranchName,
                    counterpartTo: mIn.toBranchName,
                    counterpartAmount: mIn.amount,
                    counterpartCommission: mInComm,
                    notes: "Exact match."
                };
            }
        } else {
            // Check for amount mismatch candidate with same branches
            const amountMismatchCandidate = mOutTxns.find((mOut) => {
                if (matchedMOutIds.has(mOut.id)) return false;
                return (
                    Number(mOut.fromBranchId) === Number(mIn.fromBranchId) &&
                    Number(mOut.toBranchId) === Number(mIn.toBranchId)
                );
            });

            if (amountMismatchCandidate) {
                const mOut = amountMismatchCandidate;
                matchedMInIds.add(mIn.id);
                matchedMOutIds.add(mOut.id);

                const variance = Math.abs(Number(mIn.amount) - Number(mOut.amount));
                const errId = `ERR-${targetRec.reconciliationCode}-${errorIdCounter++}`;

                newErrors.push({
                    id: errId,
                    reconciliationId: recId,
                    reconciliationName: targetRec.reconciliationName,
                    transactionId: mIn.id,
                    counterpartTransactionId: mOut.id,
                    transactionInfo: `${mIn.fromBranchName} → ${mIn.toBranchName} (M_IN: ₹${Number(mIn.amount).toLocaleString("en-IN")}, M_OUT: ₹${Number(mOut.amount).toLocaleString("en-IN")})`,
                    errorType: "AMOUNT_MISMATCH",
                    errorCode: "AMT_VARIANCE",
                    description: `Amount variance of ₹${variance.toLocaleString("en-IN")} detected between corresponding transactions.`,
                    status: "OPEN",
                    resolutionNotes: null,
                    resolvedBy: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                newResults.push({
                    id: resultIdCounter++,
                    reconciliationId: recId,
                    mInTransactionId: mIn.id,
                    mOutTransactionId: mOut.id,
                    sourceDescription: `${mIn.fromBranchName} → ${mIn.toBranchName}`,
                    amount: mIn.amount,
                    mInCommission: mIn.commission,
                    mOutCommission: mOut.commission,
                    matchStatus: "ISSUE",
                    errorType: "AMOUNT_MISMATCH",
                    errorReason: `Amount mismatch of ₹${variance.toLocaleString("en-IN")}.`,
                    createdAt: new Date().toISOString()
                });

                mIn.status = "ERROR";
                mIn.matchedTransactionId = mOut.id;
                mIn.errorType = "AMOUNT_MISMATCH";
                mIn.errorReason = `Amount variance of ₹${variance.toLocaleString("en-IN")}.`;
                mIn.matchDetails = {
                    counterpartId: mOut.id,
                    counterpartSheet: "M_OUT",
                    counterpartFrom: mOut.fromBranchName,
                    counterpartTo: mOut.toBranchName,
                    counterpartAmount: mOut.amount,
                    counterpartCommission: mOut.commission,
                    notes: `Variance ₹${variance.toLocaleString("en-IN")}.`
                };

                mOut.status = "ERROR";
                mOut.matchedTransactionId = mIn.id;
                mOut.errorType = "AMOUNT_MISMATCH";
                mOut.errorReason = `Amount variance of ₹${variance.toLocaleString("en-IN")}.`;
                mOut.matchDetails = {
                    counterpartId: mIn.id,
                    counterpartSheet: "M_IN",
                    counterpartFrom: mIn.fromBranchName,
                    counterpartTo: mIn.toBranchName,
                    counterpartAmount: mIn.amount,
                    counterpartCommission: mIn.commission,
                    notes: `Variance ₹${variance.toLocaleString("en-IN")}.`
                };

            } else {
                // Completely unmatched M_IN
                newResults.push({
                    id: resultIdCounter++,
                    reconciliationId: recId,
                    mInTransactionId: mIn.id,
                    mOutTransactionId: null,
                    sourceDescription: `${mIn.fromBranchName} → ${mIn.toBranchName}`,
                    amount: mIn.amount,
                    mInCommission: mIn.commission,
                    mOutCommission: null,
                    matchStatus: "UNMATCHED",
                    errorType: "MISSING_TRANSACTION",
                    errorReason: "No corresponding M_OUT record found in batch.",
                    createdAt: new Date().toISOString()
                });

                mIn.status = "UNMATCHED";
                mIn.matchedTransactionId = null;
                mIn.errorType = "MISSING_TRANSACTION";
                mIn.errorReason = "No matching M_OUT record found.";
                mIn.matchDetails = null;
            }
        }
    });

    // Check remaining unmatched M_OUT transactions
    mOutTxns.forEach((mOut) => {
        if (!matchedMOutIds.has(mOut.id)) {
            newResults.push({
                id: resultIdCounter++,
                reconciliationId: recId,
                mInTransactionId: null,
                mOutTransactionId: mOut.id,
                sourceDescription: `${mOut.fromBranchName} → ${mOut.toBranchName}`,
                amount: mOut.amount,
                mInCommission: null,
                mOutCommission: mOut.commission,
                matchStatus: "UNMATCHED",
                errorType: "MISSING_TRANSACTION",
                errorReason: "No corresponding M_IN acknowledgement found.",
                createdAt: new Date().toISOString()
            });

            mOut.status = "UNMATCHED";
            mOut.matchedTransactionId = null;
            mOut.errorType = "MISSING_TRANSACTION";
            mOut.errorReason = "No matching M_IN record found.";
            mOut.matchDetails = null;
        }
    });

    // Update transactions in state
    const updatedTxnMap = new Map();
    [...mInTxns, ...mOutTxns].forEach((t) => updatedTxnMap.set(t.id, t));

    transactionsState = transactionsState.map((t) => {
        if (updatedTxnMap.has(t.id)) {
            return updatedTxnMap.get(t.id);
        }
        return t;
    });
    saveStorage(STORAGE_KEYS.TRANSACTIONS, transactionsState);

    // Save results and errors for this reconciliation
    resultsState = resultsState.filter((r) => Number(r.reconciliationId) !== recId).concat(newResults);
    saveStorage(STORAGE_KEYS.RESULTS, resultsState);

    // Merge errors: keep already RESOLVED errors if matching, otherwise replace
    errorsState = errorsState.filter((e) => Number(e.reconciliationId) !== recId).concat(newErrors);
    saveStorage(STORAGE_KEYS.ERRORS, errorsState);

    // Calculate final counts & status
    const matchedCount = newResults.filter((r) => r.matchStatus === "MATCHED").length;
    const unmatchedCount = newResults.filter((r) => r.matchStatus === "UNMATCHED").length;
    const errorCount = newErrors.filter((e) => e.status === "OPEN").length;

    const newStatus = (errorCount > 0 || unmatchedCount > 0) ? "ISSUES_FOUND" : "COMPLETED";
    const nextVersion = (targetRec.version || 1) + (targetRec.startedAt ? 1 : 0);

    const updatedRec = {
        ...targetRec,
        status: newStatus,
        version: nextVersion,
        transactionCount: currentTxns.length,
        mInCount: mInTxns.length,
        mOutCount: mOutTxns.length,
        matchedCount,
        unmatchedCount,
        errorCount,
        startedAt: targetRec.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    reconciliationsState = reconciliationsState.map((r) => Number(r.id) === recId ? updatedRec : r);
    saveStorage(STORAGE_KEYS.RECONCILIATIONS, reconciliationsState);

    // Audit Log
    const auditAction = targetRec.startedAt ? "RECONCILIATION_RERUN" : "RECONCILIATION_EXECUTED";
    const auditLog = {
        id: Date.now(),
        reconciliationId: recId,
        reconciliationName: targetRec.reconciliationName,
        action: auditAction,
        entity: "Reconciliation",
        entityId: String(recId),
        transactionId: null,
        user: "finance_ops_lead",
        userRole: "Operations Lead",
        oldValue: `Version: ${targetRec.version} (${targetRec.status})`,
        newValue: `Version: ${nextVersion} (${newStatus})`,
        description: `Executed reconciliation run. Matched: ${matchedCount}, Unmatched: ${unmatchedCount}, Open Issues: ${errorCount}.`,
        createdAt: new Date().toISOString()
    };
    auditLogsState = [auditLog, ...auditLogsState];
    saveStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogsState);

    return {
        reconciliation: updatedRec,
        results: newResults,
        errors: newErrors
    };
}

export async function getReconciliationResults(reconciliationId) {
    await delay(80);
    const recId = Number(reconciliationId);
    return resultsState.filter((r) => Number(r.reconciliationId) === recId);
}

export async function getReconciliationErrors(reconciliationId, status = null) {
    await delay(80);
    const recId = Number(reconciliationId);
    return errorsState.filter((e) => {
        const matchesRec = Number(e.reconciliationId) === recId;
        if (!matchesRec) return false;
        if (status) {
            return String(e.status).toUpperCase() === String(status).toUpperCase();
        }
        return true;
    });
}

export async function getAllErrors(filter = {}) {
    await delay(80);
    return errorsState.filter((e) => {
        if (filter.status && String(e.status).toUpperCase() !== String(filter.status).toUpperCase()) {
            return false;
        }
        if (filter.errorType && String(e.errorType).toUpperCase() !== String(filter.errorType).toUpperCase()) {
            return false;
        }
        if (filter.search) {
            const query = filter.search.toLowerCase();
            return (
                e.description?.toLowerCase().includes(query) ||
                e.id?.toLowerCase().includes(query) ||
                e.reconciliationName?.toLowerCase().includes(query)
            );
        }
        return true;
    });
}

export async function resolveError(errorId, resolutionNotes = "Manual verification completed and voucher reconciled.") {
    await delay(120);
    let resolvedItem = null;

    errorsState = errorsState.map((err) => {
        if (String(err.id) === String(errorId)) {
            resolvedItem = {
                ...err,
                status: "RESOLVED",
                resolutionNotes,
                resolvedBy: "finance_ops_lead",
                updatedAt: new Date().toISOString()
            };
            return resolvedItem;
        }
        return err;
    });
    saveStorage(STORAGE_KEYS.ERRORS, errorsState);

    if (resolvedItem) {
        // Update reconciliation open error count
        const recId = Number(resolvedItem.reconciliationId);
        const openCount = errorsState.filter((e) => Number(e.reconciliationId) === recId && e.status === "OPEN").length;
        reconciliationsState = reconciliationsState.map((r) => {
            if (Number(r.id) === recId) {
                return {
                    ...r,
                    errorCount: openCount,
                    updatedAt: new Date().toISOString()
                };
            }
            return r;
        });
        saveStorage(STORAGE_KEYS.RECONCILIATIONS, reconciliationsState);

        // Audit log
        const auditLog = {
            id: Date.now(),
            reconciliationId: recId,
            reconciliationName: resolvedItem.reconciliationName || "Reconciliation",
            action: "ERROR_RESOLVED",
            entity: "Error",
            entityId: String(errorId),
            transactionId: resolvedItem.transactionId ? String(resolvedItem.transactionId) : null,
            user: "finance_ops_lead",
            userRole: "Operations Lead",
            oldValue: "OPEN",
            newValue: "RESOLVED",
            description: `Resolved error ${errorId}: ${resolutionNotes}`,
            createdAt: new Date().toISOString()
        };
        auditLogsState = [auditLog, ...auditLogsState];
        saveStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogsState);
    }

    return resolvedItem;
}

export async function getAuditLogs(params = {}) {
    await delay(80);
    let logs = [...auditLogsState];

    if (params.reconciliationId) {
        logs = logs.filter((l) => Number(l.reconciliationId) === Number(params.reconciliationId));
    }
    if (params.action) {
        logs = logs.filter((l) => String(l.action).toUpperCase() === String(params.action).toUpperCase());
    }
    if (params.search) {
        const q = params.search.toLowerCase();
        logs = logs.filter((l) => 
            l.description?.toLowerCase().includes(q) ||
            l.action?.toLowerCase().includes(q) ||
            l.user?.toLowerCase().includes(q) ||
            l.reconciliationName?.toLowerCase().includes(q)
        );
    }

    return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
