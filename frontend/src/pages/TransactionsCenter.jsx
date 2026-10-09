import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getReconciliations } from "../services/mockApi";
import { useApp } from "../context/AppContext";
import {
    TableProperties,
    Search,
    ArrowRight,
    Plus,
    FileSpreadsheet,
    RotateCw
} from "lucide-react";

export default function TransactionsCenter() {
    const navigate = useNavigate();
    const { openCreateModal, refreshSignal } = useApp();

    const [reconciliations, setReconciliations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await getReconciliations();
                setReconciliations(Array.isArray(data) ? data : []);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [refreshSignal]);

    const filtered = useMemo(() => {
        return reconciliations.filter((r) => {
            if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    r.reconciliationName?.toLowerCase().includes(q) ||
                    r.reconciliationCode?.toLowerCase().includes(q) ||
                    r.referenceBatch?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [reconciliations, statusFilter, searchQuery]);

    const getStatusBadge = (status) => {
        switch (status) {
            case "COMPLETED":
                return <span className="status-badge status-success">COMPLETED</span>;
            case "ISSUES_FOUND":
                return <span className="status-badge status-error">ISSUES FOUND</span>;
            case "PROCESSING":
                return <span className="status-badge status-processing">PROCESSING</span>;
            case "PENDING":
            default:
                return <span className="status-badge status-pending">PENDING</span>;
        }
    };

    return (
        <div className="transactions-center-page">
            <div className="page-header-row">
                <div>
                    <h1 className="page-main-heading">Transaction Center</h1>
                    <p className="page-sub-heading">
                        Select an active reconciliation batch to access its spreadsheet workspace, edit transactions, or paste Excel cells.
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
                        <span>New Reconciliation</span>
                    </button>
                </div>
            </div>

            {/* Selector Search Toolbar */}
            <div className="content-card mb-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="search-input-wrapper max-w-md flex-1">
                        <Search size={15} className="search-icon" />
                        <input
                            type="text"
                            className="workspace-search-input"
                            placeholder="Find reconciliation workspace to open..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">Filter:</span>
                        {["ALL", "PENDING", "PROCESSING", "COMPLETED", "ISSUES_FOUND"].map((status) => (
                            <button
                                key={status}
                                type="button"
                                className={`filter-btn-pill ${statusFilter === status ? "filter-btn-pill-active" : ""}`}
                                onClick={() => setStatusFilter(status)}
                            >
                                {status.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid of Workspaces */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 text-center py-16 text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                            <RotateCw size={18} className="spin text-blue-500" />
                            <span>Loading transaction workspaces...</span>
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-3 content-card text-center py-16">
                        <TableProperties size={42} className="mx-auto text-slate-500 mb-3" />
                        <h3 className="text-lg font-bold text-slate-100">No Reconciliations Found</h3>
                        <p className="text-sm text-slate-400 mt-1">Create a new batch to launch a transaction spreadsheet workspace.</p>
                        <button
                            type="button"
                            className="primary-button mt-5"
                            onClick={() => openCreateModal("new")}
                        >
                            Create Reconciliation
                        </button>
                    </div>
                ) : (
                    filtered.map((rec) => (
                        <div
                            key={rec.id}
                            className="content-card cursor-pointer hover:border-blue-500/50 hover:shadow-xl transition-all group p-6 flex flex-col justify-between"
                            onClick={() => navigate(`/reconciliations/${rec.id}?tab=transactions`)}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="version-pill">v{rec.version}</span>
                                    {getStatusBadge(rec.status)}
                                </div>

                                <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors text-base mb-1">
                                    {rec.reconciliationName}
                                </h3>

                                <div className="text-xs font-mono text-slate-400 mb-3">
                                    {rec.reconciliationCode} • Batch: {rec.referenceBatch || "Main"}
                                </div>

                                <p className="text-xs text-slate-300 line-clamp-2 mb-5">
                                    {rec.description || "Inter-branch transaction reconciliation."}
                                </p>
                            </div>

                            <div className="border-t border-white/5 pt-4">
                                <div className="grid grid-cols-3 text-center text-xs mb-4 gap-2">
                                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                        <div className="text-[10px] text-slate-400 uppercase">M In</div>
                                        <div className="font-bold text-blue-400 mt-0.5">{rec.mInCount || Math.floor((rec.transactionCount || 0) / 2)}</div>
                                    </div>
                                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                        <div className="text-[10px] text-slate-400 uppercase">M Out</div>
                                        <div className="font-bold text-indigo-400 mt-0.5">{rec.mOutCount || Math.ceil((rec.transactionCount || 0) / 2)}</div>
                                    </div>
                                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                        <div className="text-[10px] text-slate-400 uppercase">Total</div>
                                        <div className="font-bold text-slate-200 mt-0.5">{rec.transactionCount || 0}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs font-medium text-blue-400 pt-1 group-hover:translate-x-1 transition-transform">
                                    <span>Open Transaction Workspace</span>
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
