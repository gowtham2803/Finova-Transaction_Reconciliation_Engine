/**
 * YesCapital Production API Service Layer
 * 
 * Fully connected to Spring Boot Backend (http://localhost:8088 / /api proxy)
 * and MySQL database (jdbc:mysql://localhost:3306/reconciliation).
 */

const API_BASE = "/api";

const META_STORAGE_KEY = "yescapital_reconciliation_metadata_v1";

function loadMetadataStore() {
    try {
        const data = localStorage.getItem(META_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch {
        // Ignore parsing errors and return empty store
    }
    return {};
}

function saveMetadataStore(store) {
    try {
        localStorage.setItem(META_STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Ignore storage failures
    }
}

function getStoredMeta(id) {
    const store = loadMetadataStore();
    return store[String(id)] || null;
}

function setStoredMeta(id, meta) {
    const store = loadMetadataStore();
    store[String(id)] = {
        ...(store[String(id)] || {}),
        ...meta
    };
    saveMetadataStore(store);
}

/**
 * Robust HTTP client with standard error extraction and JSON parsing
 */
async function request(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
    
    let token = null;
    try {
        token = localStorage.getItem("yescapital_auth_token");
    } catch {
        // Ignore storage errors
    }

    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        let errorMessage = `API Error (${response.status} ${response.statusText})`;
        try {
            const errData = await response.json();
            if (errData.message) errorMessage = errData.message;
            else if (errData.error) errorMessage = errData.error;
        } catch {
            try {
                const text = await response.text();
                if (text) errorMessage = text;
            } catch {
                // Ignore text read error
            }
        }

        // Clear expired auth state upon 401 Unauthorized (unless testing credentials on login/register)
        if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/register")) {
            try {
                localStorage.removeItem("yescapital_auth_token");
                localStorage.removeItem("yescapital_auth_user");
            } catch {
                // Ignore
            }
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }

    const data = await response.json();
    // Unwrap ApiResponse envelope if present
    if (data && typeof data === "object" && "success" in data && "data" in data) {
        return data.data;
    }
    return data;
}

/**
 * 0. AUTHENTICATION: Enterprise Sign In, Sign Up, and User Profile
 */
export async function apiLogin(credentials) {
    const payload = {
        identifier: credentials.identifier || credentials.email,
        password: credentials.password
    };
    return await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function apiRegister(userData) {
    const payload = {
        fullName: userData.fullName,
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role || "Financial Operations Lead"
    };
    return await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function apiGetCurrentUser() {
    return await request("/auth/me");
}

/**
 * 1. BRANCHES: Retrieve all active branches from MySQL
 */
export async function getBranches() {
    const branches = await request("/branches");
    return Array.isArray(branches) ? branches : [];
}

/**
 * Helper to enrich a backend reconciliation record with metrics and metadata
 */
async function enrichReconciliation(rec) {
    const id = Number(rec.id);
    const meta = getStoredMeta(id);

    let txns = [];
    let results = [];
    let errors = [];

    try {
        const [txnRes, resRes, errRes] = await Promise.allSettled([
            request(`/transactions/reconciliation/${id}`),
            request(`/reconciliations/${id}/results`),
            request(`/reconciliations/${id}/errors`)
        ]);

        if (txnRes.status === "fulfilled" && Array.isArray(txnRes.value)) txns = txnRes.value;
        if (resRes.status === "fulfilled" && Array.isArray(resRes.value)) results = resRes.value;
        if (errRes.status === "fulfilled" && Array.isArray(errRes.value)) errors = errRes.value;
    } catch {
        // Fallback gracefully
    }

    const mIns = txns.filter((t) => t.sourceSheet === "M_IN");
    const mOuts = txns.filter((t) => t.sourceSheet === "M_OUT");
    const matchedCount = results.filter((r) => r.matchStatus === "MATCHED").length;
    const unmatchedCount = results.filter((r) => r.matchStatus === "UNMATCHED").length;
    const openErrors = errors.filter((e) => e.status === "OPEN").length;

    const dateStr = meta?.reconciliationDate || (rec.createdAt ? rec.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]);

    return {
        ...rec,
        id,
        reconciliationCode: rec.reconciliationCode,
        reconciliationName: meta?.reconciliationName || `Reconciliation ${rec.reconciliationCode}`,
        reconciliationDate: dateStr,
        description: meta?.description || `Inter-branch ledger clearing and settlement batch (${rec.reconciliationCode})`,
        referenceBatch: meta?.referenceBatch || `BATCH-${rec.reconciliationCode.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`,
        notes: meta?.notes || "",
        transactionCount: txns.length,
        mInCount: mIns.length,
        mOutCount: mOuts.length,
        matchedCount,
        unmatchedCount,
        errorCount: openErrors,
        createdByUserId: meta?.createdByUserName || `Ops Lead (User #${rec.createdByUserId || 1})`,
        status: rec.status === "RECONCILED" ? "COMPLETED" : rec.status,
        version: rec.version || 1,
        startedAt: rec.startedAt,
        completedAt: rec.completedAt,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt
    };
}

/**
 * 2. RECONCILIATIONS: Retrieve all reconciliations with live computed metrics
 */
export async function getReconciliations() {
    const recs = await request("/reconciliations");
    if (!Array.isArray(recs)) return [];

    const enriched = await Promise.all(
        recs.map((rec) => enrichReconciliation(rec))
    );

    return enriched.sort((a, b) => new Date(b.createdAt || b.reconciliationDate) - new Date(a.createdAt || a.reconciliationDate));
}

/**
 * 3. RECONCILIATION DETAIL: Retrieve single reconciliation by ID
 */
export async function getReconciliation(reconciliationId) {
    const id = Number(reconciliationId);
    const rec = await request(`/reconciliations/${id}`);
    if (!rec) {
        throw new Error(`Reconciliation #${reconciliationId} not found.`);
    }
    return enrichReconciliation(rec);
}

/**
 * 4. CREATE RECONCILIATION: Save new batch to database
 */
export async function createReconciliation(payload) {
    const body = {
        createdByUserId: Number(payload?.createdByUserId) || 1
    };

    const created = await request("/reconciliations", {
        method: "POST",
        body: JSON.stringify(body)
    });

    const newId = Number(created.id);
    const dateStr = payload.reconciliationDate || (created.createdAt ? created.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]);

    // Store custom presentation metadata entered by user in the modal
    setStoredMeta(newId, {
        reconciliationName: payload.reconciliationName || `Reconciliation ${created.reconciliationCode}`,
        reconciliationDate: dateStr,
        description: payload.description || "Created via YesCapital workspace",
        referenceBatch: payload.referenceBatch || `BATCH-${dateStr.replace(/-/g, "").slice(2)}-${newId}`,
        notes: payload.notes || "",
        createdByUserName: "Operations Lead (local-user)"
    });

    return enrichReconciliation(created);
}

/**
 * 5. TRANSACTIONS: Retrieve and link transactions for workspace
 */
export async function getTransactionsByReconciliation(reconciliationId) {
    const id = Number(reconciliationId);
    const [txns, results] = await Promise.all([
        request(`/transactions/reconciliation/${id}`),
        request(`/reconciliations/${id}/results`).catch(() => [])
    ]);

    if (!Array.isArray(txns)) return [];

    const mInResultMap = new Map();
    const mOutResultMap = new Map();

    (results || []).forEach((res) => {
        if (res.mInTransactionId) mInResultMap.set(Number(res.mInTransactionId), res);
        if (res.mOutTransactionId) mOutResultMap.set(Number(res.mOutTransactionId), res);
    });

    const txnMap = new Map();
    txns.forEach((t) => txnMap.set(Number(t.id), t));

    return txns.map((txn) => {
        const isMIn = txn.sourceSheet === "M_IN";
        const txnId = Number(txn.id);
        const res = isMIn ? mInResultMap.get(txnId) : mOutResultMap.get(txnId);

        let status = txn.status || "PENDING";
        let matchedTransactionId = null;
        let matchDetails = null;
        let errorType = null;
        let errorReason = null;

        if (res) {
            if (res.matchStatus === "MATCHED") {
                status = "MATCHED";
                matchedTransactionId = isMIn ? res.mOutTransactionId : res.mInTransactionId;
            } else if (res.matchStatus === "ISSUE") {
                status = "ERROR";
                errorType = res.errorType;
                errorReason = res.errorReason;
                matchedTransactionId = isMIn ? res.mOutTransactionId : res.mInTransactionId;
            } else if (res.matchStatus === "UNMATCHED") {
                status = "UNMATCHED";
                errorType = res.errorType || "MISSING_TRANSACTION";
                errorReason = res.errorReason || "No counterpart record found.";
            }
        }

        const counterpart = matchedTransactionId ? txnMap.get(Number(matchedTransactionId)) : null;
        if (counterpart) {
            matchDetails = {
                counterpartId: counterpart.id,
                counterpartSheet: counterpart.sourceSheet,
                counterpartFrom: counterpart.fromBranchName,
                counterpartTo: counterpart.toBranchName,
                counterpartAmount: counterpart.amount,
                counterpartCommission: counterpart.commission,
                notes: errorReason || (status === "MATCHED" ? "Exact match." : "")
            };
        }

        return {
            ...txn,
            status,
            matchedTransactionId,
            matchDetails,
            errorType,
            errorReason
        };
    });
}

/**
 * 6. SAVE TRANSACTIONS: Persist batch modifications and new rows to database
 */
export async function saveTransactions(reconciliationId, { newRows = [], updatedRows = [] }) {
    const recId = Number(reconciliationId);
    let createdCount = 0;
    let updatedCount = 0;

    // Filter and format new rows
    const validNewRows = (newRows || [])
        .filter((r) => r && r.fromBranchId && r.toBranchId && Number(r.amount) > 0)
        .map((r, idx) => ({
            reconciliationId: recId,
            sourceSheet: r.sourceSheet || "M_IN",
            sourceRow: Number(r.sourceRow) || idx + 1,
            fromBranchId: Number(r.fromBranchId),
            toBranchId: Number(r.toBranchId),
            amount: Number(r.amount),
            commission: Number(r.commission) || 0
        }));

    if (validNewRows.length > 0) {
        const createdResponses = await request("/transactions/bulk", {
            method: "POST",
            body: JSON.stringify(validNewRows)
        });
        createdCount = Array.isArray(createdResponses) ? createdResponses.length : validNewRows.length;
    }

    // Process updated rows
    if (updatedRows && updatedRows.length > 0) {
        for (const row of updatedRows) {
            if (!row.id || String(row.id).startsWith("temp-")) continue;
            await request(`/transactions/${row.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    fromBranchId: Number(row.fromBranchId),
                    toBranchId: Number(row.toBranchId),
                    amount: Number(row.amount),
                    commission: Number(row.commission) || 0
                })
            });
            updatedCount++;
        }
    }

    return {
        success: true,
        savedCount: createdCount + updatedCount,
        createdCount,
        updatedCount
    };
}

/**
 * 7. IMPORT TRANSACTIONS: Bulk load workbook rows into database
 */
export async function importTransactions(reconciliationId, importedTransactions) {
    const recId = Number(reconciliationId);
    const formatted = (importedTransactions || [])
        .filter((t) => t && Number(t.amount) > 0)
        .map((t, index) => ({
            reconciliationId: recId,
            sourceSheet: t.sourceSheet,
            sourceRow: t.sourceRow !== undefined && t.sourceRow !== null ? Number(t.sourceRow) : (index + 1),
            fromBranchId: Number(t.fromBranchId),
            toBranchId: Number(t.toBranchId),
            amount: Number(t.amount),
            commission: Number(t.commission) || 0
        }));

    if (formatted.length === 0) return [];

    const saved = await request("/transactions/bulk", {
        method: "POST",
        body: JSON.stringify(formatted)
    });

    return saved;
}

/**
 * 8. RUN RECONCILIATION: Trigger Spring Boot reconciliation engine
 */
export async function runReconciliation(reconciliationId) {
    const recId = Number(reconciliationId);

    // Execute matching engine
    await request(`/reconciliations/${recId}/run`, {
        method: "POST"
    });

    // Retrieve fresh status and records
    const [rec, results, errors] = await Promise.all([
        getReconciliation(recId),
        getReconciliationResults(recId),
        getReconciliationErrors(recId)
    ]);

    return {
        reconciliation: rec,
        results,
        errors
    };
}

/**
 * 9. RESULTS: Retrieve match and issue results for a reconciliation
 */
export async function getReconciliationResults(reconciliationId) {
    const recId = Number(reconciliationId);
    const [results, txns] = await Promise.all([
        request(`/reconciliations/${recId}/results`).catch(() => []),
        request(`/transactions/reconciliation/${recId}`).catch(() => [])
    ]);

    if (!Array.isArray(results)) return [];

    const txnMap = new Map();
    (txns || []).forEach((t) => txnMap.set(Number(t.id), t));

    return results.map((r) => {
        const mIn = r.mInTransactionId ? txnMap.get(Number(r.mInTransactionId)) : null;
        const mOut = r.mOutTransactionId ? txnMap.get(Number(r.mOutTransactionId)) : null;

        const fromName = mIn?.fromBranchName || mOut?.fromBranchName || "—";
        const toName = mIn?.toBranchName || mOut?.toBranchName || "—";
        const amount = mIn?.amount ?? mOut?.amount ?? 0;
        const mInComm = mIn?.commission ?? 0;
        const mOutComm = mOut?.commission ?? 0;

        return {
            ...r,
            sourceDescription: `${fromName} → ${toName}`,
            amount,
            mInCommission: mInComm,
            mOutCommission: mOutComm
        };
    });
}

/**
 * 10. ERRORS BY RECONCILIATION: Retrieve errors with linked transaction descriptions
 */
export async function getReconciliationErrors(reconciliationId, status = null) {
    const recId = Number(reconciliationId);
    const url = status 
        ? `/reconciliations/${recId}/errors?status=${encodeURIComponent(status)}`
        : `/reconciliations/${recId}/errors`;

    const [errors, txns, results] = await Promise.all([
        request(url).catch(() => []),
        request(`/transactions/reconciliation/${recId}`).catch(() => []),
        request(`/reconciliations/${recId}/results`).catch(() => [])
    ]);

    if (!Array.isArray(errors)) return [];

    const recMeta = getStoredMeta(recId);
    const txnMap = new Map();
    (txns || []).forEach((t) => txnMap.set(Number(t.id), t));
    const resultMap = new Map();
    (results || []).forEach((r) => resultMap.set(Number(r.id), r));

    return errors.map((err) => {
        const result = err.reconciliationResultId ? resultMap.get(Number(err.reconciliationResultId)) : null;
        const mIn = result?.mInTransactionId ? txnMap.get(Number(result.mInTransactionId)) : null;
        const mOut = result?.mOutTransactionId ? txnMap.get(Number(result.mOutTransactionId)) : null;

        let transactionInfo = "—";
        if (mIn && mOut) {
            transactionInfo = `${mIn.fromBranchName} → ${mIn.toBranchName} (M_IN: ₹${Number(mIn.amount).toLocaleString("en-IN")}, M_OUT: ₹${Number(mOut.amount).toLocaleString("en-IN")})`;
        } else if (mIn) {
            transactionInfo = `${mIn.fromBranchName} → ${mIn.toBranchName} (M_IN: ₹${Number(mIn.amount).toLocaleString("en-IN")})`;
        } else if (mOut) {
            transactionInfo = `${mOut.fromBranchName} → ${mOut.toBranchName} (M_OUT: ₹${Number(mOut.amount).toLocaleString("en-IN")})`;
        }

        return {
            ...err,
            id: String(err.id),
            reconciliationName: recMeta?.reconciliationName || `Reconciliation #${recId}`,
            transactionId: mIn?.id || mOut?.id || null,
            counterpartTransactionId: mOut?.id || mIn?.id || null,
            transactionInfo,
            resolutionNotes: err.status === "RESOLVED" ? "Manual exception sign-off completed." : null
        };
    });
}

/**
 * 11. ALL ERRORS: Cross-batch exception center list
 */
export async function getAllErrors(filter = {}) {
    const recs = await request("/reconciliations").catch(() => []);
    if (!Array.isArray(recs)) return [];

    const allErrorsArrays = await Promise.all(
        recs.map((r) => getReconciliationErrors(r.id, filter.status === "ALL" ? null : filter.status))
    );

    const merged = allErrorsArrays.flat();

    return merged.filter((err) => {
        if (filter.status && filter.status !== "ALL" && String(err.status).toUpperCase() !== String(filter.status).toUpperCase()) {
            return false;
        }
        if (filter.errorType && filter.errorType !== "ALL" && String(err.errorType).toUpperCase() !== String(filter.errorType).toUpperCase()) {
            return false;
        }
        if (filter.search) {
            const q = filter.search.toLowerCase();
            return (
                err.description?.toLowerCase().includes(q) ||
                String(err.id).toLowerCase().includes(q) ||
                err.reconciliationName?.toLowerCase().includes(q) ||
                err.transactionInfo?.toLowerCase().includes(q)
            );
        }
        return true;
    });
}

/**
 * 12. RESOLVE ERROR: Update exception status in database
 */
export async function resolveError(errorId, resolutionNotes = "Manual verification completed and voucher reconciled.") {
    const resolved = await request(`/errors/${Number(errorId)}/resolve`, {
        method: "PATCH"
    });
    return {
        ...resolved,
        id: String(resolved?.id || errorId),
        resolutionNotes,
        resolvedBy: "finance_ops_lead"
    };
}

/**
 * 13. AUDIT LOGS: Retrieve immutable regulatory ledger
 */
export async function getAuditLogs(params = {}) {
    let query = "?page=0&size=100&sortBy=createdAt&direction=DESC";
    if (params.reconciliationId) {
        query += `&reconciliationId=${encodeURIComponent(params.reconciliationId)}`;
    }
    if (params.action && params.action !== "ALL") {
        query += `&action=${encodeURIComponent(params.action)}`;
    }

    const pageData = await request(`/audit-logs${query}`);
    const logs = pageData?.content || (Array.isArray(pageData) ? pageData : []);

    const mapped = logs.map((log) => {
        const recMeta = log.reconciliationId ? getStoredMeta(log.reconciliationId) : null;
        return {
            id: log.id,
            reconciliationId: log.reconciliationId,
            reconciliationName: recMeta?.reconciliationName || (log.reconciliationId ? `Reconciliation #${log.reconciliationId}` : "System Audit"),
            action: log.action,
            entity: log.transactionId ? "Transaction" : "Reconciliation",
            entityId: String(log.transactionId || log.reconciliationId || log.id),
            transactionId: log.transactionId,
            user: "finance_ops_lead",
            userRole: "Operations Lead",
            oldValue: log.oldValue || "—",
            newValue: log.newValue || "—",
            description: log.reason || `${log.action} executed`,
            createdAt: log.createdAt
        };
    });

    const uniqueLogs = [];
    const seenIds = new Set();
    for (const item of mapped) {
        if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueLogs.push(item);
        }
    }

    if (params.search) {
        const q = params.search.toLowerCase();
        return uniqueLogs.filter((l) =>
            l.description?.toLowerCase().includes(q) ||
            l.action?.toLowerCase().includes(q) ||
            l.user?.toLowerCase().includes(q) ||
            l.reconciliationName?.toLowerCase().includes(q)
        );
    }

    return uniqueLogs;
}