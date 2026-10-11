import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getReconciliations } from "../services/mockApi";
import ReconciliationQuickViewModal from "../components/modals/ReconciliationQuickViewModal";
import {
    Plus,
    Search,
    CheckCircle2,
    AlertTriangle,
    RotateCw,
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Layers,
    FileSpreadsheet,
    Eye
} from "lucide-react";

const STATUS_OPTIONS = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "PROCESSING", label: "Processing" },
    { key: "COMPLETED", label: "Completed" },
    { key: "ISSUES_FOUND", label: "Issues Found" }
];

export default function Reconciliations() {
    const navigate = useNavigate();
    const { openCreateModal, refreshSignal } = useApp();

    const [reconciliations, setReconciliations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("date"); // date, name, transactions, status
    const [sortOrder, setSortOrder] = useState("desc"); // asc, desc

    // Progressive Disclosure: Quick View Modal
    const [quickViewRec, setQuickViewRec] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getReconciliations();
            setReconciliations(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [refreshSignal]);

    // Filter and Sort
    const filteredAndSorted = useMemo(() => {
        let list = reconciliations.filter((r) => {
            if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const nameMatch = r.reconciliationName?.toLowerCase().includes(q);
                const codeMatch = r.reconciliationCode?.toLowerCase().includes(q);
                const descMatch = r.description?.toLowerCase().includes(q);
                return nameMatch || codeMatch || descMatch;
            }
            return true;
        });

        list.sort((a, b) => {
            let comp = 0;
            if (sortBy === "date") {
                comp = new Date(b.reconciliationDate) - new Date(a.reconciliationDate);
            } else if (sortBy === "name") {
                comp = a.reconciliationName.localeCompare(b.reconciliationName);
            } else if (sortBy === "transactions") {
                comp = (b.transactionCount || 0) - (a.transactionCount || 0);
            } else if (sortBy === "status") {
                comp = a.status.localeCompare(b.status);
            }
            return sortOrder === "asc" ? -comp : comp;
        });

        return list;
    }, [reconciliations, statusFilter, searchQuery, sortBy, sortOrder]);

    const paginatedList = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAndSorted.slice(start, start + pageSize);
    }, [filteredAndSorted, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortOrder("desc");
        }
    };

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
        <div className="reconciliations-page-container">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <h1 className="page-main-heading">Reconciliation Registry</h1>
                    <p className="page-sub-heading">
                        Manage, review, and initiate transaction reconciliation batches across inter-branch clearing hubs.
                    </p>
                </div>

                <div className="page-header-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openCreateModal("import")}
                    >
                        <FileSpreadsheet size={15} />
                        <span>Import Excel</span>
                    </button>
                    <button
                        type="button"
                        className="primary-button"
                        onClick={() => openCreateModal("new")}
                    >
                        <Plus size={15} />
                        <span>Create Reconciliation</span>
                    </button>
                </div>
            </div>

            {/* Filter, Search & Pagination Container */}
            <div className="rec-toolbar-card">
                {/* Line 1: Search Bar (left) + Pagination Controls (right) */}
                <div className="rec-toolbar-row-top">
                    <div className="rec-search-box">
                        <Search size={15} className="rec-search-icon" />
                        <input
                            type="text"
                            className="rec-search-input"
                            placeholder="Search by name, reference batch, or code..."
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
                                ×
                            </button>
                        )}
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
                            Page <span className="rec-pagination-current">{currentPage}</span> of <span className="rec-pagination-total">{totalPages || 1}</span>
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

                {/* Line 2: Status Filters (left) + Pagination Details (right) */}
                <div className="rec-toolbar-row-bottom">
                    <div className="rec-status-filter-group">
                        <span className="rec-status-filter-label">Status:</span>
                        {STATUS_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`rec-filter-pill ${statusFilter === opt.key ? "rec-filter-pill-active" : ""}`}
                                onClick={() => {
                                    setStatusFilter(opt.key);
                                    setCurrentPage(1);
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="rec-pagination-summary">
                        Showing {filteredAndSorted.length > 0 ? (
                            <>
                                {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}
                            </>
                        ) : (
                            "0 of 0"
                        )}
                    </div>
                </div>
            </div>

            {/* Reconciliations Table (Spacious, Uncluttered, Clickable) */}
            <div className="content-card">
                <div className="table-responsive-container">
                    <table className="enterprise-data-table">
                        <thead>
                            <tr>
                                <th className="cursor-pointer" onClick={() => handleSort("name")} title="Sort by Name">
                                    Reconciliation Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                                </th>
                                <th className="cursor-pointer" onClick={() => handleSort("date")} title="Sort by Date">
                                    Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                                </th>
                                <th>Status</th>
                                <th>Summary Breakdown</th>
                                <th>Version</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RotateCw size={16} className="spin text-blue-500" />
                                            <span>Loading reconciliations registry...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <div className="empty-state-wrap">
                                            <Layers size={36} className="text-slate-500 mx-auto mb-2" />
                                            <div className="empty-title">No matching reconciliations</div>
                                            <div className="empty-sub">
                                                No records found for current filters.
                                            </div>
                                            <button
                                                type="button"
                                                className="primary-button mt-4"
                                                onClick={() => openCreateModal("new")}
                                            >
                                                Create New Batch
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedList.map((rec) => (
                                    <tr
                                        key={rec.id}
                                        className="clickable-table-row"
                                        onClick={() => setQuickViewRec(rec)}
                                        title={`View quick details for ${rec.reconciliationName}`}
                                    >
                                        <td>
                                            <div className="rec-name-cell">
                                                <div className="rec-primary-name font-semibold text-slate-100">
                                                    {rec.reconciliationName}
                                                </div>
                                                <div className="rec-secondary-code text-slate-400">
                                                    {rec.reconciliationCode} • Batch: {rec.referenceBatch || "Main"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Calendar size={13} />
                                                <span>{formatDate(rec.reconciliationDate)}</span>
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(rec.status)}</td>
                                        <td>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-semibold text-slate-200">
                                                    {rec.transactionCount || 0} Txns
                                                </span>
                                                <span className="text-slate-500">•</span>
                                                <span className="text-emerald-400 font-medium">
                                                    {rec.matchedCount || 0} Matched
                                                </span>
                                                {(rec.errorCount || 0) > 0 && (
                                                    <>
                                                        <span className="text-slate-500">•</span>
                                                        <span className="text-rose-400 font-medium">
                                                            {rec.errorCount} Issues
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="version-pill">v{rec.version || 1}</span>
                                        </td>
                                        <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <div className="table-action-group">
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

            {/* Quick View Details Modal */}
            <ReconciliationQuickViewModal
                isOpen={!!quickViewRec}
                reconciliation={quickViewRec}
                onClose={() => setQuickViewRec(null)}
            />
        </div>
    );
}