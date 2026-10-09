import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../context/AppContext";
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

export default function TransactionWorkspace({ reconciliationId, onReconciliationUpdated }) {
    const { addToast } = useApp();

    const [mInRows, setMInRows] = useState([]);
    const [mOutRows, setMOutRows] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    // Search and filter
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, MATCHED, UNMATCHED, ERROR

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
        return {
            ...txn,
            amount: txn.amount !== null && txn.amount !== undefined ? String(txn.amount) : "",
            commission: txn.commission !== null && txn.commission !== undefined ? String(txn.commission) : "0",
            isNew: false,
            original: {
                fromBranchId: txn.fromBranchId,
                toBranchId: txn.toBranchId,
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

            const ins = (txns || [])
                .filter((t) => t.sourceSheet === "M_IN")
                .sort((a, b) => (a.sourceRow || 0) - (b.sourceRow || 0));

            const outs = (txns || [])
                .filter((t) => t.sourceSheet === "M_OUT")
                .sort((a, b) => (a.sourceRow || 0) - (b.sourceRow || 0));

            setMInRows(ins.map(toEditableRow));
            setMOutRows(outs.map(toEditableRow));
            setUnsavedChanges(new Set());
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
    }, [loadWorkspaceData]);

    function createBlankRow(sheet, index) {
        return {
            id: `temp-${sheet}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            reconciliationId: Number(reconciliationId),
            sourceSheet: sheet,
            sourceRow: index + 1,
            fromBranchId: sheet === "M_IN" ? 5 : 1, // Default Salem or Chennai
            fromBranchName: sheet === "M_IN" ? "Salem" : "Chennai",
            toBranchId: sheet === "M_IN" ? 1 : 3, // Default Chennai or Coimbatore
            toBranchName: sheet === "M_IN" ? "Chennai" : "Coimbatore",
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

    const handleCellChange = (sheet, rowIndex, field, value) => {
        const isMIn = sheet === "M_IN";
        const setter = isMIn ? setMInRows : setMOutRows;

        setter((prev) => {
            const updated = [...prev];
            const target = { ...updated[rowIndex], [field]: value };

            if (field === "fromBranchId") {
                const b = branches.find((item) => String(item.id) === String(value));
                target.fromBranchName = b ? b.name : "";
            } else if (field === "toBranchId") {
                const b = branches.find((item) => String(item.id) === String(value));
                target.toBranchName = b ? b.name : "";
            }

            updated[rowIndex] = target;

            // Track unsaved
            setUnsavedChanges((current) => {
                const next = new Set(current);
                next.add(target.id || `row-${sheet}-${rowIndex}`);
                return next;
            });

            return updated;
        });
    };

    // =========================================================================
    // EXCEL CLIPBOARD COPY & PASTE PARSER (Ctrl+V and Pasting TSV/CSV)
    // =========================================================================
    const handlePasteData = (sheet, rawText, startRowIndex = 0) => {
        if (!rawText || !rawText.trim()) return;

        const lines = rawText.trim().split(/\r\n|\n|\r/);
        const parsedRows = [];

        lines.forEach((line) => {
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

            // Structure expected:
            // For M In: [BRANCH, From BRANCH, AMOUNT, COMMISSION]
            // For M Out: [BRANCH, To BRANCH, AMOUNT, COMMISSION]
            if (parts.length >= 2) {
                const branch1Text = parts[0] || "";
                const branch2Text = parts[1] || "";
                const amountText = (parts[2] || "").replace(/[^0-9.]/g, "");
                const commText = (parts[3] || "0").replace(/[^0-9.]/g, "");

                const findBranchId = (text) => {
                    const match = branches.find(
                        (b) => b.name.toLowerCase() === text.toLowerCase() || b.code.toLowerCase() === text.toLowerCase()
                    );
                    return match ? match.id : 1;
                };

                const findBranchName = (text) => {
                    const match = branches.find(
                        (b) => b.name.toLowerCase() === text.toLowerCase() || b.code.toLowerCase() === text.toLowerCase()
                    );
                    return match ? match.name : "Chennai";
                };

                if (sheet === "M_IN") {
                    // M In: BRANCH is toBranch, From BRANCH is fromBranch
                    parsedRows.push({
                        toBranchId: findBranchId(branch1Text),
                        toBranchName: findBranchName(branch1Text),
                        fromBranchId: findBranchId(branch2Text),
                        fromBranchName: findBranchName(branch2Text),
                        amount: amountText || "100000",
                        commission: commText || "0"
                    });
                } else {
                    // M Out: BRANCH is fromBranch, To BRANCH is toBranch
                    parsedRows.push({
                        fromBranchId: findBranchId(branch1Text),
                        fromBranchName: findBranchName(branch1Text),
                        toBranchId: findBranchId(branch2Text),
                        toBranchName: findBranchName(branch2Text),
                        amount: amountText || "100000",
                        commission: commText || "0"
                    });
                }
            }
        });

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
                if (!row.fromBranchId) validationErrors.push(`${sheetName} row ${i + 1}: From Branch is required.`);
                if (!row.toBranchId) validationErrors.push(`${sheetName} row ${i + 1}: To Branch is required.`);
                if (!row.amount || Number(row.amount) <= 0) validationErrors.push(`${sheetName} row ${i + 1}: Positive amount required.`);
            });

            if (validationErrors.length > 0) {
                addToast({
                    type: "error",
                    title: "Validation Incomplete",
                    message: validationErrors.slice(0, 3).join(" • ")
                });
                return;
            }

            const newRows = allRows.filter((r) => r.isNew);
            const updatedRows = allRows.filter((r) => !r.isNew && unsavedChanges.has(r.id));

            await saveTransactions(reconciliationId, { newRows, updatedRows });

            setUnsavedChanges(new Set());
            addToast({
                type: "success",
                title: "Transactions Saved",
                message: `Saved ${newRows.length + updatedRows.length} transaction record(s) to mock store.`
            });

            if (onReconciliationUpdated) {
                onReconciliationUpdated();
            }
            await loadWorkspaceData();
        } catch (err) {
            addToast({
                type: "error",
                title: "Save Failed",
                message: err.message
            });
        } finally {
            setSaving(false);
        }
    };

    // Filtered lists
    const filteredMIn = useMemo(() => {
        return mInRows.filter((row) => {
            if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const fromMatch = row.fromBranchName?.toLowerCase().includes(q);
                const toMatch = row.toBranchName?.toLowerCase().includes(q);
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
                const fromMatch = row.fromBranchName?.toLowerCase().includes(q);
                const toMatch = row.toBranchName?.toLowerCase().includes(q);
                const amtMatch = String(row.amount).includes(q);
                return fromMatch || toMatch || amtMatch;
            }
            return true;
        });
    }, [mOutRows, statusFilter, searchQuery]);

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
            message: `Successfully removed ${rowIdsToDelete.length} row(s) from ${isMIn ? "M In" : "M Out"}. Reconciliation volume updated.`
        });
    };

    const handleSelectAndScrollCounterpart = (row) => {
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

        if (matchId) {
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
                            placeholder="Filter transactions by branch or amount..."
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
                    {unsavedChanges.size > 0 && (
                        <div className="unsaved-badge animate-pulse">
                            <span className="unsaved-dot"></span>
                            {unsavedChanges.size} unsaved change(s)
                        </div>
                    )}

                    <button
                        type="button"
                        className="primary-button save-workspace-btn"
                        onClick={handleSaveTransactions}
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? "Saving..." : "Save Transactions"}
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
                        rows={filteredMIn}
                        totalRowCount={mInRows.length}
                        branches={branches}
                        unsavedChanges={unsavedChanges}
                        hoveredCounterpartId={hoveredCounterpartId}
                        selectedTransactionId={selectedTransaction?.id}
                        counterpartTransactionId={counterpartTransactionId}
                        allowDelete={viewMode === "m_in"}
                        onHoverCounterpart={setHoveredCounterpartId}
                        onSelectRow={handleSelectAndScrollCounterpart}
                        onInspectRow={(row) => setDetailModalTxn(row)}
                        onCellChange={handleCellChange}
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
                        rows={filteredMOut}
                        totalRowCount={mOutRows.length}
                        branches={branches}
                        unsavedChanges={unsavedChanges}
                        hoveredCounterpartId={hoveredCounterpartId}
                        selectedTransactionId={selectedTransaction?.id}
                        counterpartTransactionId={counterpartTransactionId}
                        allowDelete={viewMode === "m_out"}
                        onHoverCounterpart={setHoveredCounterpartId}
                        onSelectRow={handleSelectAndScrollCounterpart}
                        onInspectRow={(row) => setDetailModalTxn(row)}
                        onCellChange={handleCellChange}
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
                            <p className="text-xs text-slate-500 mb-2">
                                Copy cells directly from Microsoft Excel (or Google Sheets) and paste (Ctrl+V) into this box:
                            </p>
                            <textarea
                                rows={6}
                                className="form-textarea font-mono text-xs w-full"
                                placeholder={`Example:\nChennai\tSalem\t100000\t150\nChennai\tCoimbatore\t250000\t120`}
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
}

// =============================================================================
// SUB-COMPONENT: SPREADSHEET TABLE (M In / M Out)
// =============================================================================
function SpreadsheetTable({
    title,
    sheet,
    subtitle,
    rows,
    totalRowCount,
    branches,
    unsavedChanges,
    hoveredCounterpartId,
    selectedTransactionId,
    counterpartTransactionId,
    allowDelete = false,
    onHoverCounterpart,
    onSelectRow,
    onInspectRow,
    onCellChange,
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

        let statusClass = "status-row-default";
        if (row.status === "MATCHED") {
            statusClass = "status-row-matched";
        } else if (row.status === "UNMATCHED") {
            statusClass = "status-row-unmatched";
        } else if (row.status === "ERROR") {
            statusClass = "status-row-error";
        }

        let linkClass = "";
        if (isSelected) {
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
            if (errorType === "COMMISSION_ERROR" || reason.includes("commission")) {
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
            <div
                className="spreadsheet-scroll-area"
                onPaste={(e) => onTablePaste(e, 0)}
                tabIndex={0}
            >
                <table className="spreadsheet-grid-table">
                    <thead>
                        <tr>
                            {allowDelete && (
                                <th className="col-select text-center">
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
                            <th className="col-idx">#</th>
                            <th className="col-status">ST</th>
                            <th className="col-branch">BRANCH</th>
                            <th className="col-branch">{isMIn ? "From BRANCH" : "To BRANCH"}</th>
                            <th className="col-amount text-right">AMOUNT (₹)</th>
                            <th className="col-comm text-right">COMMISSION (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const branch1Field = isMIn ? "toBranchId" : "fromBranchId";
                            const branch2Field = isMIn ? "fromBranchId" : "toBranchId";
                            const isRowUnsaved = unsavedChanges.has(row.id);
                            const errorFields = getRowErrorFields(row, isMIn);
                            const isBranch1Error = errorFields.has(branch1Field);
                            const isBranch2Error = errorFields.has(branch2Field);
                            const isAmountError = errorFields.has("amount");
                            const isCommError = errorFields.has("commission");

                            return (
                                <tr
                                    key={row.id || `${sheet}-${idx}`}
                                    id={`txn-row-${row.id}`}
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
                                    title="Single-click to locate counterpart in other table • Double-click to open Transaction Details"
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
                                                aria-label={`Select row ${idx + 1}`}
                                            />
                                        </td>
                                    )}

                                    {/* Index */}
                                    <td className="col-idx cell-readonly">
                                        <div className="flex items-center justify-center gap-1">
                                            {isRowUnsaved && <span className="cell-unsaved-dot"></span>}
                                            {idx + 1}
                                        </div>
                                    </td>

                                    {/* Status Icon */}
                                    <td className="col-status cell-readonly text-center">
                                        {getStatusIcon(row.status)}
                                    </td>

                                    {/* Branch 1 */}
                                    <td className={`col-branch cell-editable ${isBranch1Error ? "cell-has-error" : ""}`}>
                                        <select
                                            className="grid-cell-select"
                                            value={row[branch1Field] || ""}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, idx, branch1Field, e.target.value)
                                            }
                                            title={isBranch1Error ? row.errorReason || "Branch mismatch issue" : undefined}
                                        >
                                            <option value="">Select branch</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Branch 2 (From or To) */}
                                    <td className={`col-branch cell-editable ${isBranch2Error ? "cell-has-error" : ""}`}>
                                        <select
                                            className="grid-cell-select"
                                            value={row[branch2Field] || ""}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, idx, branch2Field, e.target.value)
                                            }
                                            title={isBranch2Error ? row.errorReason || "Branch mismatch issue" : undefined}
                                        >
                                            <option value="">Select branch</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* Amount */}
                                    <td className={`col-amount cell-editable ${isAmountError ? "cell-has-error" : ""}`}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            className="grid-cell-input text-right font-medium"
                                            placeholder="0"
                                            value={row.amount}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, idx, "amount", e.target.value)
                                            }
                                            title={isAmountError ? row.errorReason || "Amount mismatch issue" : undefined}
                                        />
                                    </td>

                                    {/* Commission */}
                                    <td className={`col-comm cell-editable ${isCommError ? "cell-has-error" : ""}`}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="10"
                                            className="grid-cell-input text-right"
                                            placeholder="0"
                                            value={row.commission}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                                onCellChange(sheet, idx, "commission", e.target.value)
                                            }
                                            title={isCommError ? row.errorReason || "Commission issue" : undefined}
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