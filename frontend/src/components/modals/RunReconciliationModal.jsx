import { useState, useEffect } from "react";
import { Play, CheckCircle2, Cpu, RefreshCw, X } from "lucide-react";

export default function RunReconciliationModal({
    isOpen,
    onClose,
    onConfirmRun,
    reconciliation,
    isRerun = false
}) {
    const [running, setRunning] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [runFinished, setRunFinished] = useState(false);
    const [finalOutcome, setFinalOutcome] = useState(null);

    const steps = [
        "Preparing transaction records from M In and M Out...",
        "Validating transaction schemas and branch routing...",
        "Matching counterpart transactions across hubs...",
        "Validating commission policy (single-side collection rule)...",
        "Generating reconciliation results and error vouchers...",
        "Reconciliation completed."
    ];

    useEffect(() => {
        if (!isOpen) {
            setRunning(false);
            setCurrentStepIndex(0);
            setRunFinished(false);
            setFinalOutcome(null);
        }
    }, [isOpen]);

    if (!isOpen || !reconciliation) return null;

    const startExecution = async () => {
        setRunning(true);
        setCurrentStepIndex(0);

        const stepDelay = 280;

        for (let i = 0; i < steps.length - 1; i++) {
            await new Promise((r) => setTimeout(r, stepDelay));
            setCurrentStepIndex(i + 1);
        }

        try {
            const outcome = await onConfirmRun();
            setFinalOutcome(outcome);
            setRunFinished(true);
        } catch {
            setRunning(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={!running ? handleClose : undefined}>
            <div
                className="modal-container run-reconciliation-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-header">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            {isRerun ? <RefreshCw size={20} className={running ? "spin" : ""} /> : <Play size={20} />}
                        </div>
                        <div>
                            <h2 className="modal-title text-lg font-bold">
                                {isRerun ? "Rerun Reconciliation Engine" : "Run Reconciliation"}
                            </h2>
                            <p className="modal-subtitle">
                                {reconciliation.reconciliationName} ({reconciliation.reconciliationCode})
                            </p>
                        </div>
                    </div>
                    {!running && (
                        <button
                            type="button"
                            className="modal-close-btn"
                            onClick={handleClose}
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="modal-body py-4">
                    {!running && !runFinished && (
                        <div>
                            <p className="text-sm text-slate-300 leading-relaxed mb-4">
                                This will execute the automated <strong>YesCapital Reconciliation Engine</strong> across all active <strong>M In</strong> and <strong>M Out</strong> transactions.
                            </p>
                            <div className="rule-recap-box">
                                <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
                                    Enforced Banking &amp; Clearing Rules:
                                </div>
                                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                                    <li>M In (toBranch) must match M Out (fromBranch) and vice-versa</li>
                                    <li>Transaction amounts must match exactly</li>
                                    <li><strong>Commission Rule:</strong> Exactly one side must collect commission. Dual or zero commission triggers a voucher error.</li>
                                    <li>Duplicate recurring transactions are supported and properly paired</li>
                                </ul>
                            </div>
                            {isRerun && (
                                <div className="version-bump-note mt-3">
                                    <RefreshCw size={14} className="text-blue-400" />
                                    <span>
                                        This run will increment the batch version from <strong>v{reconciliation.version}</strong> to <strong>v{reconciliation.version + 1}</strong>.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {running && !runFinished && (
                        <div className="run-progress-display">
                            <div className="flex items-center justify-center mb-4">
                                <div className="reconciliation-gear-animation">
                                    <Cpu size={32} className="spin text-blue-400" />
                                </div>
                            </div>

                            <div className="text-center font-semibold text-slate-200 text-sm mb-3">
                                {steps[currentStepIndex]}
                            </div>

                            <div className="progress-bar-track mb-2">
                                <div
                                    className="progress-bar-fill transition-all duration-300"
                                    style={{
                                        width: `${Math.round(((currentStepIndex + 1) / steps.length) * 100)}%`
                                    }}
                                ></div>
                            </div>
                            <div className="text-xs text-slate-400 text-center">
                                Processing Step {currentStepIndex + 1} of {steps.length}
                            </div>
                        </div>
                    )}

                    {runFinished && finalOutcome && (
                        <div className="run-completed-display text-center py-2">
                            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
                                <CheckCircle2 size={36} />
                            </div>
                            <h3 className="text-base font-bold text-slate-100 mb-1">
                                Reconciliation Execution Complete
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Updated to <strong>Version {finalOutcome.reconciliation?.version}</strong> • Status:{" "}
                                <span className={`status-badge ${finalOutcome.reconciliation?.status === "COMPLETED" ? "status-success" : "status-error"}`}>
                                    {finalOutcome.reconciliation?.status}
                                </span>
                            </p>

                            <div className="outcome-stats-grid">
                                <div className="outcome-stat">
                                    <div className="outcome-label">Matched</div>
                                    <div className="outcome-val text-emerald-600 font-bold text-lg">
                                        {finalOutcome.reconciliation?.matchedCount}
                                    </div>
                                </div>
                                <div className="outcome-stat">
                                    <div className="outcome-label">Unmatched</div>
                                    <div className="outcome-val text-rose-600 font-bold text-lg">
                                        {finalOutcome.reconciliation?.unmatchedCount}
                                    </div>
                                </div>
                                <div className="outcome-stat">
                                    <div className="outcome-label">Issues Found</div>
                                    <div className="outcome-val text-amber-600 font-bold text-lg">
                                        {finalOutcome.reconciliation?.errorCount}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    {!running && !runFinished && (
                        <>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="primary-button flex items-center gap-2"
                                onClick={startExecution}
                            >
                                <Play size={15} />
                                Confirm &amp; Execute
                            </button>
                        </>
                    )}
                    {runFinished && (
                        <button
                            type="button"
                            className="primary-button w-full"
                            onClick={handleClose}
                        >
                            View Updated Results &amp; Workspace →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
