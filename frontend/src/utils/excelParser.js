import * as XLSX from "xlsx";

/**
 * Utility to format byte size nicely
 */
export function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Dynamically resolves raw text or number to a branch from active branch list
 * or extracts the exact branch name directly from the Excel cell.
 */
export function resolveBranch(rawVal, branches = []) {
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === "") {
        return { id: null, name: "Unknown", code: "UNK", isValid: false, isUnknown: true };
    }

    const trimmed = String(rawVal).trim();
    const strLower = trimmed.toLowerCase();
    const num = Number(rawVal);

    // 1. Match by numeric ID against existing active branches
    if (!isNaN(num) && num > 0) {
        const byId = branches.find((b) => Number(b.id) === num);
        if (byId) return { id: byId.id, name: byId.code || byId.name, code: byId.code, fullName: byId.name, isValid: true, isUnknown: false };
    }

    // 2. Exact match by code or name against existing branches (case-insensitive)
    const exact = branches.find(
        (b) => (b.name && b.name.trim().toLowerCase() === strLower) ||
               (b.code && b.code.trim().toLowerCase() === strLower)
    );
    if (exact) {
        return { id: exact.id, name: exact.code || exact.name, code: exact.code, fullName: exact.name, isValid: true, isUnknown: false };
    }

    // 3. Not found in database branches: Mark as invalid / unknown
    const cleanCode = trimmed.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 10) || trimmed.slice(0, 10).toUpperCase();

    return {
        id: null,
        name: trimmed,
        code: cleanCode,
        isValid: false,
        isUnknown: true
    };
}

/**
 * Cleans string/number to positive currency amount
 */
function cleanNumeric(val, fallback = 0) {
    if (typeof val === "number") {
        return isNaN(val) ? fallback : Math.abs(val);
    }
    if (!val) return fallback;
    const cleaned = String(val).replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : Math.abs(parsed);
}

/**
 * Detect column indexes from a header row
 */
function detectColumns(headers = [], isMIn = true) {
    let amountCol = -1;
    let commCol = -1;
    let dateCol = -1;

    // 1. Detect Amount, Commission, Date
    headers.forEach((h, idx) => {
        const text = String(h || "").trim().toLowerCase();
        if (amountCol === -1 && (text.includes("amount") || text.includes("amt") || text.includes("total") || text.includes("value"))) {
            amountCol = idx;
        } else if (commCol === -1 && (text.includes("comm") || text.includes("fee") || text.includes("charge") || text.includes("brokerage"))) {
            commCol = idx;
        } else if (dateCol === -1 && (text.includes("date") || text.includes("time") || text.includes("dt"))) {
            dateCol = idx;
        }
    });

    // 2. Identify Branch columns among the remaining candidate columns
    let fromCol = -1;
    let toCol = -1;
    const genericBranchCols = [];

    headers.forEach((h, idx) => {
        if (idx === amountCol || idx === commCol || idx === dateCol) return;
        const text = String(h || "").trim().toLowerCase();
        const hasFrom = text.includes("from") || text.includes("source") || text.includes("origin");
        const hasTo = text.includes("to") || text.includes("dest");
        const hasBranch = text.includes("branch") || text.includes("hub") || text.includes("city") || text.includes("location");

        if (hasFrom && !hasTo) {
            fromCol = idx;
        } else if (hasTo && !hasFrom) {
            toCol = idx;
        } else if (hasBranch || text !== "") {
            genericBranchCols.push(idx);
        }
    });

    let branch1Col;
    let branch2Col;

    // Pattern 1: One generic 'BRANCH' and one 'To BRANCH' or 'From BRANCH'
    if (genericBranchCols.length > 0 && (toCol !== -1 || fromCol !== -1)) {
        branch1Col = genericBranchCols[0];
        branch2Col = toCol !== -1 ? toCol : fromCol;
    }
    // Pattern 2: Explicit 'From Branch' and 'To Branch'
    else if (fromCol !== -1 && toCol !== -1) {
        if (isMIn) {
            branch1Col = toCol;   // UI 'BRANCH' (destination)
            branch2Col = fromCol; // UI 'From BRANCH' (source)
        } else {
            branch1Col = fromCol; // UI 'BRANCH' (source)
            branch2Col = toCol;   // UI 'To BRANCH' (destination)
        }
    }
    // Pattern 3: Multiple generic branch columns
    else if (genericBranchCols.length >= 2) {
        branch1Col = genericBranchCols[0];
        branch2Col = genericBranchCols[1];
    }
    // Pattern 4: Positional fallback
    else {
        const remaining = headers.map((_, i) => i).filter((i) => i !== amountCol && i !== commCol && i !== dateCol);
        branch1Col = remaining[0] !== undefined ? remaining[0] : 0;
        branch2Col = remaining[1] !== undefined ? remaining[1] : 1;
    }

    // Fallbacks
    if (amountCol === -1) amountCol = 2;
    if (commCol === -1) commCol = 3;
    if (branch1Col === branch2Col) {
        branch2Col = branch1Col === 0 ? 1 : 0;
    }

    return { branch1Col, branch2Col, amountCol, commCol, dateCol };
}

/**
 * Parse rows of a single worksheet
 */
function parseSheetRows(worksheet, sheetType, branches, reconciliationId) {
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (!rawData || rawData.length === 0) return { rows: [], warnings: 0, invalidBranchErrors: [] };

    // Find header row or first data row
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawData.length, 5); i++) {
        const line = rawData[i].map((c) => String(c).toLowerCase());
        if (line.some((c) => c.includes("branch") || c.includes("amount") || c.includes("amt") || c.includes("comm"))) {
            headerRowIdx = i;
            break;
        }
    }

    const isMIn = sheetType === "M_IN";
    const headerRow = headerRowIdx !== -1 ? rawData[headerRowIdx] : [];
    const cols = detectColumns(headerRow, isMIn);
    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

    const parsed = [];
    let warnings = 0;
    const invalidBranchErrors = [];

    for (let r = startRow; r < rawData.length; r++) {
        const row = rawData[r];
        if (!row || row.length === 0 || row.every((c) => String(c).trim() === "")) {
            continue; // Skip empty rows
        }

        const rawBranch1 = row[cols.branch1Col];
        const rawBranch2 = row[cols.branch2Col];
        const rawAmt = row[cols.amountCol];
        const rawComm = cols.commCol !== -1 ? row[cols.commCol] : 0;

        const amount = cleanNumeric(rawAmt, 0);
        const commission = cleanNumeric(rawComm, 0);

        if (amount <= 0) {
            warnings++;
            continue; // Skip invalid or zero amount
        }

        let fromBranch;
        let toBranch;

        if (isMIn) {
            // M In: Col 1 in UI is BRANCH (destination receiving money), Col 2 in UI is From BRANCH (source origin)
            toBranch = resolveBranch(rawBranch1, branches);
            fromBranch = resolveBranch(rawBranch2, branches);
        } else {
            // M Out: Col 1 in UI is BRANCH (source origin sending money), Col 2 in UI is To BRANCH (destination)
            fromBranch = resolveBranch(rawBranch1, branches);
            toBranch = resolveBranch(rawBranch2, branches);
        }

        const displaySheetName = isMIn ? "M In" : "M Out";
        const excelRowNum = r + 1;

        if (!fromBranch.isValid) {
            invalidBranchErrors.push({
                sheet: displaySheetName,
                row: excelRowNum,
                direction: "From Branch",
                branchName: fromBranch.name,
                message: `[${displaySheetName} Row ${excelRowNum}] From Branch '${fromBranch.name}' does not exist in the database.`
            });
        }
        if (!toBranch.isValid) {
            invalidBranchErrors.push({
                sheet: displaySheetName,
                row: excelRowNum,
                direction: "To Branch",
                branchName: toBranch.name,
                message: `[${displaySheetName} Row ${excelRowNum}] To Branch '${toBranch.name}' does not exist in the database.`
            });
        }

        parsed.push({
            id: `temp-${sheetType}-${parsed.length + 1}-${Date.now()}`,
            reconciliationId: Number(reconciliationId),
            sourceSheet: sheetType,
            sourceRow: excelRowNum,
            fromBranchId: fromBranch.id,
            fromBranchName: fromBranch.code || fromBranch.name,
            fromBranchCode: fromBranch.code,
            fromBranchValid: fromBranch.isValid,
            toBranchId: toBranch.id,
            toBranchName: toBranch.code || toBranch.name,
            toBranchCode: toBranch.code,
            toBranchValid: toBranch.isValid,
            amount: amount,
            commission: commission,
            status: "PENDING",
            matchedTransactionId: null,
            matchDetails: null,
            isNew: true
        });
    }

    return { rows: parsed, warnings, invalidBranchErrors };
}

/**
 * Main parser function: accepts real File object and returns structured preview payload
 */
export async function parseExcelWorkbook(file, branches = [], reconciliationId = 1) {
    if (!file) {
        throw new Error("No file selected.");
    }

    if (file.size === 0) {
        throw new Error("The selected file is empty (0 bytes). Please select a valid Excel workbook.");
    }

    const nameParts = file.name.split(".");
    const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
    const allowed = ["xlsx", "xls", "csv"];

    if (!allowed.includes(ext)) {
        throw new Error(`Unsupported file format (.${ext || "unknown"}). Supported formats are .xlsx, .xls, and .csv.`);
    }

    const buffer = await file.arrayBuffer();
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: "array" });
    } catch (readErr) {
        throw new Error(`Failed to read Excel workbook: ${readErr.message}`, { cause: readErr });
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("The workbook contains no sheets.");
    }

    const sheetNames = workbook.SheetNames;
    let mInSheetName = null;
    let mOutSheetName = null;

    // Detect sheet names by pattern
    for (const sName of sheetNames) {
        const clean = sName.trim().toLowerCase().replace(/[-_\s]/g, "");
        if (
            clean === "min" ||
            clean === "in" ||
            clean === "incoming" ||
            clean.startsWith("min") ||
            (clean.includes("in") && !clean.includes("out") && !clean.includes("print") && !clean.includes("info"))
        ) {
            if (!mInSheetName) mInSheetName = sName;
        } else if (
            clean === "mout" ||
            clean === "out" ||
            clean === "outgoing" ||
            clean.startsWith("mout") ||
            clean.includes("out")
        ) {
            if (!mOutSheetName) mOutSheetName = sName;
        }
    }

    let mInTransactions;
    let mOutTransactions;
    let totalWarnings;
    let invalidBranchErrors = [];

    if (mInSheetName && mOutSheetName) {
        const inRes = parseSheetRows(workbook.Sheets[mInSheetName], "M_IN", branches, reconciliationId);
        const outRes = parseSheetRows(workbook.Sheets[mOutSheetName], "M_OUT", branches, reconciliationId);
        mInTransactions = inRes.rows;
        mOutTransactions = outRes.rows;
        totalWarnings = inRes.warnings + outRes.warnings;
        invalidBranchErrors = [...inRes.invalidBranchErrors, ...outRes.invalidBranchErrors];
    } else if (sheetNames.length >= 2) {
        // Fallback: first sheet M_IN, second sheet M_OUT
        const inRes = parseSheetRows(workbook.Sheets[sheetNames[0]], "M_IN", branches, reconciliationId);
        const outRes = parseSheetRows(workbook.Sheets[sheetNames[1]], "M_OUT", branches, reconciliationId);
        mInTransactions = inRes.rows;
        mOutTransactions = outRes.rows;
        totalWarnings = inRes.warnings + outRes.warnings;
        invalidBranchErrors = [...inRes.invalidBranchErrors, ...outRes.invalidBranchErrors];
    } else {
        // Single sheet (e.g., CSV or single workbook sheet)
        const singleSheet = workbook.Sheets[sheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(singleSheet, { header: 1, defval: "" });

        // Check if there is a 'sheet' or 'source' column
        let sheetColIdx = -1;
        if (rawData.length > 0) {
            const firstLine = rawData[0].map((c) => String(c).toLowerCase());
            sheetColIdx = firstLine.findIndex((c) => c.includes("sheet") || c.includes("source") || c.includes("type"));
        }

        if (sheetColIdx !== -1) {
            const fullRes = parseSheetRows(singleSheet, "M_IN", branches, reconciliationId);
            // Partition based on row's source marker
            const inList = [];
            const outList = [];
            fullRes.rows.forEach((r, idx) => {
                const rawRow = rawData[idx + 1] || [];
                const marker = String(rawRow[sheetColIdx] || "").trim().toLowerCase();
                if (marker.includes("out")) {
                    outList.push({ ...r, sourceSheet: "M_OUT", sourceRow: outList.length + 1 });
                } else {
                    inList.push({ ...r, sourceSheet: "M_IN", sourceRow: inList.length + 1 });
                }
            });
            mInTransactions = inList;
            mOutTransactions = outList;
            totalWarnings = fullRes.warnings;
            invalidBranchErrors = fullRes.invalidBranchErrors;
        } else {
            // Default single sheet to M_IN
            const inRes = parseSheetRows(singleSheet, "M_IN", branches, reconciliationId);
            mInTransactions = inRes.rows;
            mOutTransactions = [];
            totalWarnings = inRes.warnings;
            invalidBranchErrors = inRes.invalidBranchErrors;
        }
    }

    const allTxns = [...mInTransactions, ...mOutTransactions];

    if (allTxns.length === 0) {
        throw new Error(
            "No valid transaction rows found in the selected Excel file. Please ensure the workbook has numeric amounts and branch names."
        );
    }

    const validTxns = allTxns.filter((t) => t.fromBranchValid && t.toBranchValid);

    return {
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        totalRows: allTxns.length,
        mInCount: mInTransactions.length,
        mOutCount: mOutTransactions.length,
        validCount: validTxns.length,
        warningCount: totalWarnings,
        errorCount: invalidBranchErrors.length,
        invalidBranchErrors: invalidBranchErrors,
        transactions: allTxns,
        sampleMIns: mInTransactions.slice(0, 4),
        sampleMOuts: mOutTransactions.slice(0, 4)
    };
}
