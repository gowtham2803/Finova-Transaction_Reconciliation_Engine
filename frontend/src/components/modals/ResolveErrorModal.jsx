import { useState } from "react";
import { X, CheckCircle2, ShieldCheck } from "lucide-react";

export default function ResolveErrorModal({ isOpen, onClose, error, onConfirmResolve }) {
    const [resolutionNotes, setResolutionNotes] = useState(
        "Verified with counterpart branch statement. Voucher adjusted and verified in clearing registry."
    );
    const [resolving, setResolving] = useState(false);

    if (!isOpen || !error) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setResolving(true);
            await onConfirmResolve(error.id, resolutionNotes);
            onClose();
        } finally {
            setResolving(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container resolve-error-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-header">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title text-base font-bold">
                                Resolve Reconciliation Error
                            </h3>
                            <p className="modal-subtitle">
                                {error.id} • {error.errorType}
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

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="error-detail-recap-box mb-4 p-4 rounded-xl bg-black/20 border border-white/5">
                        <div className="text-xs font-semibold text-slate-400 mb-1">
                            Transaction Context:
                        </div>
                        <div className="text-xs text-slate-200 font-medium mb-2 font-mono">
                            {error.transactionInfo}
                        </div>
                        <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                            {error.description}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="resolution-notes">
                            Resolution Notes / Audit Justification <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="resolution-notes"
                            rows={3}
                            className="form-textarea"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            required
                        />
                        <div className="text-xs text-slate-400 mt-1">
                            This explanation will be permanently recorded in the immutable Audit History trail.
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onClose}
                            disabled={resolving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary-button bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                            disabled={resolving}
                        >
                            <CheckCircle2 size={16} />
                            {resolving ? "Resolving..." : "Mark as Resolved"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
