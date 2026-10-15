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
        return errors
            .filter((err) => {
                if (statusFilter !== "ALL" && err.status !== statusFilter) return false;
                if (typeFilter !== "ALL" && err.errorType !== typeFilter) return false;
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    return (
                        String(err.id)?.toLowerCase().includes(q) ||
                        err.reconciliationName?.toLowerCase().includes(q) ||
                        err.description?.toLowerCase().includes(q) ||
                        err.transactionInfo?.toLowerCase().includes(q)
                    );
                }
                return true;
            })
            .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
                return Number(b.id) - Number(a.id);
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
                        Enterprise exception management.
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
            <div className="content-card errors-toolbar-card">
                <div className="errors-toolbar-row">
                    <div className="errors-search-box">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            className="workspace-search-input"
                            placeholder="Search by error, transaction, or reconciliation..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="errors-filter-group">
                        <span className="errors-filter-label">Status:</span>
                        <div className="errors-pills-wrap">
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
                    </div>

                    <div className="errors-filter-group">
                        <span className="errors-filter-label">Type:</span>
                        <select
                            className="errors-type-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            {errorTypes.map((t) => (
                                <option key={t} value={t}>
                                    {t.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="content-card">
                <div className="table-responsive-container">
                    <table className="enterprise-data-table">
                        <thead>
                            <tr>
                                <th className="sno-col">S.No</th>
                                <th>Reconciliation</th>
                                <th>Transaction</th>
                                <th>Error</th>
                                <th>Error Detail</th>
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
                                filtered.map((err, index) => (
                                    <tr key={err.id}>
                                        <td className="sno-col">
                                            {index + 1}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="error-rec-name-btn"
                                                onClick={() => navigate(`/reconciliations/${err.reconciliationId}`)}
                                                title={`Open ${err.reconciliationName || `Reconciliation #${err.reconciliationId}`}`}
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