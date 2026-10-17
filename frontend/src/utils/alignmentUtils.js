/**
 * alignmentUtils.js
 *
 * Provides single-source-of-truth row alignment for the YesCapital
 * Transaction Reconciliation Workspace and Errors Tab.
 *
 * In this system, matching M In and M Out transactions are aligned
 * on the exact same row number (slotRow = 1, 2, 3...), and missing
 * counterparts receive empty slots on the reciprocal sheet.
 */

/**
 * Builds aligned slots from sorted M In and M Out transaction lists.
 * Matching transactions appear in the same slot (identical row index).
 * Unmatched M Out transactions are appended as trailing slots.
 *
 * @param {Array} mInRows Sorted M In transactions
 * @param {Array} mOutRows Sorted M Out transactions
 * @param {Array} results Optional reconciliation results for explicit match pairing
 * @returns {Array} Array of { slotRow, displayIndex, mIn, mOut }
 */
export function buildAlignedSlots(mInRows = [], mOutRows = [], results = []) {
    const mOutMap = new Map();
    (mOutRows || []).forEach((r) => {
        if (r && r.id !== undefined && r.id !== null) {
            mOutMap.set(Number(r.id), r);
        }
    });

    const resultByInMap = new Map();
    const resultByOutMap = new Map();
    (results || []).forEach((res) => {
        if (res.mInTransactionId) resultByInMap.set(Number(res.mInTransactionId), res);
        if (res.mOutTransactionId) resultByOutMap.set(Number(res.mOutTransactionId), res);
    });

    const usedMOutIds = new Set();
    const slots = [];

    // 1. Walk through M In rows in sequential order
    (mInRows || []).forEach((inRow) => {
        let matchedOut = null;
        let matchId = inRow.matchedTransactionId
            ? Number(inRow.matchedTransactionId)
            : (inRow.matchDetails?.counterpartId ? Number(inRow.matchDetails.counterpartId) : null);

        // Check explicit match from results
        if (!matchId && resultByInMap.has(Number(inRow.id))) {
            const r = resultByInMap.get(Number(inRow.id));
            if (r.mOutTransactionId) {
                matchId = Number(r.mOutTransactionId);
            }
        }

        if (matchId && mOutMap.has(matchId) && !usedMOutIds.has(matchId)) {
            matchedOut = mOutMap.get(matchId);
            usedMOutIds.add(matchId);
        }

        // Fallback for route/amount match if matchId wasn't stored
        if (!matchedOut && inRow.status === "MATCHED") {
            const candidate = (mOutRows || []).find((out) =>
                !usedMOutIds.has(Number(out.id)) &&
                Number(out.amount) === Number(inRow.amount) &&
                (out.status === "MATCHED" || !out.status || out.status === "PENDING") &&
                String(out.toBranchId) === String(inRow.fromBranchId) &&
                String(out.fromBranchId) === String(inRow.toBranchId)
            );
            if (candidate) {
                matchedOut = candidate;
                usedMOutIds.add(Number(candidate.id));
            }
        }

        const slotRow = slots.length + 1;
        slots.push({
            slotRow,
            displayIndex: slotRow,
            mIn: inRow,
            mOut: matchedOut || null
        });
    });

    // 2. Append any remaining unmatched M Out rows
    (mOutRows || []).forEach((outRow) => {
        const outId = Number(outRow.id);
        if (!usedMOutIds.has(outId)) {
            const slotRow = slots.length + 1;
            slots.push({
                slotRow,
                displayIndex: slotRow,
                mIn: null,
                mOut: outRow
            });
        }
    });

    return slots;
}

/**
 * Computes a lookup map from transaction IDs and result IDs to their
 * 1-based aligned row number in the workspace spreadsheet.
 *
 * @param {Array} txns All transactions for the batch
 * @param {Array} results All reconciliation results for the batch
 * @returns {Object} { slots, txnToRowMap, resultToRowMap, getAlignedRow }
 */
export function computeTransactionRowMap(txns = [], results = []) {
    const ins = (txns || [])
        .filter((t) => t.sourceSheet === "M_IN")
        .sort((a, b) => (Number(a.sourceRow) || 0) - (Number(b.sourceRow) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));

    const outs = (txns || [])
        .filter((t) => t.sourceSheet === "M_OUT")
        .sort((a, b) => (Number(a.sourceRow) || 0) - (Number(b.sourceRow) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));

    const slots = buildAlignedSlots(ins, outs, results);

    const txnToRowMap = new Map();
    const resultToRowMap = new Map();

    slots.forEach((slot) => {
        const row = slot.slotRow;
        if (slot.mIn && slot.mIn.id !== undefined && slot.mIn.id !== null) {
            txnToRowMap.set(Number(slot.mIn.id), row);
        }
        if (slot.mOut && slot.mOut.id !== undefined && slot.mOut.id !== null) {
            txnToRowMap.set(Number(slot.mOut.id), row);
        }
    });

    (results || []).forEach((res) => {
        if (!res || res.id === undefined || res.id === null) return;
        const resId = Number(res.id);
        if (res.mInTransactionId && txnToRowMap.has(Number(res.mInTransactionId))) {
            resultToRowMap.set(resId, txnToRowMap.get(Number(res.mInTransactionId)));
        } else if (res.mOutTransactionId && txnToRowMap.has(Number(res.mOutTransactionId))) {
            resultToRowMap.set(resId, txnToRowMap.get(Number(res.mOutTransactionId)));
        }
    });

    return {
        slots,
        txnToRowMap,
        resultToRowMap,
        getAlignedRow: (err, mIn, mOut) => {
            if (err?.reconciliationResultId) {
                const resId = Number(err.reconciliationResultId);
                if (resultToRowMap.has(resId)) {
                    return resultToRowMap.get(resId);
                }
            }
            if (mIn && txnToRowMap.has(Number(mIn.id))) {
                return txnToRowMap.get(Number(mIn.id));
            }
            if (mOut && txnToRowMap.has(Number(mOut.id))) {
                return txnToRowMap.get(Number(mOut.id));
            }
            if (err?.transactionId && txnToRowMap.has(Number(err.transactionId))) {
                return txnToRowMap.get(Number(err.transactionId));
            }
            return mIn?.sourceRow ?? mOut?.sourceRow ?? null;
        }
    };
}
