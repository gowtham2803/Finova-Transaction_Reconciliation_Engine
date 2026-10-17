import {
    X,
    ArrowRight,
    ArrowRightLeft,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    ShieldCheck,
    Building2,
    FileText,
    ArrowDownRight,
    ArrowUpRight
} from "lucide-react";

export default function TransactionDetailModal({ isOpen, onClose, transaction }) {
    if (!isOpen || !transaction) return null;

    const isMIn = transaction.sourceSheet === "M_IN";
    const amount = Number(transaction.amount || 0);
    const commission = Number(transaction.commission || 0);
    const netSettlement = amount + commission;

    const matchDetails = transaction.matchDetails;
    const counterpartAmount = matchDetails ? Number(matchDetails.counterpartAmount || 0) : null;
    const counterpartCommission = matchDetails ? Number(matchDetails.counterpartCommission || 0) : null;
    const hasDiscrepancy = transaction.status === "ERROR";

    const getStatusBadge = (status) => {
        switch (status) {
            case "MATCHED":
                return (
                    <span className="status-badge status-success">
                        <CheckCircle2 size={13} />
                        Matched & Reconciled
                    </span>
                );
            case "ERROR":
                return (
                    <span className="status-badge status-error">
                        <AlertTriangle size={13} />
                        Issue Found
                    </span>
                );
            case "UNMATCHED":
                return (
                    <span className="status-badge status-error">
                        <XCircle size={13} />
                        Unmatched Record
                    </span>
                );
            default:
                return (
                    <span className="status-badge status-pending">
                        <Clock size={13} />
                        Pending Verification
                    </span>
                );
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container transaction-detail-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Modal Header */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2.5 rounded-xl ${
                                isMIn
                                    ? "bg-blue-500/10 text-blue-500"
                                    : "bg-indigo-500/10 text-indigo-500"
                            }`}
                        >
                            <ArrowRightLeft size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`spreadsheet-badge-pill ${isMIn ? "pill-in" : "pill-out"}`}>
                                    <span className={`sheet-dot ${isMIn ? "dot-in" : "dot-out"}`}></span>
                                    <span>{isMIn ? "M In (Inflow)" : "M Out (Outflow)"}</span>
                                </span>
                                <h3 className="modal-title">
                                    Transaction Record #{transaction.sourceRow}
                                </h3>
                                {getStatusBadge(transaction.status)}
                            </div>
                            <p className="modal-subtitle">
                                Record ID: #{transaction.id} • Batch Reconciliation #{transaction.reconciliationId || 1} • Source Row #{transaction.sourceRow}
                            </p>
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

                {/* Modal Body */}
                <div className="detail-modal-body">
                    {/* Hero Card: Route Flow and Primary Financials */}
                    <div className="detail-hero-card">
                        {/* Direct Inter-Branch Transfer Route */}
                        <div className="detail-route-flow">
                            <div className="route-branch-node">
                                <div className="route-branch-icon text-blue-400">
                                    <Building2 size={18} />
                                </div>
                                <div className="route-branch-meta">
                                    <span className="route-branch-label">Origin Branch</span>
                                    <strong className="route-branch-name">
                                        {transaction.fromBranchCode || transaction.fromBranchName || "Branch " + transaction.fromBranchId}
                                    </strong>
                                </div>
                            </div>

                            <div className="route-flow-arrow">
                                <div className="route-arrow-line">
                                    <span>────────</span>
                                    <ArrowRight size={16} />
                                </div>
                                <span>Inter-Branch Transfer</span>
                            </div>

                            <div className="route-branch-node">
                                <div className="route-branch-icon text-emerald-400">
                                    <Building2 size={18} />
                                </div>
                                <div className="route-branch-meta">
                                    <span className="route-branch-label">Destination Branch</span>
                                    <strong className="route-branch-name">
                                        {transaction.toBranchCode || transaction.toBranchName || "Branch " + transaction.toBranchId}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Financial Metrics Triad */}
                        <div className="detail-financial-triad">
                            <div className="financial-triad-card">
                                <span className="triad-label">Transfer Principal</span>
                                <strong className="triad-value text-blue-500">
                                    ₹{amount.toLocaleString("en-IN")}
                                </strong>
                                <span className="triad-sub">Base transaction sum</span>
                            </div>

                            <div className="financial-triad-card">
                                <span className="triad-label">Commission Fee</span>
                                <strong className="triad-value text-amber-500">
                                    ₹{commission.toLocaleString("en-IN")}
                                </strong>
                                <span className="triad-sub">
                                    {commission > 0 ? "Bank fee collected" : "Zero fee recorded"}
                                </span>
                            </div>

                            <div className="financial-triad-card">
                                <span className="triad-label">Gross Value</span>
                                <strong className="triad-value text-slate-100">
                                    ₹{netSettlement.toLocaleString("en-IN")}
                                </strong>
                                <span className="triad-sub">Principal + Commission</span>
                            </div>
                        </div>
                    </div>

                    {/* Counterpart Reconciliation Comparison Card */}
                    {matchDetails ? (
                        <div className="counterpart-comparison-card">
                            <div className="comparison-header">
                                <div className="comparison-title-wrap">
                                    <ShieldCheck size={18} className="text-emerald-400" />
                                    <span>Reciprocal Ledger Counterpart Comparison</span>
                                </div>
                                <span className="comparison-id-chip">
                                    Linked {matchDetails.counterpartSheet === "M_IN" ? "M In" : "M Out"} #{matchDetails.counterpartId}
                                </span>
                            </div>

                            {/* Side-by-Side Comparison Grid */}
                            <div className="comparison-grid">
                                {/* Current Record */}
                                <div className="comparison-col">
                                    <div className="comparison-col-header">
                                        <span className="font-semibold text-slate-200">
                                            Current Record ({isMIn ? "M In" : "M Out"})
                                        </span>
                                        <span className="text-xs text-slate-400">Row #{transaction.sourceRow}</span>
                                    </div>

                                    <div className="comparison-item">
                                        <span className="comparison-item-label">Route Flow:</span>
                                        <span className="comparison-item-val text-slate-200">
                                            {transaction.fromBranchCode || transaction.fromBranchName} → {transaction.toBranchCode || transaction.toBranchName}
                                        </span>
                                    </div>

                                    <div className="comparison-item">
                                        <span className="comparison-item-label">Amount:</span>
                                        <span className="comparison-item-val text-blue-400">
                                            ₹{amount.toLocaleString("en-IN")}
                                        </span>
                                    </div>

                                    <div className="comparison-item">
                                        <span className="comparison-item-label">Commission:</span>
                                        <span className="comparison-item-val text-slate-300">
                                            ₹{commission.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>

                                {/* Counterpart Record */}
                                <div className="comparison-col">
                                    <div className="comparison-col-header">
                                        <span className="font-semibold text-slate-200">
                                            Counterpart ({matchDetails.counterpartSheet === "M_IN" ? "M In" : "M Out"})
                                        </span>
                                        <span className="text-xs text-slate-400">ID #{matchDetails.counterpartId}</span>
                                    </div>

                                    <div className="comparison-item">
                                        <span className="comparison-item-label">Route Flow:</span>
                                        <span className="comparison-item-val text-slate-200">
                                            {matchDetails.counterpartFrom} → {matchDetails.counterpartTo}
                                        </span>
                                    </div>

                                    <div className="comparison-item">
                                        <span className="comparison-item-label">Amount:</span>
                                        <span className={`comparison-item-val ${
                                            counterpartAmount !== amount ? "text-rose-400 font-bold" : "text-blue-400"
                                        }`}>
                                            ₹{(counterpartAmount || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>

                                    <div className="comparison-item">
                                        <span className="comparison-item-label">Commission:</span>
                                        <span className={`comparison-item-val ${
                                            (commission > 0 && counterpartCommission > 0) || (commission === 0 && counterpartCommission === 0)
                                                ? "text-amber-400 font-bold"
                                                : "text-slate-300"
                                        }`}>
                                            ₹{(counterpartCommission || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Verdict Banner */}
                            {transaction.status === "MATCHED" && (
                                <div className="verdict-banner verdict-banner-success">
                                    <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-semibold">
                                            Reconciliation Verified
                                        </strong>
                                        <span>
                                            {matchDetails.notes ||
                                                "Amounts and routes match exactly under regional inter-branch settlement rules."}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {hasDiscrepancy && (
                                <div className="verdict-banner verdict-banner-error">
                                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-semibold">
                                            Discrepancy Requiring Correction
                                        </strong>
                                        <span>
                                            {transaction.errorReason ||
                                                "A variance exists between this transaction and its reciprocal ledger counterpart."}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {transaction.status === "UNMATCHED" && (
                                <div className="verdict-banner verdict-banner-warning">
                                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-semibold">
                                            Awaiting Counterpart Match
                                        </strong>
                                        <span>
                                            Counterpart entry is pending or has not settled in the corresponding ledger batch.
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="verdict-banner verdict-banner-warning">
                            <AlertTriangle size={20} className="flex-shrink-0 text-amber-500 mt-0.5" />
                            <div>
                                <strong className="block font-semibold text-amber-400 mb-1">
                                    Orphan Entry — Counterpart Not Found
                                </strong>
                                <span className="text-slate-300 leading-relaxed">
                                    {transaction.errorReason ||
                                        "No corresponding counterpart transaction was identified in the reciprocal sheet. Verify batch dates and branch ledger postings."}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Structured Audit Metadata 2x2 Grid */}
                    <div className="detail-meta-grid">
                        <div className="detail-meta-tile">
                            <div className="detail-meta-tile-icon">
                                <FileText size={16} className="text-blue-400" />
                            </div>
                            <div className="detail-meta-tile-content">
                                <span className="detail-meta-tile-label">Transfer Nature</span>
                                <span className="detail-meta-tile-val">Inter-Branch Direct Clearing</span>
                            </div>
                        </div>

                        <div className="detail-meta-tile">
                            <div className="detail-meta-tile-icon">
                                {isMIn ? (
                                    <ArrowDownRight size={16} className="text-blue-400" />
                                ) : (
                                    <ArrowUpRight size={16} className="text-indigo-400" />
                                )}
                            </div>
                            <div className="detail-meta-tile-content">
                                <span className="detail-meta-tile-label">Ledger Booking</span>
                                <span className="detail-meta-tile-val">
                                    {isMIn ? "M In (Inward Transfer)" : "M Out (Outward Transfer)"}
                                </span>
                            </div>
                        </div>

                        <div className="detail-meta-tile">
                            <div className="detail-meta-tile-icon">
                                <ShieldCheck size={16} className="text-emerald-400" />
                            </div>
                            <div className="detail-meta-tile-content">
                                <span className="detail-meta-tile-label">Audit Health</span>
                                <span className="detail-meta-tile-val">
                                    {transaction.status === "MATCHED"
                                        ? "100% Validated & Cleared"
                                        : transaction.status === "ERROR"
                                        ? "Discrepancy Flagged"
                                        : "Pending Verification"}
                                </span>
                            </div>
                        </div>

                        <div className="detail-meta-tile">
                            <div className="detail-meta-tile-icon">
                                <Clock size={16} className="text-slate-400" />
                            </div>
                            <div className="detail-meta-tile-content">
                                <span className="detail-meta-tile-label">Audit Policy</span>
                                <span className="detail-meta-tile-val">Single-Side Commission Rule</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="detail-modal-footer">
                    <span className="detail-footer-tip">
                        💡 Tip: Double-click any row in the spreadsheet to inspect its details anytime.
                    </span>
                    <button
                        type="button"
                        className="primary-button"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
