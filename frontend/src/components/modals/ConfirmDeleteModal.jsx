import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    count,
    sheetTitle = "Transactions",
    totalAmount = 0
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container confirm-delete-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title text-base font-bold text-slate-100">
                                Delete {count} {sheetTitle} {count === 1 ? "Transaction" : "Transactions"}?
                            </h3>
                            <p className="modal-subtitle">
                                Confirm permanent removal from reconciliation workspace
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
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
                            Are you sure you want to delete <strong>{count}</strong> selected transaction row{count > 1 ? "s" : ""} from <strong>{sheetTitle}</strong>? This action cannot be undone.
                        </div>
                    </div>

                    <div className="confirm-delete-summary">
                        <div className="summary-item">
                            <span className="summary-item-label">Target Sheet:</span>
                            <span className="summary-item-val font-semibold">{sheetTitle}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-item-label">Selected Rows:</span>
                            <span className="summary-item-val font-mono font-bold text-rose-400">
                                {count} {count === 1 ? "row" : "rows"}
                            </span>
                        </div>
                        {totalAmount > 0 && (
                            <div className="summary-item">
                                <span className="summary-item-label">Aggregated Volume:</span>
                                <span className="summary-item-val font-mono font-bold text-blue-400">
                                    ₹{Number(totalAmount).toLocaleString("en-IN")}
                                </span>
                            </div>
                        )}
                        <div className="summary-item">
                            <span className="summary-item-label">Reconciliation Impact:</span>
                            <span className="summary-item-val text-emerald-400 text-xs">
                                ✓ Inter-branch totals & variance will auto-recalculate
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
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="danger-button flex items-center gap-2"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        <Trash2 size={16} />
                        Delete {count} {count === 1 ? "Row" : "Rows"}
                    </button>
                </div>
            </div>
        </div>
    );
}
