import { initialMockReconciliations } from "../mock/mockReconciliations";
import { computeTransactionRowMap, buildAlignedSlots } from "../utils/alignmentUtils";

/**
 * YesCapital Production API Service Layer
 * 
 * Fully connected to Spring Boot Backend (http://localhost:8088 / /api proxy)
 * and MySQL database (jdbc:mysql://localhost:3306/reconciliation).
 */

const API_BASE = "/api";

const META_STORAGE_KEY = "yescapital_reconciliation_metadata_v1";

const initialMetadataMap = {};
if (Array.isArray(initialMockReconciliations)) {
    initialMockReconciliations.forEach((r) => {
        initialMetadataMap[String(r.id)] = {
            reconciliationName: r.reconciliationName,
            reconciliationDate: r.reconciliationDate,
            description: r.description,
            referenceBatch: r.referenceBatch,
            notes: r.notes
        };
    });
}

function loadMetadataStore() {
    try {
        const data = localStorage.getItem(META_STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            return { ...initialMetadataMap, ...parsed };
        }
    } catch {
        // Ignore parsing errors and return initial store
    }
    return { ...initialMetadataMap };
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

function getActiveAuthUser() {
    try {
        const stored = localStorage.getItem("yescapital_auth_user");
        if (stored) return JSON.parse(stored);
    } catch {
        // Ignore
    }
    return null;
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
 * 1b. ENSURE BRANCHES: Register or verify dynamic branch names from Excel
 */
export async function ensureBranches(branchNames) {
    if (!branchNames || !Array.isArray(branchNames) || branchNames.length === 0) {
        return getBranches();
    }
    const cleanNames = Array.from(new Set(
        branchNames
            .map((n) => (n !== null && n !== undefined ? String(n).trim() : ""))
            .filter((n) => n.length > 0 && n !== "Unknown")
    ));
    if (cleanNames.length === 0) {
        return getBranches();
    }
    const branches = await request("/branches/ensure", {
        method: "POST",
        body: JSON.stringify(cleanNames)
    });
    return Array.isArray(branches) ? branches : getBranches();
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
    // Deduplicate / consolidate results
    const consolidatedResultsMap = new Map();
    results.forEach((r) => {
        let key = (r.mInTransactionId && r.mOutTransactionId) 
            ? `PAIR_${r.mInTransactionId}_${r.mOutTransactionId}`
            : r.mInTransactionId ? `MIN_${r.mInTransactionId}` : r.mOutTransactionId ? `MOUT_${r.mOutTransactionId}` : `RES_${r.id}`;
        if (!consolidatedResultsMap.has(key)) {
            consolidatedResultsMap.set(key, r);
        } else {
            const existing = consolidatedResultsMap.get(key);
            if (existing.matchStatus === "MATCHED" && r.matchStatus !== "MATCHED") {
                consolidatedResultsMap.set(key, r);
            }
        }
    });
    const consolidatedResults = Array.from(consolidatedResultsMap.values());

    const matchedCount = consolidatedResults.filter((r) => r.matchStatus === "MATCHED").length;
    const unmatchedCount = consolidatedResults.filter((r) => r.matchStatus === "UNMATCHED" || (r.matchStatus === "ISSUE" && (r.errorType === "MISSING_M_OUT" || r.errorType === "MISSING_M_IN"))).length;
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
        createdByUserId: (() => {
            const authUser = getActiveAuthUser();
            const raw = rec.createdByUsername || meta?.createdByUserName || authUser?.username || "local-user";
            return raw.replace(/^.*?\(|\)$/g, "").replace(/^.*?—\s*/i, "").trim() || "local-user";
        })(),
        createdByUsername: (() => {
            const authUser = getActiveAuthUser();
            const raw = rec.createdByUsername || meta?.createdByUserName || authUser?.username || "local-user";
            return raw.replace(/^.*?\(|\)$/g, "").replace(/^.*?—\s*/i, "").trim() || "local-user";
        })(),
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
    const authUser = getActiveAuthUser();
    const currentUsername = authUser?.username || "local-user";
    const currentUserId = Number(payload?.createdByUserId) || Number(authUser?.id) || 1;
    const trimmedName = (payload?.reconciliationName || "").trim();

    const body = {
        createdByUserId: currentUserId,
        reconciliationName: trimmedName
    };

    const created = await request("/reconciliations", {
        method: "POST",
        body: JSON.stringify(body)
    });

    const newId = Number(created.id);
    const dateStr = payload.reconciliationDate || (created.createdAt ? created.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]);

    // Store custom presentation metadata entered by user in the modal
    setStoredMeta(newId, {
        reconciliationName: created.reconciliationName || trimmedName,
        reconciliationDate: dateStr,
        description: payload.description || "Created via YesCapital workspace",
        referenceBatch: payload.referenceBatch || `BATCH-${dateStr.replace(/-/g, "").slice(2)}-${newId}`,
        notes: payload.notes || "",
        createdByUserName: currentUsername
    });

    return enrichReconciliation(created);
}

/**
 * Check if reconciliation name already exists (case-insensitive)
 */
export async function checkReconciliationNameExists(name) {
    if (!name || !name.trim()) return false;
    return await request(`/reconciliations/check-name?name=${encodeURIComponent(name.trim())}`);
}

/**
 * Delete a reconciliation by ID
 */
export async function deleteReconciliation(reconciliationId) {
    const id = Number(reconciliationId);
    return await request(`/reconciliations/${id}`, {
        method: "DELETE"
    });
}

/**
 * 5. TRANSACTIONS: Retrieve and link transactions for workspace
 */
export async function getTransactionsByReconciliation(reconciliationId) {
    const id = Number(reconciliationId);
    const [txns, results, branches] = await Promise.all([
        request(`/transactions/reconciliation/${id}`),
        request(`/reconciliations/${id}/results`).catch(() => []),
        getBranches().catch(() => [])
    ]);

    if (!Array.isArray(txns)) return [];

    const branchCodeMap = new Map();
    (branches || []).forEach((b) => {
        if (b.id) branchCodeMap.set(String(b.id), b.code || b.name);
        if (b.name) branchCodeMap.set(b.name.trim().toLowerCase(), b.code || b.name);
        if (b.code) branchCodeMap.set(b.code.trim().toLowerCase(), b.code);
    });

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
            const counterpartFromCode = counterpart.fromBranchCode ||
                branchCodeMap.get(String(counterpart.fromBranchId)) ||
                branchCodeMap.get(counterpart.fromBranchName?.trim().toLowerCase()) ||
                counterpart.fromBranchName;
            const counterpartToCode = counterpart.toBranchCode ||
                branchCodeMap.get(String(counterpart.toBranchId)) ||
                branchCodeMap.get(counterpart.toBranchName?.trim().toLowerCase()) ||
                counterpart.toBranchName;

            matchDetails = {
                counterpartId: counterpart.id,
                counterpartSheet: counterpart.sourceSheet,
                counterpartFrom: counterpartFromCode,
                counterpartTo: counterpartToCode,
                counterpartAmount: counterpart.amount,
                counterpartCommission: counterpart.commission,
                notes: errorReason || (status === "MATCHED" ? "Exact match." : "")
            };
        }

        const fromCode = txn.fromBranchCode ||
            branchCodeMap.get(String(txn.fromBranchId)) ||
            branchCodeMap.get(txn.fromBranchName?.trim().toLowerCase()) ||
            txn.fromBranchName;
        const toCode = txn.toBranchCode ||
            branchCodeMap.get(String(txn.toBranchId)) ||
            branchCodeMap.get(txn.toBranchName?.trim().toLowerCase()) ||
            txn.toBranchName;

        return {
            ...txn,
            fromBranchName: fromCode,
            toBranchName: toCode,
            fromBranchCode: fromCode,
            toBranchCode: toCode,
            status,
            matchedTransactionId,
            matchDetails,
            errorType,
            errorReason
        };
    });
}

/**
 * 6. SAVE TRANSACTIONS: Persist batch modifications, new rows, and deletions to database
 */
export async function saveTransactions(reconciliationId, { newRows = [], updatedRows = [], deletedRowIds = [] }) {
    const recId = Number(reconciliationId);
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    // Process deleted rows first
    const validDeletedIds = (deletedRowIds || [])
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0);

    if (validDeletedIds.length > 0) {
        await request("/transactions/bulk-delete", {
            method: "POST",
            body: JSON.stringify(validDeletedIds)
        });
        deletedCount = validDeletedIds.length;
    }

    // Load registered database branches as single source of truth
    const activeBranches = await getBranches();
    const branchMap = new Map();
    activeBranches.forEach((b) => {
        if (b.name) branchMap.set(b.name.trim().toLowerCase(), b);
        if (b.code) branchMap.set(b.code.trim().toLowerCase(), b);
        if (b.id) branchMap.set(String(b.id), b);
    });

    // Filter, validate, and format new rows
    const validNewRows = (newRows || [])
        .filter((r) => r && (r.fromBranchId || r.fromBranchName) && (r.toBranchId || r.toBranchName) && Number(r.amount) > 0)
        .map((r, idx) => {
            const sheetLabel = r.sourceSheet === "M_IN" ? "M In" : "M Out";
            const rowNum = Number(r.sourceRow) || idx + 1;

            let fromB = null;
            if (r.fromBranchId && branchMap.has(String(r.fromBranchId))) {
                fromB = branchMap.get(String(r.fromBranchId));
            } else if (r.fromBranchName && branchMap.has(r.fromBranchName.trim().toLowerCase())) {
                fromB = branchMap.get(r.fromBranchName.trim().toLowerCase());
            }

            if (!fromB) {
                throw new Error(`[${sheetLabel} Row ${rowNum}] From Branch '${r.fromBranchName || r.fromBranchId}' does not exist in the database. Only registered branches are allowed.`);
            }

            let toB = null;
            if (r.toBranchId && branchMap.has(String(r.toBranchId))) {
                toB = branchMap.get(String(r.toBranchId));
            } else if (r.toBranchName && branchMap.has(r.toBranchName.trim().toLowerCase())) {
                toB = branchMap.get(r.toBranchName.trim().toLowerCase());
            }

            if (!toB) {
                throw new Error(`[${sheetLabel} Row ${rowNum}] To Branch '${r.toBranchName || r.toBranchId}' does not exist in the database. Only registered branches are allowed.`);
            }

            return {
                reconciliationId: recId,
                sourceSheet: r.sourceSheet || "M_IN",
                sourceRow: rowNum,
                fromBranchId: fromB.id,
                fromBranchName: fromB.name,
                toBranchId: toB.id,
                toBranchName: toB.name,
                amount: Number(r.amount),
                commission: Number(r.commission) || 0
            };
        });

    if (validNewRows.length > 0) {
        const createdResponses = await request("/transactions/bulk", {
            method: "POST",
            body: JSON.stringify(validNewRows)
        });
        createdCount = Array.isArray(createdResponses) ? createdResponses.length : validNewRows.length;
    }

    // Process updated rows with strict branch validation
    if (updatedRows && updatedRows.length > 0) {
        for (const row of updatedRows) {
            if (!row.id || String(row.id).startsWith("temp-")) continue;

            const sheetLabel = row.sourceSheet === "M_IN" ? "M In" : "M Out";
            const rowNum = Number(row.sourceRow) || 1;

            let fromB = null;
            if (row.fromBranchId && branchMap.has(String(row.fromBranchId))) {
                fromB = branchMap.get(String(row.fromBranchId));
            } else if (row.fromBranchName && branchMap.has(row.fromBranchName.trim().toLowerCase())) {
                fromB = branchMap.get(row.fromBranchName.trim().toLowerCase());
            }

            if (!fromB) {
                throw new Error(`[${sheetLabel} Row ${rowNum}] From Branch '${row.fromBranchName || row.fromBranchId}' does not exist in the database. Only registered branches are allowed.`);
            }

            let toB = null;
            if (row.toBranchId && branchMap.has(String(row.toBranchId))) {
                toB = branchMap.get(String(row.toBranchId));
            } else if (row.toBranchName && branchMap.has(row.toBranchName.trim().toLowerCase())) {
                toB = branchMap.get(row.toBranchName.trim().toLowerCase());
            }

            if (!toB) {
                throw new Error(`[${sheetLabel} Row ${rowNum}] To Branch '${row.toBranchName || row.toBranchId}' does not exist in the database. Only registered branches are allowed.`);
            }

            await request(`/transactions/${row.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    fromBranchId: fromB.id,
                    fromBranchName: fromB.name,
                    toBranchId: toB.id,
                    toBranchName: toB.name,
                    amount: Number(row.amount),
                    commission: Number(row.commission) || 0
                })
            });
            updatedCount++;
        }
    }

    return {
        success: true,
        savedCount: createdCount + updatedCount + deletedCount,
        createdCount,
        updatedCount,
        deletedCount
    };
}

export async function deleteTransaction(transactionId) {
    return request(`/transactions/${transactionId}`, {
        method: "DELETE"
    });
}

export async function deleteTransactions(transactionIds) {
    const validIds = (transactionIds || []).map(Number).filter((id) => !isNaN(id) && id > 0);
    if (validIds.length === 0) return;
    return request("/transactions/bulk-delete", {
        method: "POST",
        body: JSON.stringify(validIds)
    });
}

/**
 * 7. IMPORT TRANSACTIONS: Bulk load workbook rows into database
 */
export async function importTransactions(reconciliationId, importedTransactions) {
    const recId = Number(reconciliationId);

    // 1. Single source of truth: Load registered branches directly from database
    const activeBranches = await getBranches();
    const branchMap = new Map();
    activeBranches.forEach((b) => {
        if (b.name) branchMap.set(b.name.trim().toLowerCase(), b);
        if (b.code) branchMap.set(b.code.trim().toLowerCase(), b);
        if (b.id) branchMap.set(String(b.id), b);
    });

    const formatted = (importedTransactions || [])
        .filter((t) => t && Number(t.amount) > 0)
        .map((t, index) => {
            const sheetLabel = t.sourceSheet === "M_IN" ? "M In" : "M Out";
            const rowNum = t.sourceRow !== undefined && t.sourceRow !== null ? Number(t.sourceRow) : (index + 1);

            let fromB = null;
            if (t.fromBranchId && branchMap.has(String(t.fromBranchId))) {
                fromB = branchMap.get(String(t.fromBranchId));
            } else if (t.fromBranchName && branchMap.has(t.fromBranchName.trim().toLowerCase())) {
                fromB = branchMap.get(t.fromBranchName.trim().toLowerCase());
            }

            if (!fromB) {
                throw new Error(`[${sheetLabel} Row ${rowNum}] From Branch '${t.fromBranchName || t.fromBranchId}' does not exist in the database. Only registered branches are allowed.`);
            }

            let toB = null;
            if (t.toBranchId && branchMap.has(String(t.toBranchId))) {
                toB = branchMap.get(String(t.toBranchId));
            } else if (t.toBranchName && branchMap.has(t.toBranchName.trim().toLowerCase())) {
                toB = branchMap.get(t.toBranchName.trim().toLowerCase());
            }

            if (!toB) {
                throw new Error(`[${sheetLabel} Row ${rowNum}] To Branch '${t.toBranchName || t.toBranchId}' does not exist in the database. Only registered branches are allowed.`);
            }

            return {
                reconciliationId: recId,
                sourceSheet: t.sourceSheet,
                sourceRow: rowNum,
                fromBranchId: fromB.id,
                fromBranchName: fromB.name,
                toBranchId: toB.id,
                toBranchName: toB.name,
                amount: Number(t.amount),
                commission: Number(t.commission) || 0
            };
        });

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
    const [results, txns, branches] = await Promise.all([
        request(`/reconciliations/${recId}/results`).catch(() => []),
        request(`/transactions/reconciliation/${recId}`).catch(() => []),
        getBranches().catch(() => [])
    ]);

    if (!Array.isArray(results)) return [];

    const branchCodeMap = new Map();
    (branches || []).forEach((b) => {
        if (b.id) branchCodeMap.set(String(b.id), b.code || b.name);
        if (b.name) branchCodeMap.set(b.name.trim().toLowerCase(), b.code || b.name);
        if (b.code) branchCodeMap.set(b.code.trim().toLowerCase(), b.code);
    });

    const txnMap = new Map();
    (txns || []).forEach((t) => txnMap.set(Number(t.id), t));

    // Consolidate duplicate rows so each transaction pair or transaction appears exactly once
    const consolidatedMap = new Map();
    results.forEach((r) => {
        let key;
        if (r.mInTransactionId && r.mOutTransactionId) {
            key = `PAIR_${r.mInTransactionId}_${r.mOutTransactionId}`;
        } else if (r.mInTransactionId) {
            key = `MIN_${r.mInTransactionId}`;
        } else if (r.mOutTransactionId) {
            key = `MOUT_${r.mOutTransactionId}`;
        } else {
            key = `RES_${r.id}`;
        }

        if (!consolidatedMap.has(key)) {
            consolidatedMap.set(key, r);
        } else {
            const existing = consolidatedMap.get(key);
            // If existing was MATCHED and current has an ISSUE or UNMATCHED, current takes precedence
            if (existing.matchStatus === "MATCHED" && r.matchStatus !== "MATCHED") {
                consolidatedMap.set(key, r);
            }
        }
    });

    return Array.from(consolidatedMap.values()).map((r) => {
        const mIn = r.mInTransactionId ? txnMap.get(Number(r.mInTransactionId)) : null;
        const mOut = r.mOutTransactionId ? txnMap.get(Number(r.mOutTransactionId)) : null;

        const rawFromName = mIn?.fromBranchName || mOut?.fromBranchName || "—";
        const rawToName = mIn?.toBranchName || mOut?.toBranchName || "—";

        const fromCode = mIn?.fromBranchCode || mOut?.fromBranchCode ||
            branchCodeMap.get(String(mIn?.fromBranchId || mOut?.fromBranchId)) ||
            branchCodeMap.get(rawFromName.trim().toLowerCase()) ||
            rawFromName;

        const toCode = mIn?.toBranchCode || mOut?.toBranchCode ||
            branchCodeMap.get(String(mIn?.toBranchId || mOut?.toBranchId)) ||
            branchCodeMap.get(rawToName.trim().toLowerCase()) ||
            rawToName;

        const amount = mIn?.amount ?? mOut?.amount ?? 0;
        const mInComm = mIn?.commission ?? 0;
        const mOutComm = mOut?.commission ?? 0;

        let status = r.matchStatus;
        if (status === "ISSUE" && (r.errorType === "MISSING_M_OUT" || r.errorType === "MISSING_M_IN")) {
            status = "UNMATCHED";
        }

        return {
            ...r,
            matchStatus: status,
            fromBranchCode: fromCode,
            toBranchCode: toCode,
            sourceDescription: `${fromCode} → ${toCode}`,
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

    const [errors, txns, results, branches] = await Promise.all([
        request(url).catch(() => []),
        request(`/transactions/reconciliation/${recId}`).catch(() => []),
        request(`/reconciliations/${recId}/results`).catch(() => []),
        getBranches().catch(() => [])
    ]);

    if (!Array.isArray(errors)) return [];

    const branchCodeMap = new Map();
    (branches || []).forEach((b) => {
        if (b.id) branchCodeMap.set(String(b.id), b.code || b.name);
        if (b.name) branchCodeMap.set(b.name.trim().toLowerCase(), b.code || b.name);
        if (b.code) branchCodeMap.set(b.code.trim().toLowerCase(), b.code);
    });

    const recMeta = getStoredMeta(recId);
    const txnMap = new Map();
    (txns || []).forEach((t) => txnMap.set(Number(t.id), t));
    const resultMap = new Map();
    (results || []).forEach((r) => resultMap.set(Number(r.id), r));

    const { getAlignedRow } = computeTransactionRowMap(txns, results);

    return errors.map((err) => {
        const result = err.reconciliationResultId ? resultMap.get(Number(err.reconciliationResultId)) : null;
        const mIn = result?.mInTransactionId ? txnMap.get(Number(result.mInTransactionId)) : null;
        const mOut = result?.mOutTransactionId ? txnMap.get(Number(result.mOutTransactionId)) : null;

        const resolveCode = (txn, type) => {
            if (!txn) return "—";
            const isFrom = type === "from";
            const code = isFrom ? txn.fromBranchCode : txn.toBranchCode;
            const id = isFrom ? txn.fromBranchId : txn.toBranchId;
            const name = isFrom ? txn.fromBranchName : txn.toBranchName;
            return code ||
                branchCodeMap.get(String(id)) ||
                branchCodeMap.get(name?.trim().toLowerCase()) ||
                name ||
                "—";
        };

        let transactionInfo = "—";
        if (mIn && mOut) {
            const fromCode = resolveCode(mIn, "from");
            const toCode = resolveCode(mIn, "to");
            transactionInfo = `${fromCode} → ${toCode} (M_IN: ₹${Number(mIn.amount).toLocaleString("en-IN")}, M_OUT: ₹${Number(mOut.amount).toLocaleString("en-IN")})`;
        } else if (mIn) {
            const fromCode = resolveCode(mIn, "from");
            const toCode = resolveCode(mIn, "to");
            transactionInfo = `${fromCode} → ${toCode} (M_IN: ₹${Number(mIn.amount).toLocaleString("en-IN")})`;
        } else if (mOut) {
            const fromCode = resolveCode(mOut, "from");
            const toCode = resolveCode(mOut, "to");
            transactionInfo = `${fromCode} → ${toCode} (M_OUT: ₹${Number(mOut.amount).toLocaleString("en-IN")})`;
        }

        const alignedRow = getAlignedRow(err, mIn, mOut);
        const rowDisplay = alignedRow !== null && alignedRow !== undefined ? String(alignedRow) : "—";

        let targetSheet = "M_IN";
        const errTypeUpper = String(err.errorType || "").toUpperCase();
        if (errTypeUpper === "MISSING_M_IN" || (mOut && !mIn)) {
            targetSheet = "M_OUT";
        } else if (errTypeUpper === "MISSING_M_OUT" || (mIn && !mOut)) {
            targetSheet = "M_IN";
        } else if (err.description?.toLowerCase().includes("m out") || err.description?.toLowerCase().includes("m_out")) {
            targetSheet = "M_OUT";
        } else if (err.description?.toLowerCase().includes("m in") || err.description?.toLowerCase().includes("m_in")) {
            targetSheet = "M_IN";
        }

        const targetTxnId = targetSheet === "M_OUT" ? (mOut?.id || mIn?.id) : (mIn?.id || mOut?.id);
        const targetRow = alignedRow;

        let targetField = null;
        if (errTypeUpper.includes("COMMISSION") || err.description?.toLowerCase().includes("commission")) {
            targetField = "commission";
        } else if (errTypeUpper.includes("AMOUNT") || err.description?.toLowerCase().includes("amount") || err.description?.toLowerCase().includes("variance")) {
            targetField = "amount";
        } else if (errTypeUpper.includes("BRANCH") || err.description?.toLowerCase().includes("branch")) {
            targetField = targetSheet === "M_IN" ? "toBranch" : "fromBranch";
        }

        return {
            ...err,
            id: String(err.id),
            reconciliationName: recMeta?.reconciliationName || `Reconciliation #${recId}`,
            transactionId: mIn?.id || mOut?.id || null,
            counterpartTransactionId: mOut?.id || mIn?.id || null,
            targetSheet,
            targetTxnId: targetTxnId ? Number(targetTxnId) : null,
            targetRow: targetRow ? Number(targetRow) : null,
            rowNumber: alignedRow,
            rowDisplay,
            targetField,
            mInRow: alignedRow,
            mOutRow: alignedRow,
            mInTransaction: mIn,
            mOutTransaction: mOut,
            transactionInfo,
            resolutionNotes: err.status === "RESOLVED" ? "Manual exception sign-off completed." : null
        };
    }).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return Number(b.id) - Number(a.id);
    });
}

/**
 * 11. ALL ERRORS: Cross-batch exception center list
 */
export async function getAllErrors(filter = {}) {
    const recs = await request("/reconciliations").catch(() => []);
    if (!Array.isArray(recs)) return [];

    const recNameMap = new Map();
    recs.forEach((r) => {
        const meta = getStoredMeta(r.id);
        const name = meta?.reconciliationName || (r.reconciliationCode ? `Reconciliation (${r.reconciliationCode})` : `Reconciliation #${r.id}`);
        recNameMap.set(Number(r.id), name);
    });

    const allErrorsArrays = await Promise.all(
        recs.map((r) => getReconciliationErrors(r.id, filter.status === "ALL" ? null : filter.status))
    );

    const merged = allErrorsArrays.flat();

    merged.forEach((err) => {
        if (recNameMap.has(Number(err.reconciliationId))) {
            const actualName = recNameMap.get(Number(err.reconciliationId));
            if (actualName && (!err.reconciliationName || err.reconciliationName.startsWith("Reconciliation #"))) {
                err.reconciliationName = actualName;
            }
        }
    });

    const sorted = merged.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return Number(b.id) - Number(a.id);
    });

    return sorted.filter((err) => {
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
 * 11b. ERROR SUMMARIES: Retrieve summary records grouped by reconciliation, mirroring Audit History
 */
export async function getErrorSummaries(filter = {}) {
    const recs = await request("/reconciliations").catch(() => []);
    if (!Array.isArray(recs)) return [];

    const authUser = getActiveAuthUser();
    const defaultUsername = authUser?.username || "local-user";

    const errorPromises = recs.map(async (rec) => {
        const recId = Number(rec.id);
        const meta = getStoredMeta(recId);
        const recName = meta?.reconciliationName || rec.reconciliationName || (rec.reconciliationCode ? `Reconciliation (${rec.reconciliationCode})` : `Reconciliation #${recId}`);
        const user = rec.createdByUsername || defaultUsername;

        const errors = await getReconciliationErrors(recId).catch(() => []);
        if (!Array.isArray(errors) || errors.length === 0) {
            return null;
        }

        const openErrors = errors.filter((e) => e.status === "OPEN");
        const resolvedErrors = errors.filter((e) => e.status === "RESOLVED");

        const sortedErrors = [...errors].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            return Number(b.id) - Number(a.id);
        });

        const latest = sortedErrors[0];

        return {
            groupKey: `rec_${recId}`,
            reconciliationId: recId,
            reconciliationCode: rec.reconciliationCode,
            reconciliationName: recName,
            user: user,
            totalErrors: errors.length,
            openErrorsCount: openErrors.length,
            resolvedErrorsCount: resolvedErrors.length,
            latestTimestamp: latest?.createdAt || rec.updatedAt || rec.createdAt,
            latestErrorType: latest?.errorType || "ERROR",
            latestDescription: latest?.description || "Reconciliation discrepancy identified",
            latestTransactionInfo: latest?.transactionInfo || "—",
            status: openErrors.length > 0 ? "OPEN" : "RESOLVED"
        };
    });

    const groups = (await Promise.all(errorPromises)).filter(Boolean);

    // Default order: newest first
    const sorted = groups.sort((a, b) => {
        const timeA = a.latestTimestamp ? new Date(a.latestTimestamp).getTime() : 0;
        const timeB = b.latestTimestamp ? new Date(b.latestTimestamp).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.reconciliationId) || 0) - (Number(a.reconciliationId) || 0);
    });

    return sorted.filter((group) => {
        if (filter.status && filter.status !== "ALL") {
            if (filter.status === "OPEN" && group.openErrorsCount === 0) return false;
            if (filter.status === "RESOLVED" && group.openErrorsCount > 0) return false;
        }
        if (filter.errorType && filter.errorType !== "ALL" && String(group.latestErrorType).toUpperCase() !== String(filter.errorType).toUpperCase()) {
            return false;
        }
        if (filter.search) {
            const q = filter.search.toLowerCase();
            return (
                group.reconciliationName?.toLowerCase().includes(q) ||
                group.reconciliationCode?.toLowerCase().includes(q) ||
                group.user?.toLowerCase().includes(q) ||
                group.latestErrorType?.toLowerCase().includes(q) ||
                group.latestDescription?.toLowerCase().includes(q)
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
    const authUser = getActiveAuthUser();
    return {
        ...resolved,
        id: String(resolved?.id || errorId),
        resolutionNotes,
        resolvedBy: authUser?.username || "local-user"
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
    let logs = pageData?.content || (Array.isArray(pageData) ? pageData : []);

    // If there are more pages (e.g. reconciliations with > 100 audit entries), fetch all remaining pages
    if (pageData && pageData.totalPages && pageData.totalPages > 1) {
        const remainingPromises = [];
        for (let p = 1; p < pageData.totalPages; p++) {
            let pQuery = `?page=${p}&size=100&sortBy=createdAt&direction=DESC`;
            if (params.reconciliationId) {
                pQuery += `&reconciliationId=${encodeURIComponent(params.reconciliationId)}`;
            }
            if (params.action && params.action !== "ALL") {
                pQuery += `&action=${encodeURIComponent(params.action)}`;
            }
            remainingPromises.push(request(`/audit-logs${pQuery}`));
        }
        const extraPages = await Promise.all(remainingPromises);
        extraPages.forEach((p) => {
            if (p?.content && Array.isArray(p.content)) {
                logs = logs.concat(p.content);
            }
        });
    }

    const authUser = getActiveAuthUser();
    const defaultUsername = authUser?.username || "local-user";

    const mapped = logs.map((log) => {
        const recMeta = log.reconciliationId ? getStoredMeta(log.reconciliationId) : null;
        return {
            id: log.id,
            reconciliationId: log.reconciliationId,
            reconciliationName: recMeta?.reconciliationName || (log.reconciliationId ? `Reconciliation #${log.reconciliationId}` : "System Audit"),
            action: log.action,
            fieldName: log.fieldName,
            entity: log.transactionId ? "Transaction" : "Reconciliation",
            entityId: String(log.transactionId || log.reconciliationId || log.id),
            transactionId: log.transactionId,
            user: log.username || defaultUsername,
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

/**
 * 14. AUDIT LOG SUMMARIES: Retrieve dynamic summary record for every reconciliation with audit history
 */
export async function getAuditLogSummaries(params = {}) {
    let query = "";
    if (params.action && params.action !== "ALL") {
        query += `?action=${encodeURIComponent(params.action)}`;
    }

    const [summaries, recs, branches] = await Promise.all([
        request(`/audit-logs/summaries${query}`).catch(() => []),
        request("/reconciliations").catch(() => []),
        getBranches().catch(() => [])
    ]);

    const branchCodeMap = new Map();
    (branches || []).forEach((b) => {
        if (b.id) branchCodeMap.set(String(b.id), b.code || b.name);
        if (b.name) branchCodeMap.set(b.name.trim().toLowerCase(), b.code || b.name);
        if (b.code) branchCodeMap.set(b.code.trim().toLowerCase(), b.code);
    });

    const formatComposite = (val) => {
        if (!val || val === "—") return "—";
        const strVal = String(val).trim();
        if (strVal.includes("fromBranchId=") || strVal.includes("toBranchId=")) {
            const pairs = {};
            strVal.split(",").forEach((part) => {
                const idx = part.indexOf("=");
                if (idx !== -1) {
                    pairs[part.substring(0, idx).trim()] = part.substring(idx + 1).trim();
                }
            });
            const sheet = pairs.sourceSheet ? (pairs.sourceSheet === "M_IN" ? "M In" : "M Out") : "";
            const fromCode = branchCodeMap.get(String(pairs.fromBranchId)) || `Branch #${pairs.fromBranchId}`;
            const toCode = branchCodeMap.get(String(pairs.toBranchId)) || `Branch #${pairs.toBranchId}`;
            const amt = pairs.amount ? `₹${Number(pairs.amount).toLocaleString("en-IN")}` : "";
            const comm = pairs.commission ? `Comm: ₹${Number(pairs.commission).toLocaleString("en-IN")}` : "";
            return [sheet, `${fromCode} → ${toCode}`, amt, comm].filter(Boolean).join(" ");
        }
        return val;
    };

    const recNameMap = new Map();
    (recs || []).forEach((r) => {
        const meta = getStoredMeta(r.id);
        const resolvedName = meta?.reconciliationName || (r.reconciliationCode ? `Reconciliation ${r.reconciliationCode}` : `Reconciliation #${r.id}`);
        recNameMap.set(Number(r.id), resolvedName);
    });

    const list = Array.isArray(summaries) ? summaries : [];
    const authUser = getActiveAuthUser();
    const defaultUsername = authUser?.username || "local-user";

    const mapped = list.map((item) => {
        const recId = item.reconciliationId ? Number(item.reconciliationId) : null;
        const recName = recId && recNameMap.has(recId)
            ? recNameMap.get(recId)
            : (item.reconciliationName || (recId ? `Reconciliation #${recId}` : "System Audit"));

        return {
            groupKey: recId ? `rec_${recId}` : `event_${item.reconciliationCode || Math.random()}`,
            reconciliationId: recId,
            reconciliationCode: item.reconciliationCode,
            reconciliationName: recName,
            totalRecords: Number(item.totalRecords || 0),
            latestTimestamp: item.latestTimestamp,
            user: item.latestUsername || defaultUsername,
            action: item.latestAction,
            oldValue: formatComposite(item.latestOldValue) || "—",
            newValue: formatComposite(item.latestNewValue) || "—",
            description: item.latestDescription || `${item.latestAction || "Action"} executed`
        };
    });

    // Default order: newest first
    const sorted = mapped.sort((a, b) => {
        const timeA = a.latestTimestamp ? new Date(a.latestTimestamp).getTime() : 0;
        const timeB = b.latestTimestamp ? new Date(b.latestTimestamp).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.reconciliationId) || 0) - (Number(a.reconciliationId) || 0);
    });

    if (params.search) {
        const q = params.search.toLowerCase();
        return sorted.filter((s) =>
            s.reconciliationName?.toLowerCase().includes(q) ||
            s.user?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.action?.toLowerCase().includes(q)
        );
    }

    return sorted;
}