import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    getReconciliation,
    getReconciliationErrors,
    getReconciliationResults,
    runReconciliation,
    resolveError,
    getAuditLogs
} from "../services/mockApi";
import { useApp } from "../context/AppContext";
import TransactionWorkspace from "../components/common/TransactionWorkspace";
import RunReconciliationModal from "../components/modals/RunReconciliationModal";
import ResolveErrorModal from "../components/modals/ResolveErrorModal";
import {
    ArrowLeft,
    RotateCw,
    Play,
    CheckCircle2,
    AlertTriangle,
    Layers,
    TableProperties,
    CheckSquare,
    AlertOctagon,
    History,
    Calendar,
    Clock,
    Tag,
    ShieldCheck,
    Search,
    ChevronRight
} from "lucide-react";

export default function ReconciliationDetails() {
    const { reconciliationId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { addToast, triggerRefresh, refreshSignal } = useApp();

    const [reconciliation, setReconciliation] = useState(null);
    const [results, setResults] = useState([]);
    const [errors, setErrors] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Active Tab directly derived from URL query param
    const activeTab = searchParams.get("tab") || "overview";

    // Modals
    const [isRunModalOpen, setIsRunModalOpen] = useState(false);
    const [resolvingError, setResolvingError] = useState(null);

    // Results Tab Filters
    const [resultsFilter, setResultsFilter] = useState("ALL"); // ALL, MATCHED, UNMATCHED, ISSUE
    const [resultsSearch, setResultsSearch] = useState("");

    // Errors Tab Filters
    const [errorsFilter, setErrorsFilter] = useState("OPEN"); // ALL, OPEN, RESOLVED
    const [errorsSearch, setErrorsSearch] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [recData, resData, errData, logsData] = await Promise.all([
                getReconciliation(reconciliationId),
                getReconciliationResults(reconciliationId),
                getReconciliationErrors(reconciliationId),
                getAuditLogs({ reconciliationId })
            ]);

            setReconciliation(recData);
            setResults(Array.isArray(resData) ? resData : []);
            setErrors(Array.isArray(errData) ? errData : []);
            setAuditLogs(Array.isArray(logsData) ? logsData : []);
        } catch (err) {
            addToast({
                type: "error",
                title: "Failed to load reconciliation",
                message: err.message
            });
        } finally {
            setLoading(false);
        }
    }, [reconciliationId, addToast]);

    useEffect(() => {
        let isMounted = true;
        if (isMounted) {
            loadData();
        }
        return () => {
            isMounted = false;
        };
    }, [loadData, refreshSignal]);

    const handleTabChange = (tabKey) => {
        setSearchParams({ tab: tabKey });
    };

    const handleExecuteRun = async () => {
        const outcome = await runReconciliation(reconciliationId);
        await loadData();
        triggerRefresh();
        addToast({
            type: outcome.reconciliation?.status === "COMPLETED" ? "success" : "warning",
            title: outcome.reconciliation?.status === "COMPLETED" ? "Reconciliation Completed" : "Issues Identified",
            message: `Version ${outcome.reconciliation?.version} processed. Matched: ${outcome.reconciliation?.matchedCount}, Errors: ${outcome.reconciliation?.errorCount}.`
        });
        return outcome;
    };

    const handleConfirmResolve = async (errorId, notes) => {
        await resolveError(errorId, notes);
        await loadData();
        triggerRefresh();
        addToast({
            type: "success",
            title: "Error Resolved",
            message: `Voucher ${errorId} marked as RESOLVED and added to audit trail.`
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "COMPLETED":
                return (
                    <span className="status-badge status-success">
                        <CheckCircle2 size={13} />
                        COMPLETED
                    </span>
                );
            case "ISSUES_FOUND":
                return (
                    <span className="status-badge status-error">
                        <AlertTriangle size={13} />
                        ISSUES FOUND
                    </span>
                );
            case "PROCESSING":
                return (
                    <span className="status-badge status-processing">
                        <RotateCw size={13} className="spin" />
                        PROCESSING
                    </span>
                );
            case "PENDING":
            default:
                return (
                    <span className="status-badge status-pending">
                        <Clock size={13} />
                        PENDING
                    </span>
                );
        }
    };

    const formatDate = (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Filtered results
    const filteredResults = useMemo(() => {
        return results.filter((r) => {
            if (resultsFilter !== "ALL" && r.matchStatus !== resultsFilter) return false;
            if (resultsSearch) {
                const q = resultsSearch.toLowerCase();
                return (
                    r.sourceDescription?.toLowerCase().includes(q) ||
                    r.errorType?.toLowerCase().includes(q) ||
                    r.errorReason?.toLowerCase().includes(q) ||
                    String(r.amount).includes(q)
                );
            }
            return true;
        });
    }, [results, resultsFilter, resultsSearch]);

    // Filtered errors
    const filteredErrors = useMemo(() => {
        return errors.filter((e) => {
            if (errorsFilter !== "ALL" && e.status !== errorsFilter) return false;
            if (errorsSearch) {
                const q = errorsSearch.toLowerCase();
                return (
                    e.description?.toLowerCase().includes(q) ||
                    e.id?.toLowerCase().includes(q) ||
                    e.transactionInfo?.toLowerCase().includes(q) ||
                    e.errorType?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [errors, errorsFilter, errorsSearch]);

    if (loading && !reconciliation) {
        return (
            <div className="p-8">
                <div className="skeleton-bar h-8 w-64 mb-4"></div>
                <div className="skeleton-bar h-24 w-full mb-6"></div>
                <div className="skeleton-bar h-96 w-full"></div>
            </div>
        );
    }

    if (!reconciliation) {
        return (
            <div className="p-8">
                <div className="error-banner">
                    <AlertTriangle size={20} />
                    <span>Reconciliation #{reconciliationId} not found in store.</span>
                    <button
                        type="button"
                        className="retry-btn"
                        onClick={() => navigate("/reconciliations")}
                    >
                        Return to Reconciliations
                    </button>
                </div>
            </div>
        );
    }

    const openErrorsCount = errors.filter((e) => e.status === "OPEN").length;
    const resolvedErrorsCount = errors.filter((e) => e.status === "RESOLVED").length;

    return (
        <div className="reconciliation-details-page">
            {/* Top Back Action & Title Bar */}
            <div className="details-header-card">
                <div className="details-header-top">
                    <button
                        type="button"
                        className="details-back-link"
                        onClick={() => navigate("/reconciliations")}
                    >
                        <ArrowLeft size={16} />
                        <span>All Reconciliations</span>
                    </button>

                    <div className="details-header-meta">
                        <span className="version-pill">v{reconciliation.version}</span>
                        {getStatusBadge(reconciliation.status)}
                    </div>
                </div>

                <div className="details-header-main">
                    <div>
                        <h1 className="details-title-heading">
                            {reconciliation.reconciliationName}
                        </h1>
                        <div className="details-subtitle-meta">
                            <span className="font-mono text-slate-700 font-semibold">{reconciliation.reconciliationCode}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Calendar size={13} className="text-slate-400" />
                                {reconciliation.reconciliationDate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Tag size={13} className="text-slate-400" />
                                {reconciliation.referenceBatch}
                            </span>
                            <span>•</span>
                            <span className="text-xs text-slate-500">
                                Last Updated: {formatDate(reconciliation.updatedAt || reconciliation.createdAt)}
                            </span>
                        </div>
                    </div>

                    <div className="details-header-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={loadData}
                            title="Refresh data"
                        >
                            <RotateCw size={15} />
                            <span>Refresh</span>
                        </button>

                        <button
                            type="button"
                            className="primary-button run-action-btn"
                            onClick={() => setIsRunModalOpen(true)}
                        >
                            <Play size={16} />
                            <span>
                                {reconciliation.startedAt ? "Run Again" : "Run Reconciliation"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="details-tabs-bar">
                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "overview" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("overview")}
                    >
                        <Layers size={15} />
                        <span>Overview</span>
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "transactions" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("transactions")}
                    >
                        <TableProperties size={15} />
                        <span>Transactions</span>
                        <span className="tab-pill-count">
                            {reconciliation.transactionCount || 0}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "results" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("results")}
                    >
                        <CheckSquare size={15} />
                        <span>Results</span>
                        <span className="tab-pill-count">
                            {results.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "errors" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("errors")}
                    >
                        <AlertOctagon size={15} />
                        <span>Errors</span>
                        {openErrorsCount > 0 && (
                            <span className="tab-pill-count tab-pill-error">
                                {openErrorsCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "audit" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("audit")}
                    >
                        <History size={15} />
                        <span>Audit History</span>
                        <span className="tab-pill-count">
                            {auditLogs.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="tab-pane-content">
                    {/* Summary KPI Grid */}
                    <div className="dashboard-kpi-grid mb-6">
                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Total Transactions</span>
                                <TableProperties size={17} className="text-blue-500" />
                            </div>
                            <div className="kpi-value">{reconciliation.transactionCount || 0}</div>
                            <div className="kpi-subtext">Across both sheets</div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">M In Transactions</span>
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">M In</span>
                            </div>
                            <div className="kpi-value text-blue-700">{reconciliation.mInCount || 0}</div>
                            <div className="kpi-subtext">Credit vouchers</div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">M Out Transactions</span>
                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">M Out</span>
                            </div>
                            <div className="kpi-value text-indigo-700">{reconciliation.mOutCount || 0}</div>
                            <div className="kpi-subtext">Debit vouchers</div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Matched</span>
                                <CheckCircle2 size={17} className="text-emerald-500" />
                            </div>
                            <div className="kpi-value text-emerald-600">{reconciliation.matchedCount || 0}</div>
                            <div className="kpi-subtext">Fully reconciled pairs</div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Unmatched</span>
                                <AlertTriangle size={17} className="text-slate-400" />
                            </div>
                            <div className="kpi-value text-slate-700">{reconciliation.unmatchedCount || 0}</div>
                            <div className="kpi-subtext">Pending counterpart</div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Open Errors</span>
                                <AlertOctagon size={17} className="text-rose-500" />
                            </div>
                            <div className="kpi-value text-rose-600">{openErrorsCount}</div>
                            <div className="kpi-subtext">Requires resolution</div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Resolved Errors</span>
                                <ShieldCheck size={17} className="text-emerald-500" />
                            </div>
                            <div className="kpi-value text-emerald-600">{resolvedErrorsCount}</div>
                            <div className="kpi-subtext">Audited and cleared</div>
                        </div>
                    </div>

                    {/* Metadata Details Card */}
                    <div className="content-card">
                        <div className="content-card-header">
                            <div>
                                <h3 className="content-card-title">Reconciliation Specifications</h3>
                                <p className="content-card-subtitle">
                                    Operational batch identity and system governance metadata.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleTabChange("transactions")}
                            >
                                <span>Open Transactions Workspace</span>
                                <ChevronRight size={15} />
                            </button>
                        </div>

                        <div className="info-metadata-grid">
                            <div className="info-meta-item">
                                <span className="info-meta-label">Reconciliation Name</span>
                                <strong className="info-meta-value text-slate-100">{reconciliation.reconciliationName}</strong>
                            </div>

                            <div className="info-meta-item">
                                <span className="info-meta-label">Reconciliation Code</span>
                                <strong className="info-meta-value font-mono text-slate-200">{reconciliation.reconciliationCode}</strong>
                            </div>

                            <div className="info-meta-item">
                                <span className="info-meta-label">Reconciliation Date</span>
                                <strong className="info-meta-value text-slate-200">{reconciliation.reconciliationDate}</strong>
                            </div>

                            <div className="info-meta-item">
                                <span className="info-meta-label">Reference / Batch Name</span>
                                <strong className="info-meta-value text-slate-200">{reconciliation.referenceBatch || "—"}</strong>
                            </div>

                            <div className="info-meta-item">
                                <span className="info-meta-label">Engine Version</span>
                                <strong className="info-meta-value text-slate-200">Version {reconciliation.version}</strong>
                            </div>

                            <div className="info-meta-item">
                                <span className="info-meta-label">Processing Status</span>
                                <div>{getStatusBadge(reconciliation.status)}</div>
                            </div>

                            <div className="info-meta-item">
                                <span className="info-meta-label">Initiated By</span>
                                <strong className="info-meta-value text-slate-200">{reconciliation.createdByUserId}</strong>
                            </div>

                            <div className="info-meta-item">
                                <span className="info-meta-label">Created At</span>
                                <strong className="info-meta-value text-xs text-slate-400">{formatDate(reconciliation.createdAt)}</strong>
                            </div>

                            <div className="info-meta-item col-span-2">
                                <span className="info-meta-label">Description</span>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {reconciliation.description || "No description provided."}
                                </p>
                            </div>

                            {reconciliation.notes && (
                                <div className="info-meta-item col-span-2">
                                    <span className="info-meta-label">Operational Notes</span>
                                    <p className="text-sm text-slate-300 bg-black/20 p-2.5 rounded border border-white/5">
                                        {reconciliation.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: TRANSACTIONS WORKSPACE */}
            {activeTab === "transactions" && (
                <div className="tab-pane-content">
                    <TransactionWorkspace
                        reconciliationId={reconciliationId}
                        onReconciliationUpdated={loadData}
                    />
                </div>
            )}

            {/* TAB CONTENT: RESULTS */}
            {activeTab === "results" && (
                <div className="tab-pane-content">
                    <div className="content-card mb-4 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="search-input-wrapper max-w-sm flex-1">
                                <Search size={15} className="search-icon" />
                                <input
                                    type="text"
                                    className="workspace-search-input"
                                    placeholder="Search results by branch or reason..."
                                    value={resultsSearch}
                                    onChange={(e) => setResultsSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">Filter:</span>
                                {[
                                    { id: "ALL", label: `All (${results.length})` },
                                    { id: "MATCHED", label: `Matched (${results.filter((r) => r.matchStatus === "MATCHED").length})` },
                                    { id: "ISSUE", label: `Issues (${results.filter((r) => r.matchStatus === "ISSUE").length})` },
                                    { id: "UNMATCHED", label: `Unmatched (${results.filter((r) => r.matchStatus === "UNMATCHED").length})` }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`filter-btn-pill ${resultsFilter === item.id ? "filter-btn-pill-active" : ""}`}
                                        onClick={() => setResultsFilter(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="content-card">
                        <div className="table-responsive-container">
                            <table className="enterprise-data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Transaction Hub Route</th>
                                        <th>M In ID</th>
                                        <th>M Out ID</th>
                                        <th className="text-right">Amount (₹)</th>
                                        <th className="text-right">M In Comm</th>
                                        <th className="text-right">M Out Comm</th>
                                        <th>Match Status</th>
                                        <th>Error Type</th>
                                        <th>Reconciliation Audit Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResults.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="table-empty-cell">
                                                No results found matching filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResults.map((r, i) => (
                                            <tr key={r.id}>
                                                <td className="text-slate-400 text-xs">{i + 1}</td>
                                                <td className="font-semibold text-slate-800">
                                                    {r.sourceDescription}
                                                </td>
                                                <td className="font-mono text-xs">{r.mInTransactionId || "—"}</td>
                                                <td className="font-mono text-xs">{r.mOutTransactionId || "—"}</td>
                                                <td className="text-right font-medium text-slate-800">
                                                    ₹{Number(r.amount).toLocaleString("en-IN")}
                                                </td>
                                                <td className="text-right text-xs">
                                                    {r.mInCommission !== null ? `₹${r.mInCommission}` : "—"}
                                                </td>
                                                <td className="text-right text-xs">
                                                    {r.mOutCommission !== null ? `₹${r.mOutCommission}` : "—"}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${
                                                        r.matchStatus === "MATCHED"
                                                            ? "status-success"
                                                            : r.matchStatus === "ISSUE"
                                                            ? "status-error"
                                                            : "status-pending"
                                                    }`}>
                                                        {r.matchStatus}
                                                    </span>
                                                </td>
                                                <td>
                                                    {r.errorType ? (
                                                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                            {r.errorType}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="text-xs text-slate-600 max-w-xs">
                                                    {r.errorReason}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ERRORS */}
            {activeTab === "errors" && (
                <div className="tab-pane-content">
                    <div className="content-card mb-4 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="search-input-wrapper max-w-sm flex-1">
                                <Search size={15} className="search-icon" />
                                <input
                                    type="text"
                                    className="workspace-search-input"
                                    placeholder="Search errors by ID, type or text..."
                                    value={errorsSearch}
                                    onChange={(e) => setErrorsSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
                                {[
                                    { id: "ALL", label: `All (${errors.length})` },
                                    { id: "OPEN", label: `Open (${openErrorsCount})` },
                                    { id: "RESOLVED", label: `Resolved (${resolvedErrorsCount})` }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`filter-btn-pill ${errorsFilter === item.id ? "filter-btn-pill-active" : ""}`}
                                        onClick={() => setErrorsFilter(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="content-card">
                        <div className="table-responsive-container">
                            <table className="enterprise-data-table">
                                <thead>
                                    <tr>
                                        <th>Error ID</th>
                                        <th>Transaction Info</th>
                                        <th>Error Type</th>
                                        <th>Error Code</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredErrors.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="table-empty-cell">
                                                No errors found matching filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredErrors.map((err) => (
                                            <tr key={err.id}>
                                                <td className="font-mono text-xs font-semibold text-slate-900">
                                                    {err.id}
                                                </td>
                                                <td className="font-medium text-slate-800 text-xs">
                                                    {err.transactionInfo}
                                                </td>
                                                <td>
                                                    <span className="error-type-badge">
                                                        {err.errorType}
                                                    </span>
                                                </td>
                                                <td className="font-mono text-[11px] text-slate-500">
                                                    {err.errorCode}
                                                </td>
                                                <td className="text-xs text-slate-700 max-w-sm">
                                                    <div>{err.description}</div>
                                                    {err.resolutionNotes && (
                                                        <div className="resolution-note-snippet mt-1">
                                                            <strong>Resolution:</strong> {err.resolutionNotes} (by {err.resolvedBy})
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
                                                <td className="text-xs text-slate-500 whitespace-nowrap">
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
                                                            <span>Resolve Error</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-emerald-600 font-medium">
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
                </div>
            )}

            {/* TAB CONTENT: AUDIT HISTORY */}
            {activeTab === "audit" && (
                <div className="tab-pane-content">
                    <div className="content-card">
                        <div className="content-card-header">
                            <div>
                                <h3 className="content-card-title">Batch Audit History</h3>
                                <p className="content-card-subtitle">
                                    Chronological log of changes, executions, and resolutions for this reconciliation.
                                </p>
                            </div>
                        </div>

                        <div className="table-responsive-container">
                            <table className="enterprise-data-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Entity</th>
                                        <th>Old Value</th>
                                        <th>New Value</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="table-empty-cell">
                                                No audit history logs recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="text-xs font-mono text-slate-500 whitespace-nowrap">
                                                    {formatDate(log.createdAt)}
                                                </td>
                                                <td>
                                                    <div className="text-xs font-semibold text-slate-800">{log.user}</div>
                                                    <div className="text-[10px] text-slate-400">{log.userRole}</div>
                                                </td>
                                                <td>
                                                    <span className="audit-action-badge">
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="text-xs text-slate-600">
                                                    {log.entity} {log.entityId ? `#${log.entityId}` : ""}
                                                </td>
                                                <td className="text-xs text-slate-500 max-w-xs truncate">
                                                    {log.oldValue || "—"}
                                                </td>
                                                <td className="text-xs text-slate-800 font-medium max-w-xs truncate">
                                                    {log.newValue || "—"}
                                                </td>
                                                <td className="text-xs text-slate-600">
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
            )}

            {/* Run Reconciliation Execution Modal */}
            <RunReconciliationModal
                isOpen={isRunModalOpen}
                onClose={() => setIsRunModalOpen(false)}
                reconciliation={reconciliation}
                onConfirmRun={handleExecuteRun}
                isRerun={!!reconciliation.startedAt}
            />

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