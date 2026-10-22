import * as XLSX from "xlsx";
import { getTransactionsByReconciliation, getReconciliationResults, getBranches } from "../services/api.js";
import { buildAlignedSlots } from "./alignmentUtils.js";

/**
 * Generates a SheetJS workbook for a specific reconciliation, preserving
 * the exact aligned row arrangement of the M In and M Out tables post-reconciliation.
 *
 * Layout:
 * - Two separate tables side-by-side in one worksheet named "M In-Out"
 * - Column alignment matching the application:
 *   M In:  # | ST | BRANCH | FROM BRANCH | AMOUNT (₹) | COMMISSION (₹)
 *   M Out: # | ST | BRANCH | TO BRANCH   | AMOUNT (₹) | COMMISSION (₹)
 *
 * @param {Object} reconciliation The reconciliation metadata object
 * @param {Object} options Optional pre-fetched transactions, results, branches
 * @returns {Object} SheetJS workbook
 */
export async function generateReconciliationWorkbook(reconciliation, options = {}) {
    if (!reconciliation || !reconciliation.id) {
        throw new Error("Invalid reconciliation record provided for export.");
    }

    const recId = Number(reconciliation.id);

    // 1. Fetch transactions, results, and branch directory if not supplied
    let { transactions, results, branches } = options;

    if (!transactions) {
        transactions = await getTransactionsByReconciliation(recId);
    }
    if (!results) {
        results = await getReconciliationResults(recId).catch(() => []);
    }
    if (!branches) {
        branches = await getBranches().catch(() => []);
    }

    // 2. Build fast branch lookup map
    const branchMap = new Map();
    (branches || []).forEach((b) => {
        if (!b) return;
        if (b.id !== undefined && b.id !== null) {
            branchMap.set(String(b.id), b.code || b.name || "");
        }
        if (b.name) {
            branchMap.set(b.name.trim().toLowerCase(), b.code || b.name);
        }
        if (b.code) {
            branchMap.set(b.code.trim().toLowerCase(), b.code);
        }
    });

    const resolveCode = (id, directCode, directName) => {
        if (directCode && String(directCode).trim()) return String(directCode).trim();
        if (directName && String(directName).trim()) {
            const mapped = branchMap.get(String(directName).trim().toLowerCase());
            if (mapped) return mapped;
            return String(directName).trim();
        }
        if (id && branchMap.has(String(id))) {
            return branchMap.get(String(id));
        }
        return "";
    };

    // 3. Separate and sort M In and M Out rows
    const ins = (transactions || [])
        .filter((t) => t.sourceSheet === "M_IN")
        .sort((a, b) => (Number(a.sourceRow) || 0) - (Number(b.sourceRow) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));

    const outs = (transactions || [])
        .filter((t) => t.sourceSheet === "M_OUT")
        .sort((a, b) => (Number(a.sourceRow) || 0) - (Number(b.sourceRow) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));

    // 4. Determine alignment: use buildAlignedSlots to match the application's exact arrangement
    const isReconciled =
        (results && results.length > 0) ||
        (transactions || []).some((t) => t.status && t.status !== "PENDING");

    let slots = [];
    if (isReconciled) {
        slots = buildAlignedSlots(ins, outs, results);
    } else {
        const maxLen = Math.max(ins.length, outs.length);
        for (let i = 0; i < maxLen; i++) {
            slots.push({
                slotRow: i + 1,
                displayIndex: i + 1,
                mIn: ins[i] || null,
                mOut: outs[i] || null
            });
        }
    }

    // 5. Construct Table Rows for Worksheet "M In-Out"
    // Row 1: Section Title Banners
    // Row 2: Column Headers
    // Row 3..N+2: Aligned Transaction Rows
    // Row N+3: Totals Row
    const aoa = [];

    // Header 1: Table Names
    aoa.push([
        "M IN TRANSACTIONS", "", "", "", "", "",
        "", // Gap / Separator column
        "M OUT TRANSACTIONS", "", "", "", "", ""
    ]);

    // Header 2: Column Names matching application table headers
    aoa.push([
        "#", "ST", "BRANCH", "FROM BRANCH", "AMOUNT (₹)", "COMMISSION (₹)",
        "", // Separator column
        "#", "ST", "BRANCH", "TO BRANCH", "AMOUNT (₹)", "COMMISSION (₹)"
    ]);

    let totalMInAmount = 0;
    let totalMInCommission = 0;
    let totalMOutAmount = 0;
    let totalMOutCommission = 0;

    slots.forEach((slot) => {
        const rowNum = slot.slotRow;
        const mIn = slot.mIn;
        const mOut = slot.mOut;

        // M In Fields (In table: BRANCH = toBranch, FROM BRANCH = fromBranch)
        let inStatus = "";
        let inBranch = "";
        let inFromBranch = "";
        let inAmount = "";
        let inComm = "";

        if (mIn) {
            inStatus = mIn.status || "PENDING";
            inBranch = resolveCode(mIn.toBranchId, mIn.toBranchCode, mIn.toBranchName);
            inFromBranch = resolveCode(mIn.fromBranchId, mIn.fromBranchCode, mIn.fromBranchName);
            const rawAmt = Number(mIn.amount);
            if (!isNaN(rawAmt)) {
                inAmount = rawAmt;
                totalMInAmount += rawAmt;
            }
            const rawComm = Number(mIn.commission);
            if (!isNaN(rawComm)) {
                inComm = rawComm;
                totalMInCommission += rawComm;
            } else {
                inComm = 0;
            }
        } else {
            inStatus = "—";
            inBranch = "—";
            inFromBranch = "—";
        }

        // M Out Fields (In table: BRANCH = fromBranch, TO BRANCH = toBranch)
        let outStatus = "";
        let outBranch = "";
        let outToBranch = "";
        let outAmount = "";
        let outComm = "";

        if (mOut) {
            outStatus = mOut.status || "PENDING";
            outBranch = resolveCode(mOut.fromBranchId, mOut.fromBranchCode, mOut.fromBranchName);
            outToBranch = resolveCode(mOut.toBranchId, mOut.toBranchCode, mOut.toBranchName);
            const rawAmt = Number(mOut.amount);
            if (!isNaN(rawAmt)) {
                outAmount = rawAmt;
                totalMOutAmount += rawAmt;
            }
            const rawComm = Number(mOut.commission);
            if (!isNaN(rawComm)) {
                outComm = rawComm;
                totalMOutCommission += rawComm;
            } else {
                outComm = 0;
            }
        } else {
            outStatus = "—";
            outBranch = "—";
            outToBranch = "—";
        }

        aoa.push([
            rowNum,
            inStatus,
            inBranch,
            inFromBranch,
            inAmount,
            inComm,
            "", // Separator
            rowNum,
            outStatus,
            outBranch,
            outToBranch,
            outAmount,
            outComm
        ]);
    });

    // Totals Row
    aoa.push([
        "TOTAL",
        "",
        "",
        "",
        totalMInAmount,
        totalMInCommission,
        "", // Separator
        "TOTAL",
        "",
        "",
        "",
        totalMOutAmount,
        totalMOutCommission
    ]);

    // 6. Create SheetJS sheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set merges for Row 1 titles (A1..F1 and H1..M1)
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // M IN TRANSACTIONS
        { s: { r: 0, c: 7 }, e: { r: 0, c: 12 } } // M OUT TRANSACTIONS
    ];

    // Set column widths
    ws["!cols"] = [
        { wch: 6 },  // A: M In #
        { wch: 15 }, // B: M In ST
        { wch: 14 }, // C: M In BRANCH
        { wch: 16 }, // D: M In FROM BRANCH
        { wch: 18 }, // E: M In AMOUNT (₹)
        { wch: 18 }, // F: M In COMMISSION (₹)
        { wch: 4 },  // G: [Separator]
        { wch: 6 },  // H: M Out #
        { wch: 15 }, // I: M Out ST
        { wch: 14 }, // J: M Out BRANCH
        { wch: 16 }, // K: M Out TO BRANCH
        { wch: 18 }, // L: M Out AMOUNT (₹)
        { wch: 18 }  // M: M Out COMMISSION (₹)
    ];

    // Apply number formats to currency columns
    const totalDataRows = slots.length;
    for (let r = 2; r < 2 + totalDataRows + 1; r++) {
        // E: M In Amount, F: M In Comm
        const cellE = XLSX.utils.encode_cell({ r, c: 4 });
        if (ws[cellE] && typeof ws[cellE].v === "number") {
            ws[cellE].z = "#,##0.00";
        }
        const cellF = XLSX.utils.encode_cell({ r, c: 5 });
        if (ws[cellF] && typeof ws[cellF].v === "number") {
            ws[cellF].z = "#,##0.00";
        }

        // L: M Out Amount, M: M Out Comm
        const cellL = XLSX.utils.encode_cell({ r, c: 11 });
        if (ws[cellL] && typeof ws[cellL].v === "number") {
            ws[cellL].z = "#,##0.00";
        }
        const cellM = XLSX.utils.encode_cell({ r, c: 12 });
        if (ws[cellM] && typeof ws[cellM].v === "number") {
            ws[cellM].z = "#,##0.00";
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "M In-Out");

    return wb;
}

/**
 * High-level Export Module handler.
 * Fetches transactions for the given reconciliation, creates the aligned .xlsx,
 * and triggers immediate local file download in the user's browser.
 *
 * @param {Object} reconciliation The reconciliation record
 * @param {Object} options Optional preloaded transactions/results/branches
 * @returns {Promise<string>} The generated filename
 */
export async function exportReconciliationToExcel(reconciliation, options = {}) {
    const wb = await generateReconciliationWorkbook(reconciliation, options);

    const safeName = (reconciliation.reconciliationName || `Reconciliation_${reconciliation.id}`)
        .replace(/[/\\?%*:|"<>]/g, "-")
        .trim();

    const fileName = `${safeName}_Transactions_M_In-Out.xlsx`;

    // Direct browser file download via SheetJS
    XLSX.writeFile(wb, fileName);

    return fileName;
}
