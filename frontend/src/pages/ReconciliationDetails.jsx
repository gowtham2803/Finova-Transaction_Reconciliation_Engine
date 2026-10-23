import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    getReconciliation,
    getReconciliationErrors,
    getReconciliationResults,
    runReconciliation,
    resolveError,
    getAuditLogs,
    getBranches
} from "../services/mockApi";
import { useApp } from "../context/AppContext";
import TransactionWorkspace from "../components/common/TransactionWorkspace";
import RunReconciliationModal from "../components/modals/RunReconciliationModal";
import ResolveErrorModal from "../components/modals/ResolveErrorModal";
import {
    ArrowLeft,
    RotateCw,
    Play,
    CheckCircle2,
    AlertTriangle,
    Layers,
    TableProperties,
    CheckSquare,
    AlertOctagon,
    History,
    Calendar,
    Clock,
    Tag,
    ShieldCheck,
    Search,
    ChevronRight,
    ExternalLink
} from "lucide-react";

/* Modern, stylish, glowing scorecard visual icons styled like the reference React logo */
function TotalTxVisual() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="kpi-svg-icon">
            <defs>
                <linearGradient id="kpiTotalGrad" x1="6" y1="6" x2="46" y2="46" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
            </defs>
            <path d="M12 24C12 17.37 17.37 12 24 12H38M38 12L31 6M38 12L31 18" stroke="url(#kpiTotalGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M40 28C40 34.63 34.63 40 28 40H14M14 40L21 34M14 40L21 46" stroke="url(#kpiTotalGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="26" cy="26" r="3.5" fill="#38bdf8" />
            <circle cx="12" cy="24" r="2" fill="#60a5fa" />
            <circle cx="40" cy="28" r="2" fill="#2563eb" />
        </svg>
    );
}

function MInVisual() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="kpi-svg-icon">
            <defs>
                <linearGradient id="kpiMInGrad" x1="38" y1="10" x2="12" y2="42" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
            </defs>
            <path d="M14 26V38H26" stroke="url(#kpiMInGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M38 14L16 36M16 36H28M16 36V24" stroke="url(#kpiMInGrad)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M32 10L38 10V16" stroke="url(#kpiMInGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <circle cx="38" cy="14" r="3.5" fill="#38bdf8" />
        </svg>
    );
}

function MOutVisual() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="kpi-svg-icon">
            <defs>
                <linearGradient id="kpiMOutGrad" x1="12" y1="42" x2="38" y2="10" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
            </defs>
            <path d="M26 38H14V26" stroke="url(#kpiMOutGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 36L38 14M38 14H26M38 14V26" stroke="url(#kpiMOutGrad)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 42L14 42V36" stroke="url(#kpiMOutGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <circle cx="38" cy="14" r="3.5" fill="#c084fc" />
        </svg>
    );
}

function MatchedVisual() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="kpi-svg-icon">
            <defs>
                <linearGradient id="kpiMatchedGrad" x1="8" y1="8" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>
            <circle cx="26" cy="26" r="18" stroke="url(#kpiMatchedGrad)" strokeWidth="2.8" strokeDasharray="68 12" strokeLinecap="round" />
            <path d="M16 27L23 34L36 19" stroke="url(#kpiMatchedGrad)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="42" cy="18" r="2.5" fill="#6ee7b7" />
            <circle cx="10" cy="34" r="2" fill="#34d399" />
        </svg>
    );
}

function UnmatchedVisual() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="kpi-svg-icon">
            <defs>
                <linearGradient id="kpiUnmatchedGrad" x1="10" y1="8" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
            </defs>
            <path d="M26 9L43 39H9L26 9Z" stroke="url(#kpiUnmatchedGrad)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 20V28" stroke="url(#kpiUnmatchedGrad)" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="26" cy="34" r="2.2" fill="#fde047" />
            <circle cx="39" cy="18" r="2" fill="#fbbf24" opacity="0.8" />
            <circle cx="13" cy="28" r="1.5" fill="#fde047" opacity="0.6" />
        </svg>
    );
}

function OpenErrorsVisual() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="kpi-svg-icon">
            <defs>
                <linearGradient id="kpiOpenErrorsGrad" x1="8" y1="8" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fda4af" />
                    <stop offset="50%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
            </defs>
            <path d="M16 8H36L44 16V36L36 44H16L8 36V16L16 8Z" stroke="url(#kpiOpenErrorsGrad)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 17V29" stroke="url(#kpiOpenErrorsGrad)" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="26" cy="35" r="2.5" fill="#fda4af" />
            <circle cx="8" cy="16" r="2" fill="#fb7185" />
            <circle cx="44" cy="36" r="2" fill="#fda4af" />
        </svg>
    );
}

function ResolvedErrorsVisual() {
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="kpi-svg-icon">
            <defs>
                <linearGradient id="kpiResolvedGrad" x1="8" y1="6" x2="44" y2="46" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#5eead4" />
                    <stop offset="50%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
            </defs>
            <path d="M26 8L41 14V27C41 36 34 43 26 46C18 43 11 36 11 27V14L26 8Z" stroke="url(#kpiResolvedGrad)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 26L24 31L33 21" stroke="url(#kpiResolvedGrad)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="26" cy="8" r="2.5" fill="#5eead4" />
        </svg>
    );
}

export default function ReconciliationDetails() {
    const { reconciliationId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { addToast, triggerRefresh, refreshSignal } = useApp();
    const workspaceRef = useRef(null);

    const [reconciliation, setReconciliation] = useState(null);
    const [results, setResults] = useState([]);
    const [errors, setErrors] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Active Tab directly derived from URL query param
    const activeTab = searchParams.get("tab") || "overview";

    // Modals
    const [isRunModalOpen, setIsRunModalOpen] = useState(false);
    const [resolvingError, setResolvingError] = useState(null);

    // Results Tab Filters
    const [resultsFilter, setResultsFilter] = useState("ALL"); // ALL, MATCHED, UNMATCHED, ISSUE
    const [resultsSearch, setResultsSearch] = useState("");

    // Errors Tab Filters
    const [errorsFilter, setErrorsFilter] = useState("OPEN"); // ALL, OPEN, RESOLVED
    const [errorsSearch, setErrorsSearch] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [recData, resData, errData, logsData, branchesData] = await Promise.all([
                getReconciliation(reconciliationId),
                getReconciliationResults(reconciliationId),
                getReconciliationErrors(reconciliationId),
                getAuditLogs({ reconciliationId }),
                getBranches().catch(() => [])
            ]);

            setReconciliation(recData);
            setResults(Array.isArray(resData) ? resData : []);
            setErrors(Array.isArray(errData) ? errData : []);
            setAuditLogs(Array.isArray(logsData) ? logsData : []);
            if (Array.isArray(branchesData)) {
                setBranches(branchesData);
            }
        } catch (err) {
            addToast({
                type: "error",
                title: "Failed to load reconciliation",
                message: err.message
            });
        } finally {
            setLoading(false);
        }
    }, [reconciliationId, addToast]);

    useEffect(() => {
        let isMounted = true;
        if (isMounted) {
            loadData();
        }
        return () => {
            isMounted = false;
        };
    }, [loadData, refreshSignal]);

    const handleTabChange = (tabKey) => {
        setSearchParams({ tab: tabKey });
    };

    const handleNavigateToError = (err) => {
        if (!err) return;

        // 1. Identify sheet: M_IN or M_OUT
        let sheet = err.targetSheet || "M_IN";
        const errTypeUpper = String(err.errorType || "").toUpperCase();
        const descLower = String(err.description || "").toLowerCase();

        if (errTypeUpper === "MISSING_M_IN" || (err.mOutRow && !err.mInRow)) {
            sheet = "M_OUT";
        } else if (errTypeUpper === "MISSING_M_OUT" || (err.mInRow && !err.mOutRow)) {
            sheet = "M_IN";
        } else if (err.mOutTransaction && !err.mInTransaction) {
            sheet = "M_OUT";
        } else if (err.mInTransaction && !err.mOutTransaction) {
            sheet = "M_IN";
        } else if (descLower.includes("m out") || descLower.includes("m_out")) {
            sheet = "M_OUT";
        } else if (descLower.includes("m in") || descLower.includes("m_in")) {
            sheet = "M_IN";
        }

        // 2. Identify target transaction ID and display row
        const targetTxnId = err.targetTxnId || (sheet === "M_OUT"
            ? (err.mOutTransaction?.id || err.transactionId)
            : (err.mInTransaction?.id || err.transactionId));

        const targetDisplayRow = err.rowNumber ?? err.targetRow ?? (sheet === "M_OUT"
            ? (err.mOutRow || err.mInRow)
            : (err.mInRow || err.mOutRow));

        // 3. Identify field to highlight where applicable
        let field = err.targetField || null;
        if (!field) {
            if (errTypeUpper.includes("COMMISSION") || descLower.includes("commission")) {
                field = "commission";
            } else if (errTypeUpper.includes("AMOUNT") || descLower.includes("amount") || descLower.includes("variance")) {
                field = "amount";
            } else if (errTypeUpper.includes("BRANCH") || descLower.includes("branch")) {
                field = sheet === "M_IN" ? "toBranch" : "fromBranch";
            }
        }

        // 4. Clean focus parameters payload
        const focusPayload = {
            txnId: targetTxnId ? Number(targetTxnId) : null,
            sheet,
            field,
            displayRow: targetDisplayRow ? Number(targetDisplayRow) : null,
            sourceRow: targetDisplayRow ? Number(targetDisplayRow) : null,
            errorType: err.errorType,
            description: err.description,
            force: true
        };

        // 5. Update URL params to navigate to Transactions tab cleanly
        setSearchParams({ tab: "transactions" });

        // 6. Trigger focus on workspace deterministically on next animation frame
        requestAnimationFrame(() => {
            if (workspaceRef.current?.focusTransaction) {
                workspaceRef.current.focusTransaction(focusPayload);
            }
        });
    };

    const handleExecuteRun = async () => {
        if (workspaceRef.current?.hasUnsavedChanges()) {
            const saved = await workspaceRef.current.savePendingChanges();
            if (saved === false) {
                return;
            }
        }
        const outcome = await runReconciliation(reconciliationId);
        await loadData();
        triggerRefresh();
        if (workspaceRef.current?.reloadWorkspace) {
            await workspaceRef.current.reloadWorkspace();
        }
        const isSuccess = outcome.reconciliation?.status === "COMPLETED" || outcome.reconciliation?.status === "RECONCILED";
        addToast({
            type: isSuccess ? "success" : "warning",
            title: isSuccess ? "Reconciliation Completed" : "Issues Identified",
            message: `Version ${outcome.reconciliation?.version} processed. Matched: ${outcome.reconciliation?.matchedCount}, Errors: ${outcome.reconciliation?.errorCount}.`
        });
        return outcome;
    };

    const handleConfirmResolve = async (errorId, notes) => {
        await resolveError(errorId, notes);
        await loadData();
        triggerRefresh();
        addToast({
            type: "success",
            title: "Error Resolved",
            message: `Voucher ${errorId} marked as RESOLVED and added to audit trail.`
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "COMPLETED":
            case "RECONCILED":
                return (
                    <span className="status-badge status-success">
                        <CheckCircle2 size={13} />
                        COMPLETED
                    </span>
                );
            case "ISSUES_FOUND":
                return (
                    <span className="status-badge status-error">
                        <AlertTriangle size={13} />
                        ISSUES FOUND
                    </span>
                );
            case "PROCESSING":
                return (
                    <span className="status-badge status-processing">
                        <RotateCw size={13} className="spin" />
                        PROCESSING
                    </span>
                );
            case "PENDING":
            default:
                return (
                    <span className="status-badge status-pending">
                        <Clock size={13} />
                        PENDING
                    </span>
                );
        }
    };

    const formatDate = (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return isNaN(d.getTime()) ? val : d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const branchMap = useMemo(() => {
        const map = {};
        (branches || []).forEach((b) => {
            if (b?.id) map[b.id] = b.code || b.name;
            if (b?.code) {
                map[b.code] = b.code;
                map[b.code.toLowerCase()] = b.code;
            }
            if (b?.name) {
                map[b.name] = b.code || b.name;
                map[b.name.toLowerCase()] = b.code || b.name;
            }
        });
        return map;
    }, [branches]);

    const formatActionLabel = (action) => {
        if (!action) return "Audit Log";
        const map = {
            TRANSACTION_CREATED: "Transaction Created",
            TRANSACTION_UPDATED: "Transaction Updated",
            RECONCILIATION_RERUN: "Engine Re-run",
            RECONCILIATION_EXECUTED: "Engine Executed",
            ERROR_RESOLVED: "Error Resolved",
            RECONCILIATION_CREATED: "Reconciliation Created"
        };
        return map[action] || action.replace(/_/g, " ");
    };

    const renderAuditValue = (val, fieldName, action) => {
        if (val === null || val === undefined || val === "" || val === "—" || val === "null" || val === "NULL") {
            return <span className="audit-val-empty">—</span>;
        }

        const strVal = String(val).trim();

        // 1. Composite key-value string (e.g. sourceSheet=M_IN, fromBranchId=4, toBranchId=2, amount=50000, commission=50)
        if (strVal.includes("sourceSheet=") || strVal.includes("fromBranchId=") || strVal.includes("toBranchId=")) {
            const pairs = {};
            strVal.split(",").forEach((part) => {
                const idx = part.indexOf("=");
                if (idx !== -1) {
                    const k = part.substring(0, idx).trim();
                    const v = part.substring(idx + 1).trim();
                    pairs[k] = v;
                }
            });

            const sheet = pairs.sourceSheet;
            const fromId = pairs.fromBranchId;
            const toId = pairs.toBranchId;
            const amt = pairs.amount;
            const comm = pairs.commission;

            const fromName = fromId ? (branchMap[fromId] || branchMap[Number(fromId)] || `Branch #${fromId}`) : null;
            const toName = toId ? (branchMap[toId] || branchMap[Number(toId)] || `Branch #${toId}`) : null;

            return (
                <div className="audit-detail-pill-group">
                    {sheet && (
                        <span className={`audit-sheet-badge ${sheet === "M_IN" ? "sheet-min" : "sheet-mout"}`}>
                            {sheet === "M_IN" ? "M In" : sheet === "M_OUT" ? "M Out" : sheet}
                        </span>
                    )}
                    {(fromName || toName) && (
                        <span className="audit-route-badge">
                            <span className="route-from">{fromName || "—"}</span>
                            <span className="route-arrow">→</span>
                            <span className="route-to">{toName || "—"}</span>
                        </span>
                    )}
                    {amt !== undefined && (
                        <span className="audit-amount-badge">
                            ₹{Number(amt).toLocaleString("en-IN")}
                        </span>
                    )}
                    {comm !== undefined && (
                        <span className="audit-comm-badge">
                            Comm: ₹{Number(comm).toLocaleString("en-IN")}
                        </span>
                    )}
                </div>
            );
        }

        // 2. Status values
        const upper = strVal.toUpperCase();
        if (
            fieldName === "status" ||
            ["ISSUES_FOUND", "RECONCILED", "PENDING", "RESOLVED", "COMPLETED", "FAILED", "MATCHED", "UNMATCHED"].includes(upper)
        ) {
            const statusMap = {
                ISSUES_FOUND: { label: "Issues Found", cls: "status-issues" },
                RECONCILED: { label: "Reconciled", cls: "status-reconciled" },
                PENDING: { label: "Pending", cls: "status-pending" },
                RESOLVED: { label: "Resolved", cls: "status-resolved" },
                COMPLETED: { label: "Completed", cls: "status-reconciled" },
                FAILED: { label: "Failed", cls: "status-failed" },
                MATCHED: { label: "Matched", cls: "status-reconciled" },
                UNMATCHED: { label: "Unmatched", cls: "status-issues" }
            };
            const s = statusMap[upper] || { label: strVal, cls: "status-neutral" };
            return <span className={`audit-status-badge ${s.cls}`}>{s.label}</span>;
        }

        // 3. Amount values
        if (fieldName === "amount") {
            const num = Number(strVal);
            return (
                <span className="audit-amount-badge">
                    ₹{isNaN(num) ? strVal : num.toLocaleString("en-IN")}
                </span>
            );
        }

        // 4. Commission values
        if (fieldName === "commission") {
            const num = Number(strVal);
            return (
                <span className="audit-comm-badge">
                    Comm: ₹{isNaN(num) ? strVal : num.toLocaleString("en-IN")}
                </span>
            );
        }

        // 5. Branch ID fields
        if (fieldName === "fromBranchId" || fieldName === "toBranchId" || fieldName === "branchId" || fieldName === "branch") {
            const bName = branchMap[strVal] || branchMap[Number(strVal)] || branchMap[strVal.toLowerCase()] || `Branch #${strVal}`;
            return <span className="audit-branch-badge">{bName}</span>;
        }

        // 6. Version
        if (fieldName === "version") {
            return <span className="audit-version-badge">Version {strVal}</span>;
        }

        // 7. Sheet
        if (fieldName === "sourceSheet") {
            return (
                <span className={`audit-sheet-badge ${strVal === "M_IN" ? "sheet-min" : "sheet-mout"}`}>
                    {strVal === "M_IN" ? "M In" : strVal === "M_OUT" ? "M Out" : strVal}
                </span>
            );
        }

        // 8. Decimal values formatted as currency if numeric
        if (!isNaN(Number(strVal)) && strVal.includes(".") && Number(strVal) >= 100) {
            return <span className="audit-amount-badge">₹{Number(strVal).toLocaleString("en-IN")}</span>;
        }

        return <span className="audit-plain-val">{strVal}</span>;
    };

    // Filtered results
    const filteredResults = useMemo(() => {
        return results.filter((r) => {
            if (resultsFilter !== "ALL" && r.matchStatus !== resultsFilter) return false;
            if (resultsSearch) {
                const q = resultsSearch.toLowerCase();
                return (
                    r.sourceDescription?.toLowerCase().includes(q) ||
                    r.errorType?.toLowerCase().includes(q) ||
                    r.errorReason?.toLowerCase().includes(q) ||
                    String(r.amount).includes(q)
                );
            }
            return true;
        });
    }, [results, resultsFilter, resultsSearch]);

    // Filtered errors
    const filteredErrors = useMemo(() => {
        return errors
            .filter((e) => {
                if (errorsFilter !== "ALL" && e.status !== errorsFilter) return false;
                if (errorsSearch) {
                    const q = errorsSearch.toLowerCase();
                    return (
                        e.description?.toLowerCase().includes(q) ||
                        String(e.id)?.toLowerCase().includes(q) ||
                        e.transactionInfo?.toLowerCase().includes(q) ||
                        e.errorType?.toLowerCase().includes(q) ||
                        (e.rowNumber !== undefined && e.rowNumber !== null && String(e.rowNumber).includes(q)) ||
                        (e.rowDisplay && String(e.rowDisplay).toLowerCase().includes(q)) ||
                        (e.mInRow && String(e.mInRow).includes(q)) ||
                        (e.mOutRow && String(e.mOutRow).includes(q))
                    );
                }
                return true;
            })
            .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
                return Number(b.id) - Number(a.id);
            });
    }, [errors, errorsFilter, errorsSearch]);

    if (loading && !reconciliation) {
        return (
            <div className="p-8">
                <div className="skeleton-bar h-8 w-64 mb-4"></div>
                <div className="skeleton-bar h-24 w-full mb-6"></div>
                <div className="skeleton-bar h-96 w-full"></div>
            </div>
        );
    }

    if (!reconciliation) {
        return (
            <div className="p-8">
                <div className="error-banner">
                    <AlertTriangle size={20} />
                    <span>Reconciliation #{reconciliationId} not found or has been deleted.</span>
                    <button
                        type="button"
                        className="retry-btn"
                        onClick={() => navigate("/reconciliations")}
                    >
                        Return to Reconciliations
                    </button>
                </div>
            </div>
        );
    }

    const openErrorsCount = errors.filter((e) => e.status === "OPEN").length;
    const resolvedErrorsCount = errors.filter((e) => e.status === "RESOLVED").length;

    return (
        <div className={`reconciliation-details-page ${activeTab === "overview" ? "details-overview-mode" : ""}`}>
            {/* Top Back Action & Title Bar */}
            <div className="details-header-card">
                <div className="details-header-top">
                    <button
                        type="button"
                        className="details-back-link"
                        onClick={() => navigate("/reconciliations")}
                    >
                        <ArrowLeft size={16} />
                        <span>All Reconciliations</span>
                    </button>

                    <div className="details-header-meta">
                        <span className="version-pill">v{reconciliation.version}</span>
                        {getStatusBadge(reconciliation.status)}
                    </div>
                </div>

                <div className="details-header-main">
                    <div>
                        <h1 className="details-title-heading">
                            {reconciliation.reconciliationName}
                        </h1>
                        <div className="details-subtitle-meta">
                            <span className="font-mono text-slate-300 font-semibold">{reconciliation.reconciliationCode}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Calendar size={14} className="text-slate-400" />
                                {reconciliation.reconciliationDate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Tag size={14} className="text-slate-400" />
                                {reconciliation.referenceBatch}
                            </span>
                            <span>•</span>
                            <span className="text-xs text-slate-500">
                                Last Updated: {formatDate(reconciliation.updatedAt || reconciliation.createdAt)}
                            </span>
                        </div>
                    </div>

                    <div className="details-header-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={loadData}
                            title="Refresh data"
                        >
                            <RotateCw size={16} />
                            <span>Refresh</span>
                        </button>

                        <button
                            type="button"
                            className="primary-button run-action-btn"
                            onClick={() => setIsRunModalOpen(true)}
                        >
                            <Play size={16} />
                            <span>
                                {reconciliation.startedAt ? "Run Again" : "Run Reconciliation"}
                            </span>
                        </button>
                    </div>
                </div>
                <hr className="details-divider" />

                {/* Navigation Tabs */}
                <div className="details-tabs-bar">
                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "overview" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("overview")}
                    >
                        <Layers size={16} />
                        <span>Overview</span>
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "transactions" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("transactions")}
                    >
                        <TableProperties size={16} />
                        <span>Transactions</span>
                        <span className="tab-pill-count">
                            {reconciliation.transactionCount || 0}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "results" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("results")}
                    >
                        <CheckSquare size={16} />
                        <span>Results</span>
                        <span className="tab-pill-count">
                            {results.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "errors" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("errors")}
                    >
                        <AlertOctagon size={16} />
                        <span>Errors</span>
                        {openErrorsCount > 0 && (
                            <span className="tab-pill-count tab-pill-error">
                                {openErrorsCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        className={`details-tab-btn ${activeTab === "audit" ? "tab-active" : ""}`}
                        onClick={() => handleTabChange("audit")}
                    >
                        <History size={16} />
                        <span>Audit History</span>
                        <span className="tab-pill-count">
                            {auditLogs.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="tab-pane-content tab-pane-overview">
                    {/* Summary KPI Grid */}
                    <div className="overview-kpi-grid">
                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Total Transactions</span>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-value">{reconciliation.transactionCount || 0}</div>
                                <div className="kpi-subtext">Across both sheets</div>
                            </div>
                            <div className="kpi-glow-visual kpi-glow-blue">
                                <TotalTxVisual />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">M In Transactions</span>
                                <span className="text-xs font-semibold text-slate-200">M In</span>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-value">{reconciliation.mInCount || 0}</div>
                                <div className="kpi-subtext">Credit vouchers</div>
                            </div>
                            <div className="kpi-glow-visual kpi-glow-sky">
                                <MInVisual />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">M Out Transactions</span>
                                <span className="text-xs font-semibold text-slate-200">M Out</span>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-value">{reconciliation.mOutCount || 0}</div>
                                <div className="kpi-subtext">Debit vouchers</div>
                            </div>
                            <div className="kpi-glow-visual kpi-glow-indigo">
                                <MOutVisual />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Matched</span>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-value">{reconciliation.matchedCount || 0}</div>
                                <div className="kpi-subtext">Fully reconciled pairs</div>
                            </div>
                            <div className="kpi-glow-visual kpi-glow-emerald">
                                <MatchedVisual />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Unmatched</span>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-value">{reconciliation.unmatchedCount || 0}</div>
                                <div className="kpi-subtext">Pending counterpart</div>
                            </div>
                            <div className="kpi-glow-visual kpi-glow-amber">
                                <UnmatchedVisual />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Open Errors</span>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-value">{openErrorsCount}</div>
                                <div className="kpi-subtext">Requires resolution</div>
                            </div>
                            <div className="kpi-glow-visual kpi-glow-rose">
                                <OpenErrorsVisual />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div className="kpi-card-header">
                                <span className="kpi-label">Resolved Errors</span>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-value">{resolvedErrorsCount}</div>
                                <div className="kpi-subtext">Audited and cleared</div>
                            </div>
                            <div className="kpi-glow-visual kpi-glow-teal">
                                <ResolvedErrorsVisual />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: TRANSACTIONS WORKSPACE */}
            <div className="tab-pane-content" style={{ display: activeTab === "transactions" ? "block" : "none" }}>
                <TransactionWorkspace
                    ref={workspaceRef}
                    reconciliationId={reconciliationId}
                    refreshSignal={refreshSignal}
                    onReconciliationUpdated={loadData}
                />
            </div>

            {/* TAB CONTENT: RESULTS */}
            {activeTab === "results" && (
                <div className="tab-pane-content">
                    <div className="content-card tab-toolbar-card">
                        <div className="tab-toolbar-row">
                            <div className="tab-search-wrapper">
                                <Search size={15} className="search-icon" />
                                <input
                                    type="text"
                                    className="workspace-search-input"
                                    placeholder="Search results by branch or reason..."
                                    value={resultsSearch}
                                    onChange={(e) => setResultsSearch(e.target.value)}
                                />
                            </div>

                            <div className="tab-filters-group">
                                <span className="tab-filter-label">Filter:</span>
                                {[
                                    { id: "ALL", label: `All (${results.length})` },
                                    { id: "MATCHED", label: `Matched (${results.filter((r) => r.matchStatus === "MATCHED").length})` },
                                    { id: "ISSUE", label: `Issues (${results.filter((r) => r.matchStatus === "ISSUE").length})` },
                                    { id: "UNMATCHED", label: `Unmatched (${results.filter((r) => r.matchStatus === "UNMATCHED").length})` }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`filter-btn-pill ${resultsFilter === item.id ? "filter-btn-pill-active" : ""}`}
                                        onClick={() => setResultsFilter(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="content-card">
                        <div className="table-responsive-container">
                            <table className="enterprise-data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Transaction Hub Route</th>
{/*                                         <th>M In ID</th> */}
{/*                                         <th>M Out ID</th> */}
                                        <th className="text-right">Amount (₹)</th>
                                        <th className="text-right">M In Comm</th>
                                        <th className="text-right">M Out Comm</th>
                                        <th>Match Status</th>
                                        <th>Error Type</th>
                                        <th>Reconciliation Audit Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResults.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="table-empty-cell">
                                                No results found matching filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResults.map((r, i) => (
                                            <tr key={r.id}>
                                                <td className="text-slate-400 text-xs">{i + 1}</td>
                                                <td className="font-semibold text-slate-800">
                                                    {r.sourceDescription}
                                                </td>
{/*                                                 <td className="font-mono text-xs">{r.mInTransactionId || "—"}</td> */}
{/*                                                 <td className="font-mono text-xs">{r.mOutTransactionId || "—"}</td> */}
                                                <td className="text-right font-medium text-slate-800">
                                                    ₹{Number(r.amount).toLocaleString("en-IN")}
                                                </td>
                                                <td className="text-right text-xs">
                                                    {r.mInCommission !== null ? `₹${r.mInCommission}` : "—"}
                                                </td>
                                                <td className="text-right text-xs">
                                                    {r.mOutCommission !== null ? `₹${r.mOutCommission}` : "—"}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${
                                                        r.matchStatus === "MATCHED"
                                                            ? "status-success"
                                                            : r.matchStatus === "ISSUE"
                                                            ? "status-error"
                                                            : r.matchStatus === "UNMATCHED"
                                                            ? "status-warning"
                                                            : "status-pending"
                                                    }`}>
                                                        {r.matchStatus}
                                                    </span>
                                                </td>
                                                <td>
                                                    {r.errorType ? (
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                                                            r.matchStatus === "UNMATCHED"
                                                                ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
                                                                : "text-rose-600 bg-rose-50 border-rose-200"
                                                        }`}>
                                                            {r.errorType}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="text-xs text-slate-600 max-w-xs">
                                                    {r.errorReason}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ERRORS */}
            {activeTab === "errors" && (
                <div className="tab-pane-content">
                    <div className="content-card tab-toolbar-card">
                        <div className="tab-toolbar-row">
                            <div className="tab-search-wrapper">
                                <Search size={15} className="search-icon" />
                                <input
                                    type="text"
                                    className="workspace-search-input"
                                    placeholder="Search errors by row, type or text..."
                                    value={errorsSearch}
                                    onChange={(e) => setErrorsSearch(e.target.value)}
                                />
                            </div>

                            <div className="tab-filters-group">
                                <span className="tab-filter-label">Filter Status:</span>
                                {[
                                    { id: "ALL", label: `All (${errors.length})` },
                                    { id: "OPEN", label: `Open (${openErrorsCount})` },
                                    { id: "RESOLVED", label: `Resolved (${resolvedErrorsCount})` }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`filter-btn-pill ${errorsFilter === item.id ? "filter-btn-pill-active" : ""}`}
                                        onClick={() => setErrorsFilter(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="content-card">
                        <div className="table-responsive-container">
                            <table className="enterprise-data-table">
                                <thead>
                                    <tr>
                                        <th className="error-row-cell whitespace-nowrap">Row</th>
                                        <th>Transaction Info</th>
                                        <th>Error Type</th>
                                        <th>Description</th>
                                        <th>GO TO</th>
                                        <th>Created</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredErrors.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="table-empty-cell">
                                                No errors found matching filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredErrors.map((err) => (
                                            <tr key={err.id}>
                                                <td className="error-row-cell whitespace-nowrap">
                                                    <span className="error-row-num">
                                                        {err.rowNumber ?? (err.rowDisplay || "—")}
                                                    </span>
                                                </td>
                                                <td className="font-medium text-slate-800 text-xs">
                                                    {err.transactionInfo}
                                                </td>
                                                <td>
                                                    <span className="error-type-badge">
                                                        {err.errorType}
                                                    </span>
                                                </td>
                                                <td className="text-xs text-slate-700 max-w-sm">
                                                    <div>{err.description}</div>
                                                    {err.resolutionNotes && (
                                                        <div className="resolution-note-snippet mt-1">
                                                            <strong>Resolution:</strong> {err.resolutionNotes} (by {err.resolvedBy})
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={`goto-open-btn ${err.status === "RESOLVED" ? "goto-open-btn-resolved" : ""}`}
                                                        onClick={() => handleNavigateToError(err)}
                                                        title={`Navigate directly to error row in ${err.targetSheet === "M_OUT" ? "M Out" : "M In"} table`}
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span>Open</span>
                                                    </button>
                                                </td>
                                                <td className="text-xs text-slate-500 whitespace-nowrap">
                                                    {formatDate(err.createdAt)}
                                                </td>
                                                <td className="text-center">
                                                    {err.status === "OPEN" ? (
                                                        <button
                                                            type="button"
                                                            className="resolve-action-btn"
                                                            onClick={() => setResolvingError(err)}
                                                        >
                                                            <CheckCircle2 size={13} />
                                                            <span>Resolve</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-emerald-600 font-medium">
                                                            ✓ Resolved
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: AUDIT HISTORY */}
            {activeTab === "audit" && (
                <div className="tab-pane-content">
                    <div className="content-card">
                        <div className="content-card-header">
                            <div>
                                <h3 className="content-card-title">Batch Audit History</h3>
                                <p className="content-card-subtitle">
                                    Chronological log of changes, executions, and resolutions for this reconciliation.
                                </p>
                            </div>
                        </div>

                        <div className="table-responsive-container">
                            <table className="enterprise-data-table audit-history-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "175px" }}>Timestamp</th>
                                        <th style={{ width: "130px" }}>User</th>
                                        <th style={{ width: "190px" }}>Action</th>
                                        <th>Old Value</th>
                                        <th>New Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="table-empty-cell">
                                                No audit history logs recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="text-xs font-mono text-slate-400 whitespace-nowrap">
                                                    {formatDate(log.createdAt)}
                                                </td>
                                                <td>
                                                    <div className="text-xs font-semibold text-slate-200">{log.user}</div>
                                                </td>
                                                <td>
                                                    <span className={`audit-action-badge ${log.action?.toLowerCase()}`}>
                                                        {formatActionLabel(log.action)}
                                                    </span>
                                                </td>
                                                <td className="audit-val-cell">
                                                    {renderAuditValue(log.oldValue, log.fieldName, log.action)}
                                                </td>
                                                <td className="audit-val-cell">
                                                    {renderAuditValue(log.newValue, log.fieldName, log.action)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Run Reconciliation Execution Modal */}
            <RunReconciliationModal
                isOpen={isRunModalOpen}
                onClose={() => setIsRunModalOpen(false)}
                reconciliation={reconciliation}
                onConfirmRun={handleExecuteRun}
                isRerun={!!reconciliation.startedAt}
            />

            {/* Resolve Error Modal */}
            <ResolveErrorModal
                isOpen={!!resolvingError}
                onClose={() => setResolvingError(null)}
                error={resolvingError}
                onConfirmResolve={handleConfirmResolve}
            />
        </div>
    );
}