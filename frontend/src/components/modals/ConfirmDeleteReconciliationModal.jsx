import { AlertTriangle, Trash2, X, RotateCw } from "lucide-react";

export default function ConfirmDeleteReconciliationModal({
    isOpen,
    onClose,
    onConfirm,
    reconciliation,
    isDeleting = false
}) {
    if (!isOpen || !reconciliation) return null;

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

    return (
        <div className="modal-backdrop" onClick={!isDeleting ? onClose : undefined}>
            <div
                className="modal-container confirm-delete-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-delete-rec-title"
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h3 id="confirm-delete-rec-title" className="modal-title text-base font-bold text-slate-100">
                                Delete Reconciliation?
                            </h3>
                            <p className="modal-subtitle">
                                Confirm permanent removal from database
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        disabled={isDeleting}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body space-y-4">
                    <div className="confirm-delete-alert">
                        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-300 leading-relaxed">
                            Are you sure you want to permanently delete <strong>{reconciliation.reconciliationName}</strong>? All associated M In and M Out transactions, reconciliation results, matched pairs, and error records will be completely removed. This action cannot be undone.
                        </div>
                    </div>

                    <div className="confirm-delete-summary">
                        <div className="summary-item">
                            <span className="summary-item-label">Reconciliation Name:</span>
                            <span className="summary-item-val font-semibold text-slate-100">
                                {reconciliation.reconciliationName}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-item-label">Batch Reference:</span>
                            <span className="summary-item-val font-mono text-slate-300">
                                {reconciliation.referenceBatch || "BATCH-DEFAULT"}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-item-label">Associated Transactions:</span>
                            <span className="summary-item-val font-mono font-bold text-rose-400">
                                {reconciliation.transactionCount || 0} entries
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-item-label">Reconciliation Date:</span>
                            <span className="summary-item-val font-mono text-slate-300">
                                {formatDate(reconciliation.reconciliationDate)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="danger-button flex items-center gap-2"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <RotateCw size={15} className="spin" />
                                <span>Deleting Permanently...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 size={15} />
                                <span>Delete Permanently</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
