import { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { buildAlignedSlots } from "../../utils/alignmentUtils";
import {
    getBranches,
    getTransactionsByReconciliation,
    saveTransactions
} from "../../services/mockApi";
import AddRowsModal from "../modals/AddRowsModal";
import TransactionDetailModal from "../modals/TransactionDetailModal";
import ConfirmDeleteModal from "../modals/ConfirmDeleteModal";
import {
    Save,
    Plus,
    ClipboardPaste,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Search,
    ArrowRightLeft,
    Eye,
    Columns,
    FileSpreadsheet,
    Trash2,
    CheckSquare
} from "lucide-react";

const TransactionWorkspace = forwardRef(function TransactionWorkspace(
    { reconciliationId, onReconciliationUpdated, refreshSignal },
    ref
) {
    const { addToast } = useApp();
    const [searchParams, setSearchParams] = useSearchParams();

    // Synchronized scrolling and focus tracking refs
    const mInScrollRef = useRef(null);
    const mOutScrollRef = useRef(null);
    const isSyncingScroll = useRef(false);
    const lastFocusRequestRef = useRef(null);
    const scrollAnimationTimeoutRef = useRef(null);
    const alignedSlotsRef = useRef(null);

    const [mInRows, setMInRows] = useState([]);
    const [mOutRows, setMOutRows] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Active error row/cell highlight targeted from Errors tab
    const [focusedErrorTarget, setFocusedErrorTarget] = useState(null); // { txnId, sheet, field, sourceRow }

    // View Mode Switcher: "split" | "m_in" | "m_out"
    const [viewMode, setViewMode] = useState("split");

    // Progressive Disclosure: Transaction Detail Modal
    const [detailModalTxn, setDetailModalTxn] = useState(null);

    // Active selection & relationship linkage
    const [hoveredCounterpartId, setHoveredCounterpartId] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [counterpartTransactionId, setCounterpartTransactionId] = useState(null);

    // Unsaved changes tracking
    const [unsavedChanges, setUnsavedChanges] = useState(new Set()); // Set of "rowId-field" or rowIndex
    const [deletedRowIds, setDeletedRowIds] = useState(new Set()); // Set of persisted transaction IDs pending deletion

    // Search and filter
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, MATCHED, UNMATCHED, ERROR

    // Single source of truth: strictly registered database branches
    const allAvailableBranches = useMemo(() => {
        return (branches || [])
            .filter((b) => b && b.id !== undefined && b.id !== null)
            .map((b) => ({
                id: b.id,
                name: b.code || b.name || `Branch #${b.id}`,
                code: b.code || b.name || `Branch #${b.id}`,
                fullName: b.name
            }))
            .sort((a, b) => (Number(a.id) || 999) - (Number(b.id) || 999));
    }, [branches]);

    // Add rows modal
    const [addRowsModalState, setAddRowsModalState] = useState({
        isOpen: false,
        sheet: "M_IN",
        sheetTitle: "M In"
    });

    // Clipboard paste prompt fallback modal
    const [pastePromptOpen, setPastePromptOpen] = useState(false);
    const [pastePromptSheet, setPastePromptSheet] = useState("M_IN");
    const [pasteText, setPasteText] = useState("");

    const toEditableRow = (txn) => {
        const fromCode = txn.fromBranchCode || txn.fromBranchName || "";
        const toCode = txn.toBranchCode || txn.toBranchName || "";
        return {
            ...txn,
            fromBranchCode: fromCode,
            fromBranchName: fromCode,
            toBranchCode: toCode,
            toBranchName: toCode,
            amount: txn.amount !== null && txn.amount !== undefined ? String(txn.amount) : "",
            commission: txn.commission !== null && txn.commission !== undefined ? String(txn.commission) : "0",
            isNew: false,
            original: {
                fromBranchId: txn.fromBranchId,
                toBranchId: txn.toBranchId,
                fromBranchCode: fromCode,
                toBranchCode: toCode,
                amount: txn.amount !== null && txn.amount !== undefined ? String(txn.amount) : "",
                commission: txn.commission !== null && txn.commission !== undefined ? String(txn.commission) : "0"
            }
        };
    };

    const loadWorkspaceData = useCallback(async () => {
        try {
            setLoading(true);
            const [txns, branchList] = await Promise.all([
                getTransactionsByReconciliation(reconciliationId),
                getBranches()
            ]);

            setBranches(branchList || []);

            const branchMap = new Map();
            (branchList || []).forEach((b) => {
                if (b && b.id !== undefined) {
                    branchMap.set(String(b.id), b.code || b.name || "");
                }
            });

            const ins = (txns || [])
                .filter((t) => t.sourceSheet === "M_IN")
                .sort((a, b) => (a.sourceRow || 0) - (b.sourceRow || 0))
                .map((t) => {
                    const row = toEditableRow(t);
                    if (!row.fromBranchCode && row.fromBranchId && branchMap.has(String(row.fromBranchId))) {
                        row.fromBranchCode = branchMap.get(String(row.fromBranchId));
                        row.fromBranchName = row.fromBranchCode;
                    }
                    if (!row.toBranchCode && row.toBranchId && branchMap.has(String(row.toBranchId))) {
                        row.toBranchCode = branchMap.get(String(row.toBranchId));
                        row.toBranchName = row.toBranchCode;
                    }
                    return row;
                });

            const outs = (txns || [])
                .filter((t) => t.sourceSheet === "M_OUT")
                .sort((a, b) => (a.sourceRow || 0) - (b.sourceRow || 0))
                .map((t) => {
                    const row = toEditableRow(t);
                    if (!row.fromBranchCode && row.fromBranchId && branchMap.has(String(row.fromBranchId))) {
                        row.fromBranchCode = branchMap.get(String(row.fromBranchId));
                        row.fromBranchName = row.fromBranchCode;
                    }
                    if (!row.toBranchCode && row.toBranchId && branchMap.has(String(row.toBranchId))) {
                        row.toBranchCode = branchMap.get(String(row.toBranchId));
                        row.toBranchName = row.toBranchCode;
                    }
                    return row;
                });

            setMInRows(ins);
            setMOutRows(outs);
            setUnsavedChanges(new Set());
            setDeletedRowIds(new Set());
        } catch (err) {
            addToast({
                type: "error",
                title: "Failed to load transactions",
                message: err.message
            });
        } finally {
            setLoading(false);
        }
    }, [reconciliationId, addToast]);

    useEffect(() => {
        loadWorkspaceData();
    }, [loadWorkspaceData, refreshSignal]);

    function createBlankRow(sheet, index) {
        const bList = allAvailableBranches.length > 0 ? allAvailableBranches : branches;
        const b1 = bList.length > 0 ? bList[0] : null;
        const b2 = bList.length > 1 ? bList[1] : b1;
        return {
            id: `temp-${sheet}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            reconciliationId: Number(reconciliationId),
            sourceSheet: sheet,
            sourceRow: index + 1,
            fromBranchId: b1 ? b1.id : "",
            fromBranchName: b1 ? (b1.code || b1.name) : "",
            fromBranchCode: b1 ? (b1.code || b1.name) : "",
            toBranchId: b2 ? b2.id : "",
            toBranchName: b2 ? (b2.code || b2.name) : "",
            toBranchCode: b2 ? (b2.code || b2.name) : "",
            amount: "",
            commission: "0",
            status: "PENDING",
            matchedTransactionId: null,
            matchDetails: null,
            isNew: true,
            original: null
        };
    }

    const handleAddMultipleRows = (sheet, count) => {
        const isMIn = sheet === "M_IN";
        const currentList = isMIn ? mInRows : mOutRows;
        const startIdx = currentList.length;

        const newRows = [];
        for (let i = 0; i < count; i++) {
            newRows.push(createBlankRow(sheet, startIdx + i));
        }

        if (isMIn) {
            setMInRows((prev) => [...prev, ...newRows]);
        } else {
            setMOutRows((prev) => [...prev, ...newRows]);
        }

        // Mark unsaved
        setUnsavedChanges((prev) => {
            const next = new Set(prev);
            newRows.forEach((r) => next.add(r.id));
            return next;
        });

        addToast({
            type: "info",
            title: "Rows Added",
            message: `Added ${count} empty row(s) to ${isMIn ? "M In" : "M Out"}.`
        });
    };

    const handleCellChange = (sheet, rowIdOrIndex, field, value) => {
        const isMIn = sheet === "M_IN";
        const setter = isMIn ? setMInRows : setMOutRows;

        setter((prev) => {
            const updated = [...prev];
            let targetIndex = -1;
            if (typeof rowIdOrIndex === "number" && rowIdOrIndex >= 0 && rowIdOrIndex < updated.length && updated[rowIdOrIndex]?.id === rowIdOrIndex) {
                targetIndex = rowIdOrIndex;
            } else {
                targetIndex = updated.findIndex((r) => String(r.id) === String(rowIdOrIndex));
            }
            if (targetIndex === -1 && typeof rowIdOrIndex === "number" && rowIdOrIndex >= 0 && rowIdOrIndex < updated.length) {
                targetIndex = rowIdOrIndex;
            }
            if (targetIndex === -1) return prev;

            const target = { ...updated[targetIndex] };

            if (field === "fromBranch" || field === "fromBranchCode") {
                const clean = (value || "").trim().toUpperCase();
                target.fromBranchCode = value.toUpperCase();
                target.fromBranchName = value.toUpperCase();
                const b = allAvailableBranches.find(
                    (item) => (item.code && item.code.toUpperCase() === clean) ||
                              (item.name && item.name.toUpperCase() === clean)
                );
                if (b) {
                    target.fromBranchId = b.id;
                    target.fromBranchCode = b.code || b.name;
                    target.fromBranchName = b.code || b.name;
                    target.fromBranchInvalid = false;
                } else {
                    target.fromBranchId = null;
                    target.fromBranchInvalid = clean.length > 0;
                }
            } else if (field === "toBranch" || field === "toBranchCode") {
                const clean = (value || "").trim().toUpperCase();
                target.toBranchCode = value.toUpperCase();
                target.toBranchName = value.toUpperCase();
                const b = allAvailableBranches.find(
                    (item) => (item.code && item.code.toUpperCase() === clean) ||
                              (item.name && item.name.toUpperCase() === clean)
                );
                if (b) {
                    target.toBranchId = b.id;
                    target.toBranchCode = b.code || b.name;
                    target.toBranchName = b.code || b.name;
                    target.toBranchInvalid = false;
                } else {
                    target.toBranchId = null;
                    target.toBranchInvalid = clean.length > 0;
                }
            } else if (field === "fromBranchId") {
                target.fromBranchId = value;
                const b = allAvailableBranches.find((item) => String(item.id) === String(value));
                target.fromBranchName = b ? (b.code || b.name) : "";
                target.fromBranchCode = b ? (b.code || b.name) : "";
            } else if (field === "toBranchId") {
                target.toBranchId = value;
                const b = allAvailableBranches.find((item) => String(item.id) === String(value));
                target.toBranchName = b ? (b.code || b.name) : "";
                target.toBranchCode = b ? (b.code || b.name) : "";
            } else {
                target[field] = value;
            }

            updated[targetIndex] = target;

            // Track unsaved
            setUnsavedChanges((current) => {
                const next = new Set(current);
                next.add(target.id || `row-${sheet}-${targetIndex}`);
                return next;
            });

            return updated;
        });
    };

    const handleBranchBlur = (sheet, rowIdOrIndex, field, value, displayRowIndex) => {
        const clean = (value || "").trim().toUpperCase();
        if (!clean) return;

        const exists = allAvailableBranches.some(
            (b) => (b.code && b.code.toUpperCase() === clean) ||
                   (b.name && b.name.toUpperCase() === clean)
        );

        if (!exists) {
            const sheetLabel = sheet === "M_IN" ? "M In" : "M Out";
            const isFirstCol = (sheet === "M_IN" && (field === "toBranch" || field === "toBranchCode")) ||
                               (sheet === "M_OUT" && (field === "fromBranch" || field === "fromBranchCode"));
            const fieldLabel = isFirstCol ? "Branch" : (sheet === "M_IN" ? "From Branch" : "To Branch");
            const rowNum = displayRowIndex !== undefined ? displayRowIndex : (typeof rowIdOrIndex === "number" ? rowIdOrIndex + 1 : "1");

            addToast({
                type: "error",
                title: "Invalid Branch Code",
                message: `[${sheetLabel} Row ${rowNum}] '${clean}' is not recognized in the database. Only registered branch codes are accepted.`
            });
        }
    };

    // =========================================================================
    // EXCEL CLIPBOARD COPY & PASTE PARSER (Ctrl+V and Pasting TSV/CSV)
    // =========================================================================
    const handlePasteData = (sheet, rawText, startRowIndex = 0) => {
        if (!rawText || !rawText.trim()) return;

        const lines = rawText.trim().split(/\r\n|\n|\r/);
        const parsedRows = [];
        const pasteErrors = [];

        lines.forEach((line, lineIdx) => {
            if (!line.trim()) return;
            // Split by tab (\t) or comma or multiple spaces
            let parts = line.split("\t");
            if (parts.length === 1 && line.includes(",")) {
                parts = line.split(",");
            }
            if (parts.length === 1) {
                parts = line.split(/\s{2,}/);
            }

            parts = parts.map((p) => p.trim());

            // Skip header lines if user copied column headers
            const firstColLower = (parts[0] || "").toLowerCase();
            if (firstColLower.includes("branch") || firstColLower.includes("source") || firstColLower.includes("sheet")) {
                return;
            }

            // Structure expected:
            // For M In: [BRANCH, From BRANCH, AMOUNT, COMMISSION]
            // For M Out: [BRANCH, To BRANCH, AMOUNT, COMMISSION]
            if (parts.length >= 2) {
                const branch1Text = parts[0] || "";
                const branch2Text = parts[1] || "";
                const amountText = (parts[2] || "").replace(/[^0-9.]/g, "");
                const commText = (parts[3] || "0").replace(/[^0-9.]/g, "");

                const findBranchInfo = (text) => {
                    const clean = (text || "").trim();
                    if (!clean) return { id: "", name: "", code: "", found: false };
                    const match = allAvailableBranches.find(
                        (b) => (b.name && b.name.toLowerCase() === clean.toLowerCase()) ||
                               (b.code && b.code.toLowerCase() === clean.toLowerCase()) ||
                               (b.fullName && b.fullName.toLowerCase() === clean.toLowerCase())
                    );
                    return match
                        ? { id: match.id, name: match.code || match.name, code: match.code || match.name, found: true }
                        : { id: null, name: clean, code: clean, found: false };
                };

                const b1 = findBranchInfo(branch1Text);
                const b2 = findBranchInfo(branch2Text);

                const lineNum = lineIdx + 1;
                const isMIn = sheet === "M_IN";
                const fromBranchInfo = isMIn ? b2 : b1;
                const toBranchInfo = isMIn ? b1 : b2;
                const fromRaw = isMIn ? branch2Text : branch1Text;
                const toRaw = isMIn ? branch1Text : branch2Text;

                if (!fromBranchInfo.found) {
                    pasteErrors.push(`[Line ${lineNum}] From Branch '${fromRaw}' does not exist in the database.`);
                }
                if (!toBranchInfo.found) {
                    pasteErrors.push(`[Line ${lineNum}] To Branch '${toRaw}' does not exist in the database.`);
                }

                parsedRows.push({
                    toBranchId: toBranchInfo.id,
                    toBranchName: toBranchInfo.code || toBranchInfo.name,
                    toBranchCode: toBranchInfo.code || toBranchInfo.name,
                    fromBranchId: fromBranchInfo.id,
                    fromBranchName: fromBranchInfo.code || fromBranchInfo.name,
                    fromBranchCode: fromBranchInfo.code || fromBranchInfo.name,
                    amount: amountText || "100000",
                    commission: commText || "0"
                });
            }
        });

        if (pasteErrors.length > 0) {
            addToast({
                type: "error",
                title: "Pasted Data Rejected",
                message: `Pasted data contains unregistered branches (${pasteErrors.length} error(s)): ${pasteErrors.slice(0, 3).join("; ")}${pasteErrors.length > 3 ? ` (+${pasteErrors.length - 3} more)` : ""}. Only branches defined in the database are allowed.`
            });
            return;
        }

        if (parsedRows.length === 0) {
            addToast({
                type: "warning",
                title: "Unable to parse clipboard",
                message: "Ensure rows are formatted as: [Branch] [From/To Branch] [Amount] [Commission]"
            });
            return;
        }

        const isMIn = sheet === "M_IN";
        const setter = isMIn ? setMInRows : setMOutRows;

        setter((prev) => {
            const next = [...prev];
            parsedRows.forEach((item, i) => {
                const targetIdx = startRowIndex + i;
                if (targetIdx < next.length) {
                    // Update existing row
                    next[targetIdx] = {
                        ...next[targetIdx],
                        ...item
                    };
                    setUnsavedChanges((u) => new Set(u).add(next[targetIdx].id));
                } else {
                    // Append new row
                    const newRow = {
                        ...createBlankRow(sheet, targetIdx),
                        ...item
                    };
                    next.push(newRow);
                    setUnsavedChanges((u) => new Set(u).add(newRow.id));
                }
            });
            return next;
        });

        addToast({
            type: "success",
            title: "Excel Data Pasted",
            message: `Populated ${parsedRows.length} row(s) into ${sheet === "M_IN" ? "M In" : "M Out"} starting at row ${startRowIndex + 1}.`
        });
    };

    // Global listener for clipboard paste when table area has focus
    const handleTablePasteEvent = (e, sheet, rowIndex = 0) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;
        const pastedText = clipboardData.getData("text");
        if (pastedText && (pastedText.includes("\t") || pastedText.includes("\n") || pastedText.includes(","))) {
            e.preventDefault();
            handlePasteData(sheet, pastedText, rowIndex);
        }
    };

    // Save Transactions
    const handleSaveTransactions = async () => {
        try {
            setSaving(true);
            const allRows = [...mInRows, ...mOutRows];

            // Validate
            const validationErrors = [];
            allRows.forEach((row, i) => {
                const sheetName = row.sourceSheet === "M_IN" ? "M In" : "M Out";
                const rowNum = row.sourceRow || (i + 1);

                if (!row.fromBranchId) {
                    const entered = row.fromBranchCode || row.fromBranchName;
                    if (entered) {
                        validationErrors.push(`[${sheetName} Row ${rowNum}] From Branch '${entered}' does not exist in the database.`);
                    } else {
                        validationErrors.push(`[${sheetName} Row ${rowNum}] From Branch is required.`);
                    }
                } else {
                    const fromValid = allAvailableBranches.some((b) => String(b.id) === String(row.fromBranchId));
                    if (!fromValid) {
                        validationErrors.push(`[${sheetName} Row ${rowNum}] From Branch '${row.fromBranchCode || row.fromBranchName || row.fromBranchId}' does not exist in the database.`);
                    }
                }

                if (!row.toBranchId) {
                    const entered = row.toBranchCode || row.toBranchName;
                    if (entered) {
                        validationErrors.push(`[${sheetName} Row ${rowNum}] To Branch '${entered}' does not exist in the database.`);
                    } else {
                        validationErrors.push(`[${sheetName} Row ${rowNum}] To Branch is required.`);
                    }
                } else {
                    const toValid = allAvailableBranches.some((b) => String(b.id) === String(row.toBranchId));
                    if (!toValid) {
                        validationErrors.push(`[${sheetName} Row ${rowNum}] To Branch '${row.toBranchCode || row.toBranchName || row.toBranchId}' does not exist in the database.`);
                    }
                }

                if (!row.amount || Number(row.amount) <= 0) {
                    validationErrors.push(`[${sheetName} Row ${rowNum}] Positive amount required.`);
                }
            });

            if (validationErrors.length > 0) {
                addToast({
                    type: "error",
                    title: "Validation Incomplete",
                    message: validationErrors.slice(0, 3).join(" • ") + (validationErrors.length > 3 ? ` (+${validationErrors.length - 3} more)` : "")
                });
                return false;
            }

            const newRows = allRows.filter((r) => r.isNew);
            const updatedRows = allRows.filter((r) => !r.isNew && unsavedChanges.has(r.id));
            const deletedList = Array.from(deletedRowIds);

            if (newRows.length > 0 || updatedRows.length > 0 || deletedList.length > 0) {
                await saveTransactions(reconciliationId, { newRows, updatedRows, deletedRowIds: deletedList });

                setUnsavedChanges(new Set());
                setDeletedRowIds(new Set());
                addToast({
                    type: "success",
                    title: "Transactions Saved",
                    message: `Saved changes successfully (${newRows.length} added, ${updatedRows.length} updated, ${deletedList.length} deleted).`
                });

                if (onReconciliationUpdated) {
                    onReconciliationUpdated();
                }
                await loadWorkspaceData();
            }
            return true;
        } catch (err) {
            addToast({
                type: "error",
                title: "Save Failed",
                message: err.message
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Filtered lists (used for pre-reconciliation and fallback)
    const filteredMIn = useMemo(() => {
        return mInRows.filter((row) => {
            if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const fromMatch = row.fromBranchName?.toLowerCase().includes(q) || row.fromBranchCode?.toLowerCase().includes(q);
                const toMatch = row.toBranchName?.toLowerCase().includes(q) || row.toBranchCode?.toLowerCase().includes(q);
                const amtMatch = String(row.amount).includes(q);
                return fromMatch || toMatch || amtMatch;
            }
            return true;
        });
    }, [mInRows, statusFilter, searchQuery]);

    const filteredMOut = useMemo(() => {
        return mOutRows.filter((row) => {
            if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const fromMatch = row.fromBranchName?.toLowerCase().includes(q) || row.fromBranchCode?.toLowerCase().includes(q);
                const toMatch = row.toBranchName?.toLowerCase().includes(q) || row.toBranchCode?.toLowerCase().includes(q);
                const amtMatch = String(row.amount).includes(q);
                return fromMatch || toMatch || amtMatch;
            }
            return true;
        });
    }, [mOutRows, statusFilter, searchQuery]);

    // Check if reconciliation has executed for this batch
    const isReconciled = useMemo(() => {
        return mInRows.some((r) => r.matchedTransactionId || (r.status && r.status !== "PENDING")) ||
               mOutRows.some((r) => r.matchedTransactionId || (r.status && r.status !== "PENDING"));
    }, [mInRows, mOutRows]);

    // Construct aligned slots: matching transactions paired on same row number, empty slots for missing
    const alignedSlots = useMemo(() => {
        if (!isReconciled) return null;
        return buildAlignedSlots(mInRows, mOutRows);
    }, [isReconciled, mInRows, mOutRows]);

    alignedSlotsRef.current = alignedSlots;

    // Filter aligned slots based on searchQuery and statusFilter
    const filteredAlignedSlots = useMemo(() => {
        if (!alignedSlots) return null;

        const checkMatch = (row) => {
            if (!row) return false;
            if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const fromMatch = row.fromBranchName?.toLowerCase().includes(q) || row.fromBranchCode?.toLowerCase().includes(q);
                const toMatch = row.toBranchName?.toLowerCase().includes(q) || row.toBranchCode?.toLowerCase().includes(q);
                const amtMatch = String(row.amount).includes(q);
                return fromMatch || toMatch || amtMatch;
            }
            return true;
        };

        if (statusFilter === "ALL" && !searchQuery) {
            return alignedSlots;
        }

        return alignedSlots.filter((slot) => {
            return checkMatch(slot.mIn) || checkMatch(slot.mOut);
        });
    }, [alignedSlots, statusFilter, searchQuery]);

    // Displayed rows for M In table (matching M Out slots receive empty placeholder)
    const displayMIn = useMemo(() => {
        if (!isReconciled || !filteredAlignedSlots) {
            return filteredMIn;
        }
        return filteredAlignedSlots.map((slot, idx) => {
            if (slot.mIn) {
                return {
                    ...slot.mIn,
                    counterpartRow: slot.mOut,
                    displayIndex: idx + 1
                };
            }
            return {
                id: `empty-in-${idx}`,
                isEmpty: true,
                sourceSheet: "M_IN",
                displayIndex: idx + 1
            };
        });
    }, [isReconciled, filteredAlignedSlots, filteredMIn]);

    // Displayed rows for M Out table (matching M In slots receive empty placeholder)
    const displayMOut = useMemo(() => {
        if (!isReconciled || !filteredAlignedSlots) {
            return filteredMOut;
        }
        return filteredAlignedSlots.map((slot, idx) => {
            if (slot.mOut) {
                return {
                    ...slot.mOut,
                    counterpartRow: slot.mIn,
                    displayIndex: idx + 1
                };
            }
            return {
                id: `empty-out-${idx}`,
                isEmpty: true,
                sourceSheet: "M_OUT",
                displayIndex: idx + 1
            };
        });
    }, [isReconciled, filteredAlignedSlots, filteredMOut]);

    // Financial calculations
    const totals = useMemo(() => {
        const inAmt = mInRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
        const inComm = mInRows.reduce((acc, r) => acc + (Number(r.commission) || 0), 0);
        const outAmt = mOutRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
        const outComm = mOutRows.reduce((acc, r) => acc + (Number(r.commission) || 0), 0);
        return {
            inAmt,
            inComm,
            outAmt,
            outComm,
            variance: Math.abs(inAmt - outAmt)
        };
    }, [mInRows, mOutRows]);

    const doFocusTransaction = useCallback(({ txnId, sheet, field, sourceRow, displayRow, errorType, description, force }) => {
        const now = Date.now();
        const focusKey = `${txnId || ""}_${displayRow || sourceRow || ""}_${sheet || ""}_${field || ""}`;

        // Prevent duplicate trigger within 800ms unless explicitly forced
        if (!force && lastFocusRequestRef.current && lastFocusRequestRef.current.key === focusKey && (now - lastFocusRequestRef.current.time) < 800) {
            if (description && !lastFocusRequestRef.current.description) {
                lastFocusRequestRef.current.description = description;
            }
            return;
        }

        lastFocusRequestRef.current = {
            key: focusKey,
            time: now,
            description: description || null,
            notified: false
        };

        // 1. Reset search and filters so row is guaranteed visible
        setStatusFilter("ALL");
        setSearchQuery("");

        // 2. Ensure viewMode reveals target sheet
        const resolvedSheet = sheet || "M_IN";
        if (resolvedSheet === "M_IN" && viewMode === "m_out") {
            setViewMode("split");
        } else if (resolvedSheet === "M_OUT" && viewMode === "m_in") {
            setViewMode("split");
        }

        // 3. Find the target row in our data
        const targetPool = resolvedSheet === "M_OUT" ? mOutRows : mInRows;
        const fallbackPool = resolvedSheet === "M_OUT" ? mInRows : mOutRows;

        let foundRow = null;
        let actualSheet = resolvedSheet;

        // Priority 1: Match strictly by unique transaction ID
        if (txnId !== null && txnId !== undefined) {
            foundRow = targetPool.find((r) => String(r.id) === String(txnId) || Number(r.id) === Number(txnId));
            if (!foundRow) {
                foundRow = fallbackPool.find((r) => String(r.id) === String(txnId) || Number(r.id) === Number(txnId));
                if (foundRow) {
                    actualSheet = resolvedSheet === "M_OUT" ? "M_IN" : "M_OUT";
                }
            }
        }

        // Priority 2: Only if txnId is absent or not found, match by displayRow
        if (!foundRow && (displayRow || sourceRow)) {
            const targetRowIndex = Number(displayRow || sourceRow);
            foundRow = targetPool.find((r) => Number(r.displayIndex) === targetRowIndex || Number(r.sourceRow) === targetRowIndex);
            if (!foundRow) {
                foundRow = fallbackPool.find((r) => Number(r.displayIndex) === targetRowIndex || Number(r.sourceRow) === targetRowIndex);
                if (foundRow) {
                    actualSheet = resolvedSheet === "M_OUT" ? "M_IN" : "M_OUT";
                }
            }
        }

        const finalTxnId = foundRow ? foundRow.id : (txnId ? Number(txnId) : null);
        let finalDisplayRow = displayRow ? Number(displayRow) : (foundRow?.displayIndex || (sourceRow ? Number(sourceRow) : null));

        if (!finalDisplayRow && alignedSlots && finalTxnId) {
            const slotIdx = alignedSlots.findIndex((s) =>
                (s.mIn && (String(s.mIn.id) === String(finalTxnId) || Number(s.mIn.id) === Number(finalTxnId))) ||
                (s.mOut && (String(s.mOut.id) === String(finalTxnId) || Number(s.mOut.id) === Number(finalTxnId)))
            );
            if (slotIdx !== -1) {
                finalDisplayRow = slotIdx + 1;
            }
        }

        // 4. Update state to highlight target row and cell in UI
        setFocusedErrorTarget({
            txnId: finalTxnId,
            sheet: actualSheet,
            field: field || null,
            displayRow: finalDisplayRow,
            sourceRow: finalDisplayRow,
            timestamp: now
        });

        // Explicitly clear selectedTransaction and counterpart highlighting
        // so that ONLY the specific error row is highlighted
        setSelectedTransaction(null);
        setCounterpartTransactionId(null);
        setHoveredCounterpartId(null);

        // 5. Polling scroll loop: locates target row element, computes exact scrollTop, and verifies layout
        let attempts = 0;
        const maxAttempts = 35; // up to 3.5s to ensure tab layout & data rendering

        if (scrollAnimationTimeoutRef.current) {
            clearTimeout(scrollAnimationTimeoutRef.current);
        }

        const locateAndScrollRow = () => {
            attempts++;

            const targetContainer = actualSheet === "M_OUT" ? mOutScrollRef.current : mInScrollRef.current;
            const siblingContainer = actualSheet === "M_OUT" ? mInScrollRef.current : mOutScrollRef.current;
            const activeContainer = targetContainer || siblingContainer;

            // Search row element by ID or data attributes
            let rowEl = null;
            if (finalTxnId) {
                rowEl = document.getElementById(`txn-row-${finalTxnId}`) ||
                        document.querySelector(`[data-sheet="${actualSheet}"][data-row-id="${finalTxnId}"]`) ||
                        document.querySelector(`[data-row-id="${finalTxnId}"]`);
            }
            if (!rowEl && finalDisplayRow) {
                rowEl = document.querySelector(`[data-sheet="${actualSheet}"][data-display-row="${finalDisplayRow}"]`) ||
                        document.getElementById(`txn-empty-${actualSheet}-${finalDisplayRow}`) ||
                        document.querySelector(`[data-display-row="${finalDisplayRow}"]`);
            }

            const isReady = rowEl && activeContainer &&
                            activeContainer.clientHeight > 0 &&
                            (rowEl.offsetHeight > 0 || rowEl.getBoundingClientRect().height > 0);

            if (isReady) {
                const containerRect = activeContainer.getBoundingClientRect();
                const rowRect = rowEl.getBoundingClientRect();
                const rowContentTop = (rowRect.top - containerRect.top) + activeContainer.scrollTop;
                const targetScrollTop = Math.max(
                    0,
                    Math.round(rowContentTop - (activeContainer.clientHeight / 2) + (rowRect.height / 2))
                );

                isSyncingScroll.current = true;

                // Smooth scroll container directly to exact target position
                activeContainer.scrollTo({
                    top: targetScrollTop,
                    behavior: "smooth"
                });

                if (viewMode === "split" && siblingContainer && siblingContainer !== activeContainer) {
                    siblingContainer.scrollTo({
                        top: targetScrollTop,
                        behavior: "smooth"
                    });
                }

                // Ensure the table workspace container is visible in page viewport
                try {
                    activeContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
                } catch {
                    // ignore
                }

                // Double check scroll position after 250ms to guarantee correct offset
                setTimeout(() => {
                    if (activeContainer) {
                        const diff = Math.abs(activeContainer.scrollTop - targetScrollTop);
                        if (diff > 120) {
                            activeContainer.scrollTop = targetScrollTop;
                            if (viewMode === "split" && siblingContainer) {
                                siblingContainer.scrollTop = targetScrollTop;
                            }
                        }
                    }
                }, 300);

                // Focus and pulse problematic cell input if applicable
                if (field) {
                    const cellInput = rowEl.querySelector(`input[data-field="${field}"]`) ||
                                      rowEl.querySelector(`.col-${field === "commission" ? "comm" : field} input`);
                    if (cellInput) {
                        try {
                            cellInput.focus({ preventScroll: true });
                        } catch {
                            cellInput.focus();
                        }
                        cellInput.classList.add("cell-focused-error-pulse");
                        setTimeout(() => {
                            cellInput.classList.remove("cell-focused-error-pulse");
                        }, 5000);
                    }
                }

                setTimeout(() => {
                    isSyncingScroll.current = false;
                }, 600);

                // DISPLAY SUCCESS TOAST ONLY AFTER TARGET ROW IS LOCATED AND SCROLLED INTO VIEW
                if (lastFocusRequestRef.current && !lastFocusRequestRef.current.notified) {
                    lastFocusRequestRef.current.notified = true;
                    const sheetName = actualSheet === "M_OUT" ? "M Out" : "M In";
                    const elDisplayRow = rowEl.getAttribute("data-display-row");
                    const rowLabel = elDisplayRow || finalDisplayRow || foundRow?.displayIndex || "";
                    const toastDesc = lastFocusRequestRef.current.description || description || `Located error transaction for immediate inspection.`;
                    addToast({
                        type: "info",
                        title: `Navigated to ${sheetName} Row #${rowLabel}`,
                        message: toastDesc
                    });
                }

                // Clean up URL query parameters cleanly ONLY IF focus parameters exist
                const hasFocusParams = searchParams.get("focusTxnId") ||
                                       searchParams.get("focusRow") ||
                                       searchParams.get("focusSheet") ||
                                       searchParams.get("focusField");

                if (hasFocusParams) {
                    setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("tab", "transactions");
                        next.delete("focusTxnId");
                        next.delete("focusRow");
                        next.delete("focusSheet");
                        next.delete("focusField");
                        return next;
                    }, { replace: true });
                }

            } else if (attempts < maxAttempts) {
                scrollAnimationTimeoutRef.current = setTimeout(locateAndScrollRow, 100);
            }
        };

        scrollAnimationTimeoutRef.current = setTimeout(locateAndScrollRow, 80);

        // Auto-clear pulsing focus after 15s
        setTimeout(() => {
            setFocusedErrorTarget((prev) => (prev?.timestamp === now ? null : prev));
        }, 15000);
    }, [mInRows, mOutRows, alignedSlots, viewMode, addToast, setSearchParams, searchParams]);

    useImperativeHandle(ref, () => ({
        hasUnsavedChanges: () => unsavedChanges.size > 0 || deletedRowIds.size > 0,
        savePendingChanges: async () => {
            if (unsavedChanges.size === 0 && deletedRowIds.size === 0) return true;
            return await handleSaveTransactions();
        },
        reloadWorkspace: async () => {
            return await loadWorkspaceData();
        },
        focusTransaction: (params) => {
            doFocusTransaction(params);
        }
    }), [unsavedChanges, deletedRowIds, handleSaveTransactions, loadWorkspaceData, doFocusTransaction]);

    // React to searchParams navigation (e.g. from Errors tab "Open" button)
    useEffect(() => {
        const focusTxnId = searchParams.get("focusTxnId");
        const focusRow = searchParams.get("focusRow");
        const focusSheet = searchParams.get("focusSheet");
        const focusField = searchParams.get("focusField");

        if ((focusTxnId || focusRow) && !loading && (mInRows.length > 0 || mOutRows.length > 0)) {
            doFocusTransaction({
                txnId: focusTxnId ? Number(focusTxnId) : null,
                displayRow: focusRow ? Number(focusRow) : null,
                sourceRow: focusRow ? Number(focusRow) : null,
                sheet: focusSheet || "M_IN",
                field: focusField || null
            });
        }
    }, [searchParams, loading, mInRows.length, mOutRows.length, doFocusTransaction]);

    // Synchronized scrolling between M In and M Out tables in split view
    const handleSyncScroll = (source) => {
        if (viewMode !== "split" || isSyncingScroll.current) return;
        const sourceEl = source === "M_IN" ? mInScrollRef.current : mOutScrollRef.current;
        const targetEl = source === "M_IN" ? mOutScrollRef.current : mInScrollRef.current;
        if (!sourceEl || !targetEl) return;

        isSyncingScroll.current = true;
        targetEl.scrollTop = sourceEl.scrollTop;
        requestAnimationFrame(() => {
            isSyncingScroll.current = false;
        });
    };

    // Filter clearing helper
    const handleClearFilters = () => {
        setSearchQuery("");
        setStatusFilter("ALL");
    };

    // Batch Row Deletion handler (Recalculates totals & unsaved changes)
    const handleDeleteRows = (sheet, rowIdsToDelete) => {
        const isMIn = sheet === "M_IN";
        const setter = isMIn ? setMInRows : setMOutRows;
        const toDeleteSet = new Set(rowIdsToDelete);

        // Track persisted database row IDs for deletion
        const persistedIdsToDelete = rowIdsToDelete.filter(
            (id) => typeof id === "number" || (!String(id).startsWith("temp-") && !isNaN(Number(id)))
        );

        if (persistedIdsToDelete.length > 0) {
            setDeletedRowIds((prev) => {
                const next = new Set(prev);
                persistedIdsToDelete.forEach((id) => next.add(Number(id)));
                return next;
            });
        }

        setter((prev) => {
            const remaining = prev.filter((r) => !toDeleteSet.has(r.id));
            // Renumber sequential sourceRow
            return remaining.map((r, index) => ({
                ...r,
                sourceRow: index + 1
            }));
        });

        // Clean up unsaved changes tracker
        setUnsavedChanges((prev) => {
            const next = new Set(prev);
            rowIdsToDelete.forEach((id) => next.delete(id));
            return next;
        });

        // Reset active selection if deleted
        if (selectedTransaction && toDeleteSet.has(selectedTransaction.id)) {
            setSelectedTransaction(null);
            setCounterpartTransactionId(null);
        }

        addToast({
            type: "success",
            title: "Transactions Deleted",
            message: `Removed ${rowIdsToDelete.length} row(s) from ${isMIn ? "M In" : "M Out"}. Click 'Save' or 'Run Again' to persist.`
        });
    };

    const handleSelectRow = (row) => {
        if (!row || row.isEmpty) return;
        setSelectedTransaction(row);

        // Identify corresponding transaction in reciprocal sheet
        let matchId = row.matchedTransactionId || row.matchDetails?.counterpartId;
        if (!matchId) {
            const counterpartRows = row.sourceSheet === "M_IN" ? mOutRows : mInRows;
            const candidate = counterpartRows.find(
                (c) =>
                    Number(c.amount) === Number(row.amount) &&
                    (c.fromBranchId === row.fromBranchId || c.toBranchId === row.toBranchId)
            );
            if (candidate) {
                matchId = candidate.id;
            }
        }

        setCounterpartTransactionId(matchId || null);

        // Only scroll if NOT aligned (in pre-reconciliation state).
        // Post-reconciliation, matching rows appear on the exact same row index side-by-side.
        if (!isReconciled && matchId) {
            setTimeout(() => {
                const targetEl = document.getElementById(`txn-row-${matchId}`);
                if (targetEl) {
                    targetEl.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }
            }, 80);
        }
    };

    if (loading) {
        return (
            <div className="workspace-loading-skeleton">
                <div className="skeleton-bar h-8 w-64 mb-4"></div>
                <div className="skeleton-grid-2">
                    <div className="skeleton-table h-96"></div>
                    <div className="skeleton-table h-96"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="transaction-workspace-root">
            {/* Action & Filter Toolbar */}
            <div className="workspace-toolbar">
                <div className="workspace-toolbar-left">
                    <div className="search-input-wrapper">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            className="workspace-search-input"
                            placeholder="Filter by branch"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => setSearchQuery("")}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="status-filter-pills">
                        <button
                            type="button"
                            className={`filter-pill ${statusFilter === "ALL" ? "filter-pill-active" : ""}`}
                            onClick={() => setStatusFilter("ALL")}
                        >
                            All ({mInRows.length + mOutRows.length})
                        </button>
                        <button
                            type="button"
                            className={`filter-pill filter-pill-success ${statusFilter === "MATCHED" ? "filter-pill-active" : ""}`}
                            onClick={() => setStatusFilter("MATCHED")}
                        >
                            ✓ Matched
                        </button>
                        <button
                            type="button"
                            className={`filter-pill filter-pill-danger ${statusFilter === "UNMATCHED" ? "filter-pill-active" : ""}`}
                            onClick={() => setStatusFilter("UNMATCHED")}
                        >
                            ✕ Unmatched
                        </button>
                        <button
                            type="button"
                            className={`filter-pill filter-pill-warning ${statusFilter === "ERROR" ? "filter-pill-active" : ""}`}
                            onClick={() => setStatusFilter("ERROR")}
                        >
                            ⚠ Issues
                        </button>
                    </div>

                    {/* View Switcher: Split vs Focus M In vs Focus M Out */}
                    <div className="view-switcher-group">
                        <button
                            type="button"
                            className={`view-switcher-btn ${viewMode === "split" ? "active" : ""}`}
                            onClick={() => setViewMode("split")}
                            title="Side-by-side split view"
                        >
                            <Columns size={13} className="inline mr-1" />
                            Split View
                        </button>
                        <button
                            type="button"
                            className={`view-switcher-btn ${viewMode === "m_in" ? "active" : ""}`}
                            onClick={() => setViewMode("m_in")}
                            title="Focus full-width on M In"
                        >
                            Focus M In
                        </button>
                        <button
                            type="button"
                            className={`view-switcher-btn ${viewMode === "m_out" ? "active" : ""}`}
                            onClick={() => setViewMode("m_out")}
                            title="Focus full-width on M Out"
                        >
                            Focus M Out
                        </button>
                    </div>
                </div>

                <div className="workspace-toolbar-right">
                    {(unsavedChanges.size > 0 || deletedRowIds.size > 0) && (
                        <div className="unsaved-badge animate-pulse">
                            <span className="unsaved-dot"></span>
                            {unsavedChanges.size + deletedRowIds.size} unsaved
                        </div>
                    )}

                    <button
                        type="button"
                        className="primary-button save-workspace-btn"
                        onClick={handleSaveTransactions}
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? "Saving" : "Save"}
                    </button>
                </div>
            </div>

            {/* Contextual Linked Match Inspector Bar (If transaction is clicked) */}
            {selectedTransaction && (
                <div className="linked-match-panel">
                    <div className="linked-match-content">
                        <div className="linked-match-header">
                            <ArrowRightLeft size={16} className="text-blue-500" />
                            <span className="font-semibold text-slate-800">
                                Selected: {selectedTransaction.sourceSheet === "M_IN" ? "M In" : "M Out"} (Row #{selectedTransaction.sourceRow})
                            </span>
                            <span className={`status-badge ml-2 ${
                                selectedTransaction.status === "MATCHED"
                                    ? "status-success"
                                    : selectedTransaction.status === "ERROR"
                                    ? "status-error"
                                    : "status-pending"
                            }`}>
                                {selectedTransaction.status}
                            </span>
                            <button
                                type="button"
                                className="row-view-button ml-3 text-xs py-1 px-2"
                                onClick={() => setDetailModalTxn(selectedTransaction)}
                            >
                                <Eye size={12} />
                                <span>Inspect Counterpart</span>
                            </button>
                        </div>

                        {selectedTransaction.matchDetails ? (
                            <div className="linked-match-details">
                                <span className="text-slate-600">
                                    Corresponds to <strong>{selectedTransaction.matchDetails.counterpartSheet}</strong>:{" "}
                                    {selectedTransaction.matchDetails.counterpartFrom} → {selectedTransaction.matchDetails.counterpartTo}
                                </span>
                                <span className="text-slate-800 font-medium">
                                    Amount: ₹{Number(selectedTransaction.matchDetails.counterpartAmount).toLocaleString("en-IN")}
                                </span>
                                <span className="text-slate-600">
                                    Commission: ₹{selectedTransaction.matchDetails.counterpartCommission}
                                </span>
                                <span className="italic text-slate-500 text-xs">
                                    ({selectedTransaction.matchDetails.notes})
                                </span>
                            </div>
                        ) : (
                            <div className="linked-match-details text-rose-600">
                                <AlertTriangle size={14} />
                                {selectedTransaction.errorReason || "Unmatched in current batch. No corresponding transaction found in counterpart sheet."}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        className="linked-match-close"
                        onClick={() => {
                            setSelectedTransaction(null);
                            setCounterpartTransactionId(null);
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Side-by-Side or Focused Spreadsheet Grid */}
            <div className={`spreadsheet-grid-wrapper ${viewMode !== "split" ? "focus-single" : ""}`}>
                {/* M IN TABLE */}
                {(viewMode === "split" || viewMode === "m_in") && (
                    <SpreadsheetTable
                        title="M In"
                        sheet="M_IN"
                        subtitle="Incoming funds into Branch"
                        rows={displayMIn}
                        totalRowCount={mInRows.length}
                        branches={allAvailableBranches}
                        unsavedChanges={unsavedChanges}
                        hoveredCounterpartId={hoveredCounterpartId}
                        selectedTransactionId={selectedTransaction?.id}
                        counterpartTransactionId={counterpartTransactionId}
                        focusedErrorTxnId={focusedErrorTarget?.txnId}
                        focusedErrorSheet={focusedErrorTarget?.sheet}
                        focusedErrorField={focusedErrorTarget?.field}
                        focusedErrorDisplayRow={focusedErrorTarget?.displayRow}
                        focusedErrorSourceRow={focusedErrorTarget?.sourceRow}
                        allowDelete={viewMode === "m_in"}
                        scrollRef={mInScrollRef}
                        onScroll={() => handleSyncScroll("M_IN")}
                        onHoverCounterpart={setHoveredCounterpartId}
                        onSelectRow={handleSelectRow}
                        onInspectRow={(row) => setDetailModalTxn(row)}
                        onCellChange={handleCellChange}
                        onBranchBlur={handleBranchBlur}
                        onDeleteRows={handleDeleteRows}
                        onClearFilters={handleClearFilters}
                        onOpenAddRows={() =>
                            setAddRowsModalState({
                                isOpen: true,
                                sheet: "M_IN",
                                sheetTitle: "M In"
                            })
                        }
                        onOpenPasteModal={() => {
                            setPastePromptSheet("M_IN");
                            setPasteText("");
                            setPastePromptOpen(true);
                        }}
                        onTablePaste={(e, idx) => handleTablePasteEvent(e, "M_IN", idx)}
                    />
                )}

                {/* M OUT TABLE */}
                {(viewMode === "split" || viewMode === "m_out") && (
                    <SpreadsheetTable
                        title="M Out"
                        sheet="M_OUT"
                        subtitle="Outgoing transfers from Branch"
                        rows={displayMOut}
                        totalRowCount={mOutRows.length}
                        branches={allAvailableBranches}
                        unsavedChanges={unsavedChanges}
                        hoveredCounterpartId={hoveredCounterpartId}
                        selectedTransactionId={selectedTransaction?.id}
                        counterpartTransactionId={counterpartTransactionId}
                        focusedErrorTxnId={focusedErrorTarget?.txnId}
                        focusedErrorSheet={focusedErrorTarget?.sheet}
                        focusedErrorField={focusedErrorTarget?.field}
                        focusedErrorDisplayRow={focusedErrorTarget?.displayRow}
                        focusedErrorSourceRow={focusedErrorTarget?.sourceRow}
                        allowDelete={viewMode === "m_out"}
                        scrollRef={mOutScrollRef}
                        onScroll={() => handleSyncScroll("M_OUT")}
                        onHoverCounterpart={setHoveredCounterpartId}
                        onSelectRow={handleSelectRow}
                        onInspectRow={(row) => setDetailModalTxn(row)}
                        onCellChange={handleCellChange}
                        onBranchBlur={handleBranchBlur}
                        onDeleteRows={handleDeleteRows}
                        onClearFilters={handleClearFilters}
                        onOpenAddRows={() =>
                            setAddRowsModalState({
                                isOpen: true,
                                sheet: "M_OUT",
                                sheetTitle: "M Out"
                            })
                        }
                        onOpenPasteModal={() => {
                            setPastePromptSheet("M_OUT");
                            setPasteText("");
                            setPastePromptOpen(true);
                        }}
                        onTablePaste={(e, idx) => handleTablePasteEvent(e, "M_OUT", idx)}
                    />
                )}
            </div>

            {/* Workspace Financial Summary Bar */}
            <div className="workspace-summary-bar">
                <div className="summary-group">
                    <span className="summary-label">M In Net Volume</span>
                    <strong className="summary-value text-blue-700">
                        ₹{totals.inAmt.toLocaleString("en-IN")}
                    </strong>
                    <span className="summary-sub">
                        {mInRows.length} rows • Comm: ₹{totals.inComm.toLocaleString("en-IN")}
                    </span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-group">
                    <span className="summary-label">M Out Net Volume</span>
                    <strong className="summary-value text-indigo-700">
                        ₹{totals.outAmt.toLocaleString("en-IN")}
                    </strong>
                    <span className="summary-sub">
                        {mOutRows.length} rows • Comm: ₹{totals.outComm.toLocaleString("en-IN")}
                    </span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-group">
                    <span className="summary-label">Inter-Branch Net Variance</span>
                    <strong className={`summary-value ${totals.variance === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        ₹{totals.variance.toLocaleString("en-IN")}
                    </strong>
                    <span className="summary-sub">
                        {totals.variance === 0 ? "Fully Balanced" : "Requires settlement clearing"}
                    </span>
                </div>
            </div>

            {/* Add Multiple Rows Modal */}
            <AddRowsModal
                isOpen={addRowsModalState.isOpen}
                sheetTitle={addRowsModalState.sheetTitle}
                onClose={() => setAddRowsModalState((prev) => ({ ...prev, isOpen: false }))}
                onAddRows={(count) => handleAddMultipleRows(addRowsModalState.sheet, count)}
            />

            {/* Excel Paste Prompt Modal (Fallback / Helper) */}
            {pastePromptOpen && (
                <div className="modal-backdrop" onClick={() => setPastePromptOpen(false)}>
                    <div
                        className="modal-container paste-helper-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="modal-header">
                            <div className="flex items-center gap-2">
                                <ClipboardPaste size={18} className="text-blue-500" />
                                <h3 className="modal-title text-base font-bold">
                                    Paste Excel Cells into {pastePromptSheet === "M_IN" ? "M In" : "M Out"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setPastePromptOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body py-2">
                            <p style={{
                                fontSize: "13px",
                                color: "var(--text-secondary)",  /* or a color like "#94a3b8" */
                                marginBottom: "15px",
                                lineHeight: "1.5",
                                fontWeight: "500"
                            }}>
                                Copy cells from Microsoft Excel or Google Sheets and paste (Ctrl+V) into this box:
                            </p>
                            <textarea
                                rows={6}
                                className="form-textarea font-mono text-xs w-full"
                                placeholder={`Example:\nPKT\tPDK\t100000\t150\nChennai\tCoimbatore\t250000\t120`}
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setPastePromptOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={() => {
                                    handlePasteData(pastePromptSheet, pasteText, 0);
                                    setPastePromptOpen(false);
                                }}
                            >
                                Populate Spreadsheet
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Transaction Detail Modal (Progressive Disclosure) */}
            <TransactionDetailModal
                isOpen={!!detailModalTxn}
                transaction={detailModalTxn}
                onClose={() => setDetailModalTxn(null)}
            />
        </div>
    );
});

export default TransactionWorkspace;

// =============================================================================
// SUB-COMPONENT: SPREADSHEET TABLE (M In / M Out)
// =============================================================================
function SpreadsheetTable({
    title,
    sheet,
    subtitle,
    rows,
    totalRowCount,
    branches = [],
    unsavedChanges,
    hoveredCounterpartId,
    selectedTransactionId,
    counterpartTransactionId,
    focusedErrorTxnId = null,
    focusedErrorSheet = null,
    focusedErrorField = null,
    focusedErrorDisplayRow = null,
    focusedErrorSourceRow = null,
    allowDelete = false,
    scrollRef,
    onScroll,
    onHoverCounterpart,
    onSelectRow,
    onInspectRow,
    onCellChange,
    onBranchBlur,
    onOpenAddRows,
    onOpenPasteModal,
    onTablePaste,
    onDeleteRows,
    onClearFilters
}) {
    const isMIn = sheet === "M_IN";

    // Batch Selection State (Only active in Focus M In / Focus M Out)
    const [selectedRowIds, setSelectedRowIds] = useState(new Set());
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Sync selectedRowIds when rows change or when allowDelete changes
    useEffect(() => {
        if (!allowDelete) {
            setSelectedRowIds(new Set());
            return;
        }
        setSelectedRowIds((prev) => {
            if (prev.size === 0) return prev;
            const validIds = new Set(rows.map((r) => r.id));
            const filtered = new Set([...prev].filter((id) => validIds.has(id)));
            return filtered.size === prev.size ? prev : filtered;
        });
    }, [rows, allowDelete]);

    const isAllSelected = rows.length > 0 && rows.every((r) => selectedRowIds.has(r.id));

    const handleSelectAllToggle = () => {
        if (isAllSelected) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(rows.map((r) => r.id)));
        }
    };

    const handleToggleRow = (e, rowId) => {
        e.stopPropagation();
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowId)) {
                next.delete(rowId);
            } else {
                next.add(rowId);
            }
            return next;
        });
    };

    const handleConfirmDelete = () => {
        if (onDeleteRows && selectedRowIds.size > 0) {
            onDeleteRows(sheet, Array.from(selectedRowIds));
            setSelectedRowIds(new Set());
        }
    };

    const selectedTotalAmount = useMemo(() => {
        return rows
            .filter((r) => selectedRowIds.has(r.id))
            .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    }, [rows, selectedRowIds]);

    const getRowHighlightClass = (row) => {
        const isHoverLinked = hoveredCounterpartId && (row.id === hoveredCounterpartId || row.matchedTransactionId === hoveredCounterpartId);
        const isSelected = selectedTransactionId === row.id;
        const isCounterpartActive = counterpartTransactionId && (row.id === counterpartTransactionId || row.matchedTransactionId === counterpartTransactionId);

        const targetDisplayNum = focusedErrorDisplayRow || focusedErrorSourceRow || null;
        const rowDisplayNum = row.displayIndex !== undefined ? row.displayIndex : null;
        const isTargetSheet = !focusedErrorSheet || sheet === focusedErrorSheet;

        const isFocusedError = Boolean(
            isTargetSheet &&
            (
                focusedErrorTxnId
                    ? (!row.isEmpty && (String(row.id) === String(focusedErrorTxnId) || Number(row.id) === Number(focusedErrorTxnId)))
                    : (targetDisplayNum && rowDisplayNum !== null && Number(rowDisplayNum) === Number(targetDisplayNum))
            )
        );

        let statusClass = "status-row-default";
        if (row.status === "MATCHED") {
            statusClass = "status-row-matched";
        } else if (row.status === "UNMATCHED") {
            statusClass = "status-row-unmatched";
        } else if (row.status === "ERROR") {
            statusClass = "status-row-error";
        }

        let linkClass = "";
        if (isFocusedError) {
            linkClass = "row-error-focus-active";
        } else if (isSelected) {
            linkClass = "row-selected-highlight";
        } else if (isCounterpartActive) {
            linkClass = "row-counterpart-highlight";
        } else if (isHoverLinked) {
            linkClass = "row-linked-hover";
        }

        return `spreadsheet-row ${statusClass} ${linkClass}`;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "MATCHED":
                return (
                    <span className="status-indicator-badge badge-matched" title="Matched • Reconciled">
                        <CheckCircle2 size={13} />
                    </span>
                );
            case "UNMATCHED":
                return (
                    <span className="status-indicator-badge badge-unmatched" title="Unmatched • Pending counterpart">
                        <ArrowRightLeft size={12} />
                    </span>
                );
            case "ERROR":
                return (
                    <span className="status-indicator-badge badge-error" title="Issue Found • Action required">
                        <AlertTriangle size={13} />
                    </span>
                );
            default:
                return (
                    <span className="status-indicator-badge badge-pending" title="Pending Verification">
                        <Clock size={12} />
                    </span>
                );
        }
    };

    // Helper to detect specific erroneous fields for a row
    function getRowErrorFields(row, isMInParam) {
        const errorFields = new Set();
        const reason = (row.errorReason || "").toLowerCase();
        const errorType = (row.errorType || "").toUpperCase();

        // 1. Validation checks for empty or invalid inputs
        if (row.amount !== "" && row.amount !== undefined && Number(row.amount) <= 0) {
            errorFields.add("amount");
        }
        if (!row.fromBranchId && row.fromBranchId !== 0) {
            errorFields.add("fromBranchId");
        }
        if (!row.toBranchId && row.toBranchId !== 0) {
            errorFields.add("toBranchId");
        }

        // 2. Specific domain error types
        if (row.status === "ERROR") {
            if (errorType.includes("COMMISSION") || reason.includes("commission")) {
                errorFields.add("commission");
            }
            if (errorType === "AMOUNT_MISMATCH" || reason.includes("amount") || reason.includes("variance")) {
                errorFields.add("amount");
            }
            if (errorType === "BRANCH_MISMATCH" || reason.includes("branch") || reason.includes("routing")) {
                if (reason.includes("from branch") || reason.includes("from")) {
                    errorFields.add("fromBranchId");
                } else if (reason.includes("to branch") || reason.includes("to")) {
                    errorFields.add("toBranchId");
                } else {
                    errorFields.add(isMInParam ? "fromBranchId" : "toBranchId");
                }
            }
        }

        // 3. Dynamic disparity against counterpart if matched details exist
        if (row.matchDetails?.counterpartAmount !== undefined) {
            if (Number(row.amount) !== Number(row.matchDetails.counterpartAmount)) {
                errorFields.add("amount");
            }
        }

        return errorFields;
    }

    const handleRowClick = (e, row) => {
        // Prevent selection when clicking directly inside editable controls or checkboxes
        if (e.target.closest("input, select, textarea, button")) {
            return;
        }
        // Single click: ONLY select & scroll counterpart in reciprocal sheet
        onSelectRow(row);
    };

    const handleRowDoubleClick = (e, row) => {
        // Prevent opening modal when double-clicking inside editable controls or checkboxes
        if (e.target.closest("input, select, textarea, button")) {
            return;
        }
        // Double click: open Info/Transaction Details card
        onSelectRow(row);
        onInspectRow(row);
    };

    return (
        <div className="spreadsheet-card">
            {/* Sheet Title Bar */}
            <div className="spreadsheet-card-header">
                <div className="spreadsheet-header-info">
                    <div className="spreadsheet-title-row">
                        <span className={`spreadsheet-badge-pill ${isMIn ? "pill-in" : "pill-out"}`}>
                            <span className={`sheet-dot ${isMIn ? "dot-in" : "dot-out"}`}></span>
                            <span>{isMIn ? "M In" : "M Out"}</span>
                        </span>
                        <h3 className="spreadsheet-main-title">{title}</h3>
                        <span className="spreadsheet-count-chip">
                            {rows.length} {rows.length !== totalRowCount ? `of ${totalRowCount} rows` : "rows"}
                        </span>
                    </div>
                    <p className="spreadsheet-subtitle-text">{subtitle}</p>
                </div>

                <div className="spreadsheet-header-actions">
                    {allowDelete && selectedRowIds.size > 0 && (
                        <button
                            type="button"
                            className="spreadsheet-action-btn spreadsheet-action-btn-danger"
                            onClick={() => setDeleteConfirmOpen(true)}
                            title="Delete selected rows"
                        >
                            <Trash2 size={14} />
                            Delete ({selectedRowIds.size})
                        </button>
                    )}
                    <button
                        type="button"
                        className="spreadsheet-action-btn"
                        onClick={onOpenPasteModal}
                        title="Paste Excel clipboard data into this sheet"
                    >
                        <ClipboardPaste size={14} />
                        Paste
                    </button>
                    <button
                        type="button"
                        className="spreadsheet-action-btn spreadsheet-action-btn-primary"
                        onClick={onOpenAddRows}
                        title="Add multiple rows to table"
                    >
                        <Plus size={14} />
                        + Add Rows
                    </button>
                </div>
            </div>

            {/* Contextual Batch Action Bar (Appears in Focus M In / Focus M Out when rows are checked) */}
            {allowDelete && selectedRowIds.size > 0 && (
                <div className="batch-action-bar">
                    <div className="batch-action-left">
                        <span className="batch-selected-chip">
                            <CheckSquare size={15} className="text-blue-400" />
                            <span>
                                <strong>{selectedRowIds.size}</strong> of {rows.length} row{selectedRowIds.size > 1 ? "s" : ""} selected
                            </span>
                        </span>
                        <button
                            type="button"
                            className="batch-action-link"
                            onClick={handleSelectAllToggle}
                        >
                            {isAllSelected ? "Deselect All" : `Select All (${rows.length})`}
                        </button>
                    </div>
                    <div className="batch-action-right">
                        <button
                            type="button"
                            className="batch-delete-btn"
                            onClick={() => setDeleteConfirmOpen(true)}
                        >
                            <Trash2 size={14} />
                            <span>Delete Selected ({selectedRowIds.size})</span>
                        </button>
                        <button
                            type="button"
                            className="batch-dismiss-btn"
                            onClick={() => setSelectedRowIds(new Set())}
                            title="Clear selection"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Scrollable Spreadsheet Table Container */}
            {/* Scrollable Spreadsheet Table Container */}
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="spreadsheet-scroll-area"
                onPaste={(e) => onTablePaste(e, 0)}
                tabIndex={0}
            >
                <table className="spreadsheet-grid-table">
                    <thead>
                        <tr className="spreadsheet-header-row">
                            {allowDelete && (
                                <th className="col-select text-center whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="custom-table-checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAllToggle}
                                        title={isAllSelected ? "Deselect all rows" : "Select all rows"}
                                        aria-label="Select all rows"
                                    />
                                </th>
                            )}
                            <th className="col-idx text-center whitespace-nowrap">#</th>
                            <th className="col-status text-center whitespace-nowrap">ST</th>
                            <th className="col-branch whitespace-nowrap">BRANCH</th>
                            <th className="col-branch whitespace-nowrap">{isMIn ? "FROM BRANCH" : "TO BRANCH"}</th>
                            <th className="col-amount text-right whitespace-nowrap">AMOUNT (₹)</th>
                            <th className="col-comm text-right whitespace-nowrap">COMMISSION (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const rowNumber = row.displayIndex !== undefined ? row.displayIndex : idx + 1;

                            // 1. Reserved Empty Space for Unmatched / Missing Counterpart
                            if (row.isEmpty) {
                                const targetDisplayNum = focusedErrorDisplayRow || focusedErrorSourceRow || null;
                                const isTargetSheet = !focusedErrorSheet || sheet === focusedErrorSheet;
                                const isEmptyFocused = Boolean(
                                    isTargetSheet &&
                                    !focusedErrorTxnId &&
                                    targetDisplayNum &&
                                    Number(rowNumber) === Number(targetDisplayNum)
                                );
                                return (
                                    <tr
                                        key={row.id || `${sheet}-empty-${idx}`}
                                        id={`txn-empty-${sheet}-${rowNumber}`}
                                        data-sheet={sheet}
                                        data-display-row={rowNumber}
                                        className={`spreadsheet-row row-empty-slot ${
                                            isEmptyFocused ? "row-error-focus-active" : ""
                                        }`}
                                    >
                                        {allowDelete && (
                                            <td className="col-select cell-readonly text-center">
                                                <span className="empty-cell-dash">—</span>
                                            </td>
                                        )}
                                        {/* Row number stays identical on both sides */}
                                        <td className="col-idx cell-readonly text-center">
                                            <div className="flex items-center justify-center text-slate-500 font-mono text-xs">
                                                {rowNumber}
                                            </div>
                                        </td>
                                        <td className="col-status cell-readonly text-center">
                                            <span className="empty-slot-badge">—</span>
                                        </td>
                                        <td className="col-branch cell-empty-slot">
                                            <div className="grid-cell-empty-placeholder">
                                                <span>—</span>
                                            </div>
                                        </td>
                                        <td className="col-branch cell-empty-slot">
                                            <div className="grid-cell-empty-placeholder">
                                                <span>—</span>
                                            </div>
                                        </td>
                                        <td className="col-amount cell-empty-slot text-right">
                                            <div className="grid-cell-empty-placeholder text-right">
                                                <span>—</span>
                                            </div>
                                        </td>
                                        <td className="col-comm cell-empty-slot text-right">
                                            <div className="grid-cell-empty-placeholder text-right">
                                                <span>—</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            // 2. Normal Transaction Row
                            const branch1Prop = isMIn ? "toBranch" : "fromBranch";
                            const branch2Prop = isMIn ? "fromBranch" : "toBranch";
                            const branch1Field = isMIn ? "toBranchId" : "fromBranchId";
                            const branch2Field = isMIn ? "fromBranchId" : "toBranchId";

                            const resolveBranchCode = (isTo) => {
                                const directCode = isTo
                                    ? (row.toBranchCode || row.toBranchName)
                                    : (row.fromBranchCode || row.fromBranchName);
                                if (directCode) return directCode;
                                const branchId = isTo ? row.toBranchId : row.fromBranchId;
                                if (branchId) {
                                    const found = (branches || []).find((b) => String(b.id) === String(branchId));
                                    if (found) return found.code || found.name || "";
                                }
                                return "";
                            };

                            const branch1Value = resolveBranchCode(isMIn);
                            const branch2Value = resolveBranchCode(!isMIn);

                            const isRowUnsaved = unsavedChanges.has(row.id);
                            const errorFields = getRowErrorFields(row, isMIn);
                            const isBranch1Invalid = isMIn ? row.toBranchInvalid : row.fromBranchInvalid;
                            const isBranch2Invalid = isMIn ? row.fromBranchInvalid : row.toBranchInvalid;
                            const isBranch1Error = errorFields.has(branch1Field) || isBranch1Invalid;
                            const isBranch2Error = errorFields.has(branch2Field) || isBranch2Invalid;
                            const isAmountError = errorFields.has("amount");
                            const isCommError = errorFields.has("commission");

                            // Differentiate case where commission is collected on both M In and M Out sides
                            const isCommBothSides = Boolean(
                                isCommError && (
                                    row.errorType === "COMMISSION_BOTH_SIDES" ||
                                    (/dual/i.test(row.errorReason || "")) ||
                                    (/collected on both/i.test(row.errorReason || "")) ||
                                    (/both sides/i.test(row.errorReason || "") && !/zero|neither|not collected/i.test(row.errorReason || "")) ||
                                    (Number(row.commission) > 0 && (
                                        Number(row.matchDetails?.counterpartCommission) > 0 ||
                                        Number(row.counterpartCommission) > 0 ||
                                        Number(row.counterpartRow?.commission) > 0 ||
                                        !/zero|neither|missing|not collected/i.test(row.errorReason || "")
                                    ))
                                )
                            );

                            const rowDisplayNum = row.displayIndex !== undefined ? row.displayIndex : rowNumber;
                            const targetDisplayNum = focusedErrorDisplayRow || focusedErrorSourceRow || null;
                            const isTargetSheet = !focusedErrorSheet || sheet === focusedErrorSheet;

                            const isFocusedError = Boolean(
                                isTargetSheet &&
                                (
                                    focusedErrorTxnId
                                        ? (!row.isEmpty && (String(row.id) === String(focusedErrorTxnId) || Number(row.id) === Number(focusedErrorTxnId)))
                                        : (targetDisplayNum && Number(rowDisplayNum) === Number(targetDisplayNum))
                                )
                            );

                            return (
                                <tr
                                    key={row.id || `${sheet}-${idx}`}
                                    id={`txn-row-${row.id}`}
                                    data-sheet={sheet}
                                    data-row-id={row.id}
                                    data-source-row={row.sourceRow}
                                    data-display-row={rowNumber}
                                    className={`${getRowHighlightClass(row)} ${
                                        selectedRowIds.has(row.id) ? "row-batch-selected" : ""
                                    }`}
                                    onMouseEnter={() => {
                                        if (row.matchedTransactionId) {
                                            onHoverCounterpart(row.matchedTransactionId);
                                        }
                                    }}
                                    onMouseLeave={() => onHoverCounterpart(null)}
                                    onClick={(e) => handleRowClick(e, row)}
                                    onDoubleClick={(e) => handleRowDoubleClick(e, row)}
                                    title="Single-click to highlight match • Double-click to open Transaction Details"
                                >
                                    {/* Selection Checkbox (Only in Focus mode) */}
                                    {allowDelete && (
                                        <td className="col-select cell-readonly text-center">
                                            <input
                                                type="checkbox"
                                                className="custom-table-checkbox"
                                                checked={selectedRowIds.has(row.id)}
                                                onChange={(e) => handleToggleRow(e, row.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                onDoubleClick={(e) => e.stopPropagation()}
                                                aria-label={`Select row ${rowNumber}`}
                                            />
                                        </td>
                                    )}

                                    {/* Index */}
                                    <td className="col-idx cell-readonly text-center">
                                        <div className="flex items-center justify-center gap-1 font-mono text-xs">
                                            {isRowUnsaved && <span className="cell-unsaved-dot"></span>}
                                            {rowNumber}
                                        </div>
                                    </td>

                                    {/* Status Icon */}
                                    <td className="col-status cell-readonly text-center">
                                        {getStatusIcon(row.status)}
                                    </td>

                                    {/* Branch 1 */}
                                    <td className={`col-branch cell-editable ${isBranch1Error ? "cell-has-error" : ""}`}>
                                        <input
                                            type="text"
                                            data-field={branch1Prop}
                                            className={`grid-cell-input font-medium uppercase ${
                                                isFocusedError && (focusedErrorField === branch1Prop || focusedErrorField === "branch" || focusedErrorField === branch1Field)
                                                    ? "cell-focused-error-pulse"
                                                    : ""
                                            }`}
                                            placeholder="Code"
                                            maxLength={10}
                                            value={branch1Value}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, row.id, branch1Prop, e.target.value)
                                            }
                                            onBlur={(e) =>
                                                onBranchBlur && onBranchBlur(sheet, row.id, branch1Prop, e.target.value, rowNumber)
                                            }
                                            title={
                                                isBranch1Error
                                                    ? row.errorReason || (branch1Value ? `'${branch1Value}' is not recognized in the database.` : "Branch code is required.")
                                                    : undefined
                                            }
                                        />
                                    </td>

                                    {/* Branch 2 (From or To) */}
                                    <td className={`col-branch cell-editable ${isBranch2Error ? "cell-has-error" : ""}`}>
                                        <input
                                            type="text"
                                            data-field={branch2Prop}
                                            className={`grid-cell-input font-medium uppercase ${
                                                isFocusedError && (focusedErrorField === branch2Prop || focusedErrorField === "branch" || focusedErrorField === branch2Field)
                                                    ? "cell-focused-error-pulse"
                                                    : ""
                                            }`}
                                            placeholder="Code"
                                            maxLength={10}
                                            value={branch2Value}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, row.id, branch2Prop, e.target.value)
                                            }
                                            onBlur={(e) =>
                                                onBranchBlur && onBranchBlur(sheet, row.id, branch2Prop, e.target.value, rowNumber)
                                            }
                                            title={
                                                isBranch2Error
                                                    ? row.errorReason || (branch2Value ? `'${branch2Value}' is not recognized in the database.` : "Branch code is required.")
                                                    : undefined
                                            }
                                        />
                                    </td>

                                    {/* Amount */}
                                    <td className={`col-amount cell-editable ${isAmountError ? "cell-has-error" : ""}`}>
                                        <input
                                            type="number"
                                            data-field="amount"
                                            min="0"
                                            step="100"
                                            className={`grid-cell-input text-right font-medium ${
                                                isFocusedError && focusedErrorField === "amount"
                                                    ? "cell-focused-error-pulse"
                                                    : ""
                                            }`}
                                            placeholder="0"
                                            value={row.amount}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, row.id, "amount", e.target.value)
                                            }
                                            title={isAmountError ? row.errorReason || "Amount mismatch issue" : undefined}
                                        />
                                    </td>

                                    {/* Commission */}
                                    <td className={`col-comm cell-editable ${
                                        isCommBothSides
                                            ? "cell-has-dual-comm-error"
                                            : (isCommError ? "cell-has-error" : "")
                                    }`}>
                                        <input
                                            type="number"
                                            data-field="commission"
                                            min="0"
                                            step="10"
                                            className={`grid-cell-input text-right ${
                                                isFocusedError && focusedErrorField === "commission"
                                                    ? "cell-focused-error-pulse"
                                                    : ""
                                            }`}
                                            placeholder="0"
                                            value={row.commission}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, row.id, "commission", e.target.value)
                                            }
                                            title={
                                                isCommBothSides
                                                    ? row.errorReason || "Commission collected on both M In and M Out"
                                                    : (isCommError ? row.errorReason || "Commission issue" : undefined)
                                            }
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={allowDelete ? 7 : 6} className="table-empty-cell-wrapper">
                                    <div className="table-empty-state-card">
                                        <div className="table-empty-icon-wrap">
                                            <FileSpreadsheet size={32} className="table-empty-icon" />
                                        </div>
                                        <h4 className="table-empty-title">
                                            {totalRowCount === 0
                                                ? `No Transactions in ${title}`
                                                : "No Matching Transactions Found"}
                                        </h4>
                                        <p className="table-empty-desc">
                                            {totalRowCount === 0
                                                ? `This ${title} spreadsheet is currently empty. Insert empty editable rows to begin entering branch data, or paste copied cells directly from Microsoft Excel.`
                                                : "No transactions match your current search query or filter. Reset filters to view all records."}
                                        </p>
                                        {totalRowCount === 0 ? (
                                            <div className="table-empty-actions">
                                                <button
                                                    type="button"
                                                    className="table-empty-btn table-empty-btn-primary"
                                                    onClick={onOpenAddRows}
                                                >
                                                    <Plus size={15} />
                                                    + Add Rows
                                                </button>
                                                <button
                                                    type="button"
                                                    className="table-empty-btn table-empty-btn-secondary"
                                                    onClick={onOpenPasteModal}
                                                >
                                                    <ClipboardPaste size={15} />
                                                    Paste from Excel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="table-empty-actions">
                                                <button
                                                    type="button"
                                                    className="table-empty-btn table-empty-btn-secondary"
                                                    onClick={onClearFilters}
                                                >
                                                    Clear Filters
                                                </button>
                                            </div>
                                        )}
                                        <div className="table-empty-format-hint">
                                            <span className="hint-pill">Excel Format:</span>
                                            <code>
                                                {isMIn
                                                    ? "[BRANCH]  [From BRANCH]  [AMOUNT]  [COMMISSION]"
                                                    : "[BRANCH]  [To BRANCH]  [AMOUNT]  [COMMISSION]"}
                                            </code>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Confirmation Dialog for Multi-Row Deletion */}
            <ConfirmDeleteModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                count={selectedRowIds.size}
                sheetTitle={title}
                totalAmount={selectedTotalAmount}
            />
        </div>
    );
}