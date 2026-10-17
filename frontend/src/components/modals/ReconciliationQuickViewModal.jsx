import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    X,
    ArrowRight,
    Calendar,
    User,
    Tag,
    Clock,
    Layers,
    CheckCircle2,
    AlertTriangle,
    ArrowRightLeft,
    FileSpreadsheet,
    Info,
    ShieldAlert,
    CheckCircle,
    Trash2
} from "lucide-react";
import ConfirmDeleteReconciliationModal from "./ConfirmDeleteReconciliationModal";
import { deleteReconciliation } from "../../services/mockApi";
import { useApp } from "../../context/AppContext";

export default function ReconciliationQuickViewModal({
    isOpen,
    onClose,
    reconciliation,
    onDeleteSuccess
}) {
    const navigate = useNavigate();
    const { addToast, triggerRefresh } = useApp();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen || !reconciliation) return null;

    const handleOpenWorkspace = () => {
        onClose();
        navigate(`/reconciliations/${reconciliation.id}?tab=transactions`);
    };

    const handleDeletePermanently = async () => {
        try {
            setIsDeleting(true);
            await deleteReconciliation(reconciliation.id);
            addToast({
                type: "success",
                title: "Reconciliation Deleted",
                message: `"${reconciliation.reconciliationName}" and all associated data have been permanently deleted.`
            });
            setIsConfirmOpen(false);
            if (onDeleteSuccess) {
                onDeleteSuccess(reconciliation.id);
            }
            if (triggerRefresh) {
                triggerRefresh();
            }
            onClose();
        } catch (err) {
            addToast({
                type: "error",
                title: "Delete Failed",
                message: err.message || "Failed to delete reconciliation. Please try again."
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return isNaN(d.getTime())
            ? val
            : d.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
              });
    };

    const formatDateTime = (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return isNaN(d.getTime())
            ? val
            : d.toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
              });
    };

    const isIssue = reconciliation.status === "ISSUES_FOUND";
    const isCompleted = reconciliation.status === "COMPLETED";

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container quick-view-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quick-view-title"
            >
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 id="quick-view-title" className="modal-title">
                            {reconciliation.reconciliationName}
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="quickview-body">
                    {/* Section 1: Overview & Scope */}
                    {/* Section 2: Important Financial Metrics (Separate Cards in Multi-Column Grid) */}
                    <div>
                        <div className="quickview-section-header" style={{ marginBottom: "10px" }}>
                            <Layers size={13} className="text-blue-500" />
                            <span>Reconciliation Balance Metrics</span>
                        </div>
                        <div className="quickview-metrics-grid">
                            {/* Card 1: Total Volume */}
                            <div className="quickview-metric-card">
                                <div className="quickview-metric-top">
                                    <span className="quickview-metric-label">Total Volume</span>
                                    <div className="quickview-metric-icon-wrap quickview-icon-blue">
                                        <Layers size={15} />
                                    </div>
                                </div>
                                <div className="quickview-metric-value metric-val-blue">
                                    {reconciliation.transactionCount || 0}
                                </div>
                                <div className="quickview-metric-sub">
                                    Total ledger entries
                                </div>
                            </div>

                            {/* Card 2: Matched Pairs */}
                            <div className="quickview-metric-card">
                                <div className="quickview-metric-top">
                                    <span className="quickview-metric-label">Matched Pairs</span>
                                    <div className="quickview-metric-icon-wrap quickview-icon-emerald">
                                        <CheckCircle2 size={15} />
                                    </div>
                                </div>
                                <div className="quickview-metric-value metric-val-emerald">
                                    {reconciliation.matchedCount || 0}
                                </div>
                                <div className="quickview-metric-sub">
                                    Settled inter-branch
                                </div>
                            </div>

                            {/* Card 3: Unmatched */}
                            <div className="quickview-metric-card">
                                <div className="quickview-metric-top">
                                    <span className="quickview-metric-label">Unmatched</span>
                                    <div className="quickview-metric-icon-wrap quickview-icon-amber">
                                        <ArrowRightLeft size={15} />
                                    </div>
                                </div>
                                <div className="quickview-metric-value metric-val-amber">
                                    {reconciliation.unmatchedCount || 0}
                                </div>
                                <div className="quickview-metric-sub">
                                    Awaiting counter-entry
                                </div>
                            </div>

                            {/* Card 4: Issues Found */}
                            <div className="quickview-metric-card">
                                <div className="quickview-metric-top">
                                    <span className="quickview-metric-label">Issues Found</span>
                                    <div className="quickview-metric-icon-wrap quickview-icon-rose">
                                        <ShieldAlert size={15} />
                                    </div>
                                </div>
                                <div className="quickview-metric-value metric-val-rose">
                                    {reconciliation.errorCount || 0}
                                </div>
                                <div className="quickview-metric-sub">
                                    {reconciliation.errorCount > 0 ? "Requires resolution" : "Zero exceptions"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Audit & Metadata Cards */}
                    <div>
                        <div className="quickview-section-header" style={{ marginBottom: "10px" }}>
                            <Calendar size={13} className="text-blue-500" />
                            <span>Audit &amp; Processing Details</span>
                        </div>
                        <div className="quickview-metadata-grid">
                            <div className="quickview-meta-card">
                                <Calendar size={16} className="quickview-meta-icon" />
                                <div className="quickview-meta-content">
                                    <span className="quickview-meta-label">Reconciliation Date</span>
                                    <span className="quickview-meta-value">
                                        {formatDate(reconciliation.reconciliationDate)}
                                    </span>
                                </div>
                            </div>

                            <div className="quickview-meta-card">
                                <User size={16} className="quickview-meta-icon" />
                                <div className="quickview-meta-content">
                                    <span className="quickview-meta-label">User</span>
                                    <span className="quickview-meta-value">
                                        {reconciliation.createdByUsername || reconciliation.createdByUserId || "local-user"}
                                    </span>
                                </div>
                            </div>

                            <div className="quickview-meta-card">
                                <Tag size={16} className="quickview-meta-icon" />
                                <div className="quickview-meta-content">
                                    <span className="quickview-meta-label">Batch Reference</span>
                                    <span className="quickview-meta-value">
                                        {reconciliation.referenceBatch || "BATCH-DEFAULT"}
                                    </span>
                                </div>
                            </div>

                            <div className="quickview-meta-card">
                                <Clock size={16} className="quickview-meta-icon" />
                                <div className="quickview-meta-content">
                                    <span className="quickview-meta-label">Last Processed</span>
                                    <span className="quickview-meta-value">
                                        {formatDateTime(reconciliation.updatedAt || reconciliation.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        className="danger-button flex items-center gap-2"
                        onClick={() => setIsConfirmOpen(true)}
                        disabled={isDeleting}
                        title="Delete Reconciliation"
                    >
                        <Trash2 size={15} />
                        <span>Delete</span>
                    </button>
                    <button
                        type="button"
                        className="primary-button flex items-center gap-2"
                        onClick={handleOpenWorkspace}
                        disabled={isDeleting}
                    >
                        <span>Open Full Workspace</span>
                        <ArrowRight size={15} />
                    </button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDeleteReconciliationModal
                isOpen={isConfirmOpen}
                onClose={() => !isDeleting && setIsConfirmOpen(false)}
                onConfirm={handleDeletePermanently}
                reconciliation={reconciliation}
                isDeleting={isDeleting}
            />
        </div>
    );
}
