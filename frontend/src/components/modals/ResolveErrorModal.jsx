import { useState } from "react";
import { X, CheckCircle2, ShieldCheck, AlertTriangle, FileSpreadsheet } from "lucide-react";

export default function ResolveErrorModal({ isOpen, onClose, error, onConfirmResolve }) {
    const [resolving, setResolving] = useState(false);

    if (!isOpen || !error) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setResolving(true);
            await onConfirmResolve(error.id, "Manual verification completed and voucher reconciled.");
            onClose();
        } finally {
            setResolving(false);
        }
    };

    const sheet = error.targetSheet || (String(error.errorType || "").toUpperCase() === "MISSING_M_IN" ? "M_OUT" : "M_IN");
    const isMOut = sheet === "M_OUT";
    const rowNum = error.rowNumber ?? error.rowDisplay;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container resolve-error-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="modal-header resolve-modal-header">
                    <div className="resolve-header-left">
                        <div className="resolve-header-icon-box">
                            <ShieldCheck size={22} />
                        </div>
                        <div className="resolve-header-title-wrap">
                            <h3 className="modal-title resolve-modal-title">
                                Resolve Reconciliation Error
                            </h3>
                            <div className="resolve-meta-tags">
                                <span className="resolve-tag resolve-tag-type">{error.errorType}</span>
                                {rowNum && (
                                    <>
                                        <span className="resolve-meta-dot">•</span>
                                        <span className="resolve-tag resolve-tag-row">Row {rowNum}</span>
                                    </>
                                )}
                            </div>
                        </div>
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="resolve-error-form">
                    <div className="modal-body resolve-modal-body">
                        {/* Transaction Context & Error Banner */}
                        <div className="resolve-context-card">
                            <div className="resolve-context-header">
                                <span className="resolve-context-label">
                                    <FileSpreadsheet size={13} />
                                    <span>Transaction Context</span>
                                </span>
                                <span className={`resolve-sheet-pill ${isMOut ? "sheet-pill-out" : "sheet-pill-in"}`}>
                                    {isMOut ? "M Out" : "M In"}
                                </span>
                            </div>

                            <div className="resolve-transaction-info">
                                {error.transactionInfo}
                            </div>

                            <div className="resolve-error-banner">
                                <AlertTriangle size={15} className="resolve-error-banner-icon" />
                                <div className="resolve-error-banner-text">
                                    {error.description}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="modal-actions resolve-modal-actions">
                        <button
                            type="button"
                            className="secondary-button resolve-btn-cancel"
                            onClick={onClose}
                            disabled={resolving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary-button resolve-btn-submit"
                            disabled={resolving}
                        >
                            <CheckCircle2 size={16} />
                            <span>{resolving ? "Resolving..." : "Mark as Resolved"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
