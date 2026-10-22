import { useState, useEffect, useRef } from "react";
import {
    Play,
    CheckCircle2,
    Cpu,
    RefreshCw,
    X,
    ArrowLeftRight,
    Coins,
    AlertTriangle,
    HelpCircle,
    ArrowRight
} from "lucide-react";

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
    const isCancelledRef = useRef(false);

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
            isCancelledRef.current = false;
        }
    }, [isOpen]);

    if (!isOpen || !reconciliation) return null;

    const startExecution = async () => {
        isCancelledRef.current = false;
        setRunning(true);
        setCurrentStepIndex(0);

        const stepDelay = 280;

        for (let i = 0; i < steps.length - 1; i++) {
            await new Promise((r) => setTimeout(r, stepDelay));
            if (isCancelledRef.current) return;
            setCurrentStepIndex(i + 1);
        }

        try {
            if (isCancelledRef.current) return;
            const outcome = await onConfirmRun();
            if (isCancelledRef.current) return;
            setFinalOutcome(outcome);
            setRunFinished(true);
        } catch {
            if (!isCancelledRef.current) {
                setRunning(false);
            }
        }
    };

    const handleClose = () => {
        isCancelledRef.current = true;
        setRunning(false);
        onClose();
    };

    const currentVersion = reconciliation.version || 1;
    const nextVersion = currentVersion + 1;

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div
                className="modal-container run-reconciliation-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Modal Header */}
                <div className="modal-header">
                    <div>
                        <div className="modal-badge">
                            {isRerun ? "Reconciliation Engine • Re-run" : "Reconciliation Engine • Run"}
                        </div>
                        <h2 className="modal-title">
                            {isRerun ? "Rerun Reconciliation Engine" : "Run Reconciliation"}
                        </h2>
                        {reconciliation?.reconciliationName && (
                            <p className="modal-subtitle">
                                For reconciliation: <strong className="text-white">{reconciliation.reconciliationName}</strong>
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={handleClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {/* STATE 1: CONFIRMATION PROMPT (BEFORE EXECUTION) */}
                    {!running && !runFinished && (
                        <div className="run-confirm-container">
                            <p className="run-confirm-lead-text">
                                This will execute the automated <strong className="text-slate-100">YesCapital Reconciliation Engine</strong>:
                            </p>

                            <div className="run-compact-rules-box">
                                <div className="run-compact-rule-row">
                                    <div className="run-rule-dot blue">
                                        <ArrowLeftRight size={13} />
                                    </div>
                                    <div className="run-compact-rule-text">
                                        <strong className="text-slate-200">M In</strong> must match <strong className="text-slate-200">M Out</strong>
                                    </div>
                                </div>

                                <div className="run-compact-rule-row">
                                    <div className="run-rule-dot emerald">
                                        <CheckCircle2 size={13} />
                                    </div>
                                    <div className="run-compact-rule-text">
                                        <strong className="text-slate-200">Transaction amounts</strong> must match exactly
                                    </div>
                                </div>

                                <div className="run-compact-rule-row">
                                    <div className="run-rule-dot amber">
                                        <Coins size={13} />
                                    </div>
                                    <div className="run-compact-rule-text">
                                        <strong className="text-slate-200">Commission:</strong> Exactly one side must collect commission.
                                    </div>
                                </div>
                            </div>

                            {isRerun && (
                                <div className="run-compact-version-note">
                                    <div className="run-version-transition">
                                        <RefreshCw size={13} className="text-blue-400 shrink-0" />
                                        <span className="run-version-pill current">V {currentVersion}</span>
                                        <ArrowRight size={12} className="text-slate-500" />
                                        <span className="run-version-pill next">V {nextVersion}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATE 2: RUNNING PROGRESS ANIMATION (EXACT MATCH WITH IMPORT EXCEL MODAL) */}
                    {running && !runFinished && (
                        <div className="upload-progress-container">
                            <div className="reconciliation-gear-animation">
                                <Cpu size={32} className="spin text-blue-400" />
                            </div>
                            <h3 className="uploading-title">
                                {isRerun ? "Re-running Reconciliation Engine" : "Running Reconciliation Engine"}
                            </h3>
                            <p className="uploading-stage">{steps[currentStepIndex]}</p>
                            <div className="progress-percent">
                                Processing Step {currentStepIndex + 1} of {steps.length}
                            </div>
                        </div>
                    )}

                    {/* STATE 3: EXECUTION COMPLETE DIALOG */}
                    {runFinished && finalOutcome && (
                        <div className="run-completed-container">
                            <div className="run-completed-hero">
                                <div className="run-completed-icon-ring">
                                    <CheckCircle2 size={26} className="text-emerald-400" />
                                </div>
                                <h3 className="run-completed-title text-base font-bold text-slate-100">
                                    Reconciliation Execution Complete
                                </h3>


                                <div className="run-completed-badge-row">
                                    <span className="run-badge-pill version">
                                        Version {finalOutcome.reconciliation?.version || reconciliation.version}
                                    </span>
                                    <span className={`run-badge-pill status ${
                                        finalOutcome.reconciliation?.status === "COMPLETED" || finalOutcome.reconciliation?.status === "RECONCILED"
                                            ? "success"
                                            : "issue"
                                    }`}>
                                        <span className="status-dot-pulse"></span>
                                        <span>{finalOutcome.reconciliation?.status || "ISSUES_FOUND"}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="run-metrics-grid">
                                <div className="run-metric-card matched">
                                    <div className="run-metric-icon-wrap">
                                        <CheckCircle2 size={13} />
                                    </div>
                                    <div className="run-metric-val">
                                        {finalOutcome.reconciliation?.matchedCount ?? 0}
                                    </div>
                                    <div className="run-metric-label">Matched</div>
                                </div>

                                <div className="run-metric-card unmatched">
                                    <div className="run-metric-icon-wrap">
                                        <HelpCircle size={13} />
                                    </div>
                                    <div className="run-metric-val">
                                        {finalOutcome.reconciliation?.unmatchedCount ?? 0}
                                    </div>
                                    <div className="run-metric-label">Unmatched</div>
                                </div>

                                <div className="run-metric-card issues">
                                    <div className="run-metric-icon-wrap">
                                        <AlertTriangle size={13} />
                                    </div>
                                    <div className="run-metric-val">
                                        {finalOutcome.reconciliation?.errorCount ?? 0}
                                    </div>
                                    <div className="run-metric-label">Issues</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Actions */}
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
                                className="primary-button flex items-center gap-1.5"
                                onClick={startExecution}
                            >
                                <Play size={14} />
                                <span>Confirm &amp; Execute</span>
                            </button>
                        </>
                    )}
                    {running && !runFinished && (
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={handleClose}
                        >
                            Cancel
                        </button>
                    )}
                    {runFinished && (
                        <button
                            type="button"
                            className="primary-button w-full flex items-center justify-center gap-1.5"
                            onClick={handleClose}
                        >
                            <span>View Updated Results &amp; Workspace</span>
                            <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
