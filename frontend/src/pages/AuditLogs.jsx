import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuditLogSummaries } from "../services/mockApi";
import { useApp } from "../context/AppContext";
import {
    Search,
    RotateCw,
    Eye,
    ChevronLeft,
    ChevronRight,
    X
} from "lucide-react";

export default function AuditLogs() {
    const navigate = useNavigate();
    const { refreshSignal } = useApp();

    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const loadAuditData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAuditLogSummaries({ action: actionFilter });
            setSummaries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load audit summaries:", err);
        } finally {
            setLoading(false);
        }
    }, [actionFilter]);

    useEffect(() => {
        loadAuditData();
    }, [loadAuditData, refreshSignal]);

    const actions = [
        "ALL",
        "RECONCILIATION_CREATED",
        "RECONCILIATION_EXECUTED",
        "RECONCILIATION_RERUN",
        "TRANSACTION_UPDATED",
        "TRANSACTIONS_BULK_SAVED",
        "ERROR_RESOLVED"
    ];

    const filteredSummaries = useMemo(() => {
        if (!searchQuery) return summaries;
        const q = searchQuery.toLowerCase();
        return summaries.filter((s) =>
            s.reconciliationName?.toLowerCase().includes(q) ||
            s.user?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.action?.toLowerCase().includes(q)
        );
    }, [summaries, searchQuery]);

    const totalPages = Math.ceil(filteredSummaries.length / pageSize) || 1;

    // Keep currentPage within valid bounds
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
                    <h1 className="page-main-heading">Audit History &amp; Compliance</h1>
                    <p className="page-sub-heading">
                        Immutable regulatory audit trail logging every reconciliation.
                    </p>
                </div>

                <div className="page-header-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={loadAuditData}
                        disabled={loading}
                    >
                        <RotateCw size={14} className={loading ? "spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filter toolbar: Search, Action Filter, and Pagination on a single horizontal line */}
            <div className="content-card audit-toolbar-card">
                <div className="audit-toolbar-row">
                    <div className="audit-search-box">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            className="workspace-search-input"
                            placeholder="Search audit trail by reconciliation, user, action..."
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
                        <span className="audit-filter-label">Action:</span>
                        <select
                            className="audit-action-select"
                            value={actionFilter}
                            onChange={(e) => {
                                setActionFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            {actions.map((act) => (
                                <option key={act} value={act}>
                                    {act.replace(/_/g, " ")}
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
                    <table className="enterprise-data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Reconciliation</th>
                                <th>Action Event</th>
                                <th>Prior State</th>
                                <th>New State</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="table-loading-cell">
                                        Loading audit history trail...
                                    </td>
                                </tr>
                            ) : paginatedSummaries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="table-empty-cell">
                                        No audit events matching current criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedSummaries.map((summary) => (
                                    <tr key={summary.groupKey}>
                                        <td className="text-xs font-mono text-slate-400 whitespace-nowrap">
                                            {formatDate(summary.latestTimestamp)}
                                        </td>
                                        <td>
                                            <div className="text-xs font-semibold text-slate-100">{summary.user}</div>
                                        </td>
                                        <td>
                                            <div className="rec-summary-cell">
                                                <button
                                                    type="button"
                                                    className="error-rec-name-btn"
                                                    onClick={() => summary.reconciliationId && navigate(`/reconciliations/${summary.reconciliationId}?tab=audit`)}
                                                    title={`Open ${summary.reconciliationName} audit trail`}
                                                >
                                                    {summary.reconciliationName}
                                                </button>
                                                <span className="audit-records-badge">
                                                    {summary.totalRecords} {summary.totalRecords === 1 ? "record" : "records"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="audit-action-badge">
                                                {summary.action}
                                            </span>
                                        </td>
                                        <td className="text-xs text-slate-400 max-w-xs truncate">
                                            {summary.oldValue || "—"}
                                        </td>
                                        <td className="text-xs text-slate-200 font-semibold max-w-xs truncate">
                                            {summary.newValue || "—"}
                                        </td>
                                        <td className="text-center">
                                            {summary.reconciliationId ? (
                                                <button
                                                    type="button"
                                                    className="audit-view-all-btn"
                                                    onClick={() => navigate(`/reconciliations/${summary.reconciliationId}?tab=audit`)}
                                                    title={`View all ${summary.totalRecords} audit records for ${summary.reconciliationName}`}
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