import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReconciliations } from "../services/mockApi";
import { useApp } from "../context/AppContext";
import ReconciliationQuickViewModal from "../components/modals/ReconciliationQuickViewModal";
import {
    Layers,
    Clock,
    RotateCw,
    CheckCircle2,
    AlertTriangle,
    Filter,
    ArrowRight,
    Search,
    Plus,
    Calendar,
    ChevronRight,
    TrendingUp,
    ShieldAlert,
    Eye
} from "lucide-react";

export default function Dashboard() {
    const navigate = useNavigate();
    const { openCreateModal, refreshSignal } = useApp();

    const [reconciliations, setReconciliations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Working Filters
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterSearch, setFilterSearch] = useState("");

    // Progressive Disclosure: Quick View Modal
    const [quickViewRec, setQuickViewRec] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getReconciliations();
            setReconciliations(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Failed to load dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [refreshSignal]);

    // Statistics computation
    const stats = useMemo(() => {
        const total = reconciliations.length;
        const pending = reconciliations.filter((r) => r.status === "PENDING").length;
        const processing = reconciliations.filter((r) => r.status === "PROCESSING").length;
        const completed = reconciliations.filter((r) => r.status === "COMPLETED").length;
        const issues = reconciliations.filter((r) => r.status === "ISSUES_FOUND").length;

        return {
            total,
            inProgress: pending + processing,
            completed,
            issues
        };
    }, [reconciliations]);

    // Filtered recent reconciliations
    const filteredRecent = useMemo(() => {
        return reconciliations.filter((r) => {
            if (filterStatus !== "ALL" && r.status !== filterStatus) {
                return false;
            }
            if (filterSearch) {
                const q = filterSearch.toLowerCase();
                const nameMatch = r.reconciliationName?.toLowerCase().includes(q);
                const codeMatch = r.reconciliationCode?.toLowerCase().includes(q);
                return nameMatch || codeMatch;
            }
            return true;
        });
    }, [reconciliations, filterStatus, filterSearch]);

    const getStatusBadge = (status) => {
        switch (status) {
            case "COMPLETED":
                return (
                    <span className="status-badge status-success">
                        <CheckCircle2 size={12} />
                        COMPLETED
                    </span>
                );
            case "ISSUES_FOUND":
                return (
                    <span className="status-badge status-error">
                        <AlertTriangle size={12} />
                        ISSUES FOUND
                    </span>
                );
            case "PROCESSING":
                return (
                    <span className="status-badge status-processing">
                        <RotateCw size={12} className="spin" />
                        PROCESSING
                    </span>
                );
            case "PENDING":
            default:
                return (
                    <span className="status-badge status-pending">
                        <Clock size={12} />
                        PENDING
                    </span>
                );
        }
    };

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
        <div className="dashboard-page-container">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <h1 className="page-main-heading">Operations Dashboard</h1>
                    <p className="page-sub-heading">
                        Real-time overview of inter-branch transaction reconciliation batches and settlement clearance.
                    </p>
                </div>

                <div className="page-header-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={loadData}
                        disabled={loading}
                    >
                        <RotateCw size={15} className={loading ? "spin" : ""} />
                        <span>{loading ? "Refreshing..." : "Refresh"}</span>
                    </button>
                    <button
                        type="button"
                        className="primary-button"
                        onClick={() => openCreateModal("new")}
                    >
                        <Plus size={16} />
                        <span>New Reconciliation</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="error-banner">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                    <button type="button" className="retry-btn" onClick={loadData}>
                        Retry
                    </button>
                </div>
            )}

            {/* Spacious 4-Card KPI Grid */}
            <div className="dashboard-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Total Reconciliations</span>
                        <div className="kpi-icon-wrap" style={{ background: "rgba(37, 99, 235, 0.15)", color: "#60a5fa" }}>
                            <Layers size={20} />
                        </div>
                    </div>
                    <div className="kpi-value">{loading ? "..." : stats.total}</div>
                    <div className="kpi-trend">
                        <TrendingUp size={13} className="text-emerald-400" />
                        <span>Active batches in registry</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Fully Completed</span>
                        <div className="kpi-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <div className="kpi-value text-emerald-400">{loading ? "..." : stats.completed}</div>
                    <div className="kpi-subtext">100% matched, zero exceptions</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">In-Progress &amp; Pending</span>
                        <div className="kpi-icon-wrap" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="kpi-value text-indigo-400">{loading ? "..." : stats.inProgress}</div>
                    <div className="kpi-subtext">Awaiting execution or review</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Exceptions / Issues</span>
                        <div className="kpi-icon-wrap" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }}>
                            <ShieldAlert size={20} />
                        </div>
                    </div>
                    <div className="kpi-value text-rose-400">{loading ? "..." : stats.issues}</div>
                    <div className="kpi-subtext">Action required to balance fees</div>
                </div>
            </div>

            {/* Recent Reconciliations Section (Clean, Uncluttered, Progressive Disclosure) */}
            <div className="content-card recent-reconciliations-card">
                <div className="content-card-header">
                    <div>
                        <h2 className="content-card-title">Recent Reconciliations</h2>
                    </div>

                    <div className="table-header-controls">
                        <button
                            type="button"
                            className={`filter-toggle-btn ${showFilterPanel ? "filter-active" : ""}`}
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                        >
                            <Filter size={14} />
                            <span>Filter</span>
                            {filterStatus !== "ALL" && <span className="filter-active-dot"></span>}
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => navigate("/reconciliations")}
                        >
                            <span>View All</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                {showFilterPanel && (
                    <div className="filter-dropdown-bar">
                        <div className="search-filter-field">
                            <Search size={14} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                value={filterSearch}
                                onChange={(e) => setFilterSearch(e.target.value)}
                            />
                        </div>

                        <div className="status-filter-group">
                            <span className="text-xs font-semibold text-slate-400">Status:</span>
                            {["ALL", "PENDING", "PROCESSING", "COMPLETED", "ISSUES_FOUND"].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    className={`filter-btn-pill ${filterStatus === status ? "filter-btn-pill-active" : ""}`}
                                    onClick={() => setFilterStatus(status)}
                                >
                                    {status.replace("_", " ")}
                                </button>
                            ))}
                        </div>

                        {(filterStatus !== "ALL" || filterSearch) && (
                            <button
                                type="button"
                                className="clear-filters-link"
                                onClick={() => {
                                    setFilterStatus("ALL");
                                    setFilterSearch("");
                                }}
                            >
                                Reset
                            </button>
                        )}
                    </div>
                )}

                {/* Table with Clickable Rows & Progressive Disclosure */}
                <div className="table-responsive-container">
                    <table className="enterprise-data-table recent-reconciliations-table">
                        <thead>
                            <tr>
                                <th style={{ width: "25%", textAlign: "center" }}>Reconciliation Name</th>
                                <th style={{ width: "25%", textAlign: "center" }}>Date</th>
                                <th style={{ width: "25%", textAlign: "center" }}>Status</th>
                                <th style={{ width: "25%", textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "48px 0" }}>
                                            <RotateCw size={16} className="spin text-blue-500" />
                                            <span>Loading reconciliation records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecent.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center" style={{ padding: "48px 0", textAlign: "center" }}>
                                        <div className="empty-state-wrap">
                                            <Layers size={36} className="text-slate-500 mx-auto mb-2" />
                                            <div className="empty-title">No reconciliations found</div>
                                            <div className="empty-sub">
                                                Try adjusting your filter settings or create a new reconciliation.
                                            </div>
                                            <button
                                                type="button"
                                                className="primary-button mt-4"
                                                onClick={() => openCreateModal("new")}
                                            >
                                                Create Reconciliation
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecent.slice(0, 8).map((rec) => (
                                    <tr
                                        key={rec.id}
                                        className="clickable-table-row"
                                        onClick={() => setQuickViewRec(rec)}
                                        title="Click to view details popup"
                                    >
                                        {/* Reconciliation Name with Code */}
                                        <td>
                                            <div className="recent-rec-name-cell">
                                                <div className="rec-primary-name">
                                                    {rec.reconciliationName}
                                                </div>
                                                <div className="rec-secondary-code">
                                                    {rec.referenceBatch || "Main"}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td>
                                            <div className="recent-rec-date-cell">
                                                <Calendar size={13} />
                                                <span>{formatDate(rec.reconciliationDate)}</span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td>
                                            <div className="recent-rec-status-cell">
                                                {getStatusBadge(rec.status)}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div className="recent-rec-actions-cell">
                                                <button
                                                    type="button"
                                                    className="table-btn table-btn-secondary"
                                                    onClick={() => setQuickViewRec(rec)}
                                                    title="Quick View Details"
                                                >
                                                    <Eye size={13} />
                                                    <span>Details</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="table-btn table-btn-primary"
                                                    onClick={() => navigate(`/reconciliations/${rec.id}`)}
                                                    title="Open Full Workspace"
                                                >
                                                    <span>Open</span>
                                                    <ChevronRight size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Progressive Disclosure Quick View Modal */}
            <ReconciliationQuickViewModal
                isOpen={!!quickViewRec}
                reconciliation={quickViewRec}
                onClose={() => setQuickViewRec(null)}
            />
        </div>
    );
}