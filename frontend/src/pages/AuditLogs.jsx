import { useState, useEffect, useMemo, useCallback } from "react";
import { getAuditLogs } from "../services/mockApi";
import { useApp } from "../context/AppContext";
import {
    Search,
    RotateCw
} from "lucide-react";

export default function AuditLogs() {
    const { refreshSignal } = useApp();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("ALL");

    const loadAuditData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAuditLogs();
            setLogs(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, []);

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

    const filtered = useMemo(() => {
        return logs.filter((l) => {
            if (actionFilter !== "ALL" && l.action !== actionFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    l.description?.toLowerCase().includes(q) ||
                    l.reconciliationName?.toLowerCase().includes(q) ||
                    l.user?.toLowerCase().includes(q) ||
                    l.action?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [logs, actionFilter, searchQuery]);

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
                        Immutable regulatory audit trail logging every reconciliation execution, ledger modification, and exception sign-off.
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

            {/* Filter toolbar */}
            <div className="content-card mb-4 p-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="search-input-wrapper max-w-md flex-1">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            className="workspace-search-input"
                            placeholder="Search audit trail by description, user, or batch name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Action:</span>
                        <select
                            className="form-input text-xs py-1 px-2 h-8"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        >
                            {actions.map((act) => (
                                <option key={act} value={act}>
                                    {act.replace(/_/g, " ")}
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
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action Event</th>
                                <th>Entity Target</th>
                                <th>Reconciliation Batch</th>
                                <th>Prior State</th>
                                <th>New State</th>
                                <th>Operational Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="table-loading-cell">
                                        Loading audit history trail...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="table-empty-cell">
                                        No audit events matching current criteria.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((log) => (
                                    <tr key={log.id}>
                                        <td className="text-xs font-mono text-slate-400 whitespace-nowrap">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td>
                                            <div className="text-xs font-semibold text-slate-100">{log.user}</div>
                                        </td>
                                        <td>
                                            <span className="audit-action-badge">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="text-xs text-slate-300 font-medium">
                                            {log.entity} {log.entityId ? `#${log.entityId}` : ""}
                                        </td>
                                        <td className="text-xs text-slate-200 font-medium">
                                            {log.reconciliationName || "—"}
                                        </td>
                                        <td className="text-xs text-slate-400 max-w-xs truncate">
                                            {log.oldValue || "—"}
                                        </td>
                                        <td className="text-xs text-slate-200 font-semibold max-w-xs truncate">
                                            {log.newValue || "—"}
                                        </td>
                                        <td className="text-xs text-slate-300 max-w-sm">
                                            {log.description}
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