import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorSummaries } from "../services/mockApi";
import { useApp } from "../context/AppContext";
import {
    Search,
    RotateCw,
    Eye,
    ChevronLeft,
    ChevronRight,
    X
} from "lucide-react";

export default function Errors() {
    const navigate = useNavigate();
    const { refreshSignal } = useApp();

    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, OPEN, RESOLVED
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const loadErrorsData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getErrorSummaries();
            setSummaries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load error summaries:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadErrorsData();
    }, [loadErrorsData, refreshSignal]);

    const errorTypes = [
        "ALL",
        "MISSING_M_IN",
        "MISSING_M_OUT",
        "COMMISSION_ERROR",
        "AMOUNT_MISMATCH",
        "MISSING_TRANSACTION",
        "BRANCH_MISMATCH",
        "DUPLICATE_WARNING"
    ];

    const filteredSummaries = useMemo(() => {
        return summaries.filter((group) => {
            if (statusFilter !== "ALL") {
                if (statusFilter === "OPEN" && group.openErrorsCount === 0) return false;
                if (statusFilter === "RESOLVED" && group.openErrorsCount > 0) return false;
            }
            if (typeFilter !== "ALL" && group.latestErrorType !== typeFilter) {
                return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
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
    }, [summaries, statusFilter, typeFilter, searchQuery]);

    const totalPages = Math.ceil(filteredSummaries.length / pageSize) || 1;

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    const paginatedSummaries = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredSummaries.slice(start, start + pageSize);
    }, [filteredSummaries, currentPage, pageSize]);

    const formatDate = (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    };

    return (
        <div className="audit-page-container">
            <div className="page-header-row">
                <div>
                    <h1 className="page-main-heading">Reconciliation Errors &amp; Exceptions</h1>
                    <p className="page-sub-heading">
                        Enterprise exception management grouped by reconciliation.
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

            {/* Filter toolbar: Search, Status Filter, Type Filter, and Pagination on a single horizontal line */}
            <div className="content-card audit-toolbar-card">
                <div className="audit-toolbar-row">
                    <div className="audit-search-box">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            className="workspace-search-input"
                            placeholder="Search errors by reconciliation, user, type..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="rec-search-clear"
                                onClick={() => {
                                    setSearchQuery("");
                                    setCurrentPage(1);
                                }}
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="audit-filter-group">
                        <span className="audit-filter-label">Status:</span>
                        <select
                            className="audit-action-select"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="ALL">ALL</option>
                            <option value="OPEN">OPEN</option>
                            <option value="RESOLVED">RESOLVED</option>
                        </select>
                    </div>

                    <div className="audit-filter-group">
                        <span className="audit-filter-label">Type:</span>
                        <select
                            className="audit-action-select"
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            {errorTypes.map((t) => (
                                <option key={t} value={t}>
                                    {t.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rec-pagination-nav">
                        <button
                            type="button"
                            className="rec-pagination-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            title="Previous Page"
                        >
                            <ChevronLeft size={14} />
                            <span>Previous</span>
                        </button>

                        <div className="rec-pagination-indicator">
                            Page <span className="rec-pagination-current">{currentPage}</span> of <span className="rec-pagination-total">{totalPages}</span>
                        </div>

                        <button
                            type="button"
                            className="rec-pagination-btn"
                            disabled={currentPage >= totalPages || totalPages === 0}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            title="Next Page"
                        >
                            <span>Next</span>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="content-card">
                <div className="table-responsive-container">
                    <table className="enterprise-data-table errors-summary-table">
                        <thead>
                            <tr>
                                <th className="col-timestamp">Timestamp</th>
                                <th className="col-user">User</th>
                                <th className="col-rec">Reconciliation</th>
                                <th className="col-errors">Error Count</th>
                                <th className="col-status">Status</th>
                                <th className="col-action text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="table-loading-cell">
                                        Loading reconciliation exceptions...
                                    </td>
                                </tr>
                            ) : paginatedSummaries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="table-empty-cell">
                                        No errors found matching your filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedSummaries.map((group) => (
                                    <tr key={group.groupKey}>
                                        <td className="col-timestamp text-xs font-mono text-slate-400 whitespace-nowrap">
                                            {formatDate(group.latestTimestamp)}
                                        </td>
                                        <td className="col-user whitespace-nowrap">
                                            <div className="text-xs font-semibold text-slate-100">{group.user}</div>
                                        </td>
                                        <td className="col-rec">
                                            <button
                                                type="button"
                                                className="error-rec-name-btn"
                                                onClick={() => group.reconciliationId && navigate(`/reconciliations/${group.reconciliationId}?tab=errors`)}
                                                title={`Open ${group.reconciliationName} errors`}
                                            >
                                                {group.reconciliationName}
                                            </button>
                                        </td>
                                        <td className="col-errors whitespace-nowrap">
                                            <span className="audit-records-badge">
                                                {group.totalErrors} {group.totalErrors === 1 ? "error" : "errors"}
                                            </span>
                                        </td>
                                        <td className="col-status whitespace-nowrap">
                                            <span className={`status-badge ${group.openErrorsCount > 0 ? "status-error" : "status-success"}`}>
                                                {group.openErrorsCount > 0 ? "OPEN" : "RESOLVED"}
                                            </span>
                                        </td>
                                        <td className="col-action text-center whitespace-nowrap">
                                            {group.reconciliationId ? (
                                                <button
                                                    type="button"
                                                    className="audit-view-all-btn"
                                                    onClick={() => navigate(`/reconciliations/${group.reconciliationId}?tab=errors`)}
                                                    title={`View all ${group.totalErrors} error records for ${group.reconciliationName}`}
                                                >
                                                    <Eye size={13} />
                                                    <span>View All</span>
                                                </button>
                                            ) : (
                                                <span className="text-slate-500 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}