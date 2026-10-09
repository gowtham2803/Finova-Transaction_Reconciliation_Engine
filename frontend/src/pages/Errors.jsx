import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAllErrors, resolveError } from "../services/mockApi";
import { useApp } from "../context/AppContext";
import ResolveErrorModal from "../components/modals/ResolveErrorModal";
import {
    Search,
    CheckCircle2,
    RotateCw
} from "lucide-react";

export default function Errors() {
    const navigate = useNavigate();
    const { addToast, refreshSignal, triggerRefresh } = useApp();

    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, OPEN, RESOLVED
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [resolvingError, setResolvingError] = useState(null);

    const loadErrorsData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAllErrors();
            setErrors(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadErrorsData();
    }, [loadErrorsData, refreshSignal]);

    const handleConfirmResolve = async (errorId, notes) => {
        await resolveError(errorId, notes);
        await loadErrorsData();
        triggerRefresh();
        addToast({
            type: "success",
            title: "Error Resolved",
            message: `Exception voucher ${errorId} resolved successfully.`
        });
    };

    const errorTypes = [
        "ALL",
        "COMMISSION_ERROR",
        "AMOUNT_MISMATCH",
        "MISSING_TRANSACTION",
        "BRANCH_MISMATCH",
        "DUPLICATE_WARNING"
    ];

    const filtered = useMemo(() => {
        return errors.filter((err) => {
            if (statusFilter !== "ALL" && err.status !== statusFilter) return false;
            if (typeFilter !== "ALL" && err.errorType !== typeFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    err.id?.toLowerCase().includes(q) ||
                    err.reconciliationName?.toLowerCase().includes(q) ||
                    err.description?.toLowerCase().includes(q) ||
                    err.transactionInfo?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [errors, statusFilter, typeFilter, searchQuery]);

    const formatDate = (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    return (
        <div className="errors-page-container">
            <div className="page-header-row">
                <div>
                    <h1 className="page-main-heading">Reconciliation Errors &amp; Exceptions</h1>
                    <p className="page-sub-heading">
                        Enterprise exception management for commission variances, amount mismatches, and orphan transactions.
                    </p>
                </div>

                <div className="page-header-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={loadErrorsData}
                        disabled={loading}
                    >
                        <RotateCw size={14} className={loading ? "spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filter toolbar */}
            <div className="content-card mb-4 p-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="search-input-wrapper max-w-md flex-1">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            className="workspace-search-input"
                            placeholder="Search by error ID, transaction details, or batch name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 mr-2">
                            <span className="text-xs font-semibold text-slate-500">Status:</span>
                            {["ALL", "OPEN", "RESOLVED"].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    className={`filter-btn-pill ${statusFilter === status ? "filter-btn-pill-active" : ""}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500">Type:</span>
                            <select
                                className="form-input text-xs py-1 px-2 h-8"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                {errorTypes.map((t) => (
                                    <option key={t} value={t}>
                                        {t.replace("_", " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="content-card">
                <div className="table-responsive-container">
                    <table className="enterprise-data-table">
                        <thead>
                            <tr>
                                <th>Error ID</th>
                                <th>Reconciliation Batch</th>
                                <th>Transaction Context</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="table-loading-cell">
                                        Loading reconciliation exceptions...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="table-empty-cell">
                                        No errors found matching your filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((err) => (
                                    <tr key={err.id}>
                                        <td className="font-mono text-xs font-semibold text-slate-100">
                                            {err.id}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="text-left font-semibold text-blue-400 hover:underline text-xs"
                                                onClick={() => navigate(`/reconciliations/${err.reconciliationId}`)}
                                            >
                                                {err.reconciliationName || `Reconciliation #${err.reconciliationId}`}
                                            </button>
                                        </td>
                                        <td className="text-xs font-medium text-slate-300">
                                            {err.transactionInfo}
                                        </td>
                                        <td>
                                            <span className="error-type-badge">
                                                {err.errorType}
                                            </span>
                                        </td>
                                        <td className="text-xs text-slate-300 max-w-sm">
                                            <div>{err.description}</div>
                                            {err.resolutionNotes && (
                                                <div className="resolution-note-snippet mt-1">
                                                    <strong>Resolution:</strong> {err.resolutionNotes}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${
                                                err.status === "RESOLVED" ? "status-success" : "status-error"
                                            }`}>
                                                {err.status}
                                            </span>
                                        </td>
                                        <td className="text-xs text-slate-400 whitespace-nowrap">
                                            {formatDate(err.createdAt)}
                                        </td>
                                        <td className="text-center">
                                            {err.status === "OPEN" ? (
                                                <button
                                                    type="button"
                                                    className="resolve-action-btn"
                                                    onClick={() => setResolvingError(err)}
                                                >
                                                    <CheckCircle2 size={13} />
                                                    <span>Resolve</span>
                                                </button>
                                            ) : (
                                                <span className="text-xs text-emerald-400 font-medium">
                                                    ✓ Resolved
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resolve Error Modal */}
            <ResolveErrorModal
                isOpen={!!resolvingError}
                onClose={() => setResolvingError(null)}
                error={resolvingError}
                onConfirmResolve={handleConfirmResolve}
            />
        </div>
    );
}