import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { importTransactions, getBranches, createReconciliation, deleteReconciliation } from "../../services/api";
import { parseExcelWorkbook, formatFileSize } from "../../utils/excelParser";
import {
    UploadCloud,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    X,
    ArrowRight,
    FileCheck,
    RotateCw,
    Cpu
} from "lucide-react";

export default function ImportExcelModal() {
    const {
        isImportModalOpen,
        closeImportModal,
        importReconciliationData,
        addToast,
        triggerRefresh
    } = useApp();

    const navigate = useNavigate();

    const [fileState, setFileState] = useState(null); // { name, size, type }
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [statusStage, setStatusStage] = useState("");
    const [previewData, setPreviewData] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [branches, setBranches] = useState([]);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isImportModalOpen) {
            getBranches().then(setBranches).catch(() => {});
        }
    }, [isImportModalOpen]);

    if (!isImportModalOpen || !importReconciliationData) return null;

    const handleBrowseClick = (e) => {
        if (e) e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleProcessRealFile(file);
        }
    };

    const handleProcessRealFile = async (file) => {
        if (!file) return;

        // 1. Validate file format extension
        const nameParts = file.name.split(".");
        const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
        const allowed = ["xlsx", "xls", "csv"];
        if (!allowed.includes(ext)) {
            addToast({
                type: "error",
                title: "Unsupported File Format",
                message: `Please upload an Excel spreadsheet (.xlsx, .xls) or .csv file. Received: .${ext || "unknown"}`
            });
            return;
        }

        // 2. Validate empty file
        if (file.size === 0) {
            addToast({
                type: "error",
                title: "Empty File",
                message: "The selected file is empty (0 bytes). Please choose a valid Excel workbook."
            });
            return;
        }

        setFileState({
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        setUploading(true);
        setUploadProgress(15);
        setStatusStage(`Reading workbook sheets (${file.name})...`);

        try {
            await new Promise((r) => setTimeout(r, 200));
            setUploadProgress(50);
            setStatusStage("Parsing M_IN and M_OUT transaction rows...");

            const branchList = await getBranches().catch(() => branches);
            setBranches(branchList);
            const parsed = await parseExcelWorkbook(file, branchList, importReconciliationData?.id || 0);

            await new Promise((r) => setTimeout(r, 300));
            setUploadProgress(85);
            setStatusStage("Validating branch names against database...");

            await new Promise((r) => setTimeout(r, 250));
            setUploadProgress(100);
            setStatusStage("Validation complete. Ready for preview.");

            await new Promise((r) => setTimeout(r, 150));
            setUploading(false);
            setPreviewData(parsed);

            if (parsed.invalidBranchErrors && parsed.invalidBranchErrors.length > 0) {
                addToast({
                    type: "error",
                    title: "Unregistered Branches Detected",
                    message: `File contains ${parsed.invalidBranchErrors.length} unregistered branch reference(s). Import is blocked until branches match the database.`
                });
            } else {
                addToast({
                    type: "success",
                    title: "Excel File Loaded",
                    message: `Parsed ${parsed.totalRows} transactions from "${file.name}". All branch names verified against the database.`
                });
            }
        } catch (err) {
            setUploading(false);
            resetImport();
            addToast({
                type: "error",
                title: "Excel Parsing Error",
                message: err.message || "Failed to parse transactions from selected Excel file."
            });
        }
    };

    const handleConfirmImport = async () => {
        if (!previewData) return;

        if (previewData.invalidBranchErrors && previewData.invalidBranchErrors.length > 0) {
            addToast({
                type: "error",
                title: "Import Blocked",
                message: `Cannot import transactions with ${previewData.invalidBranchErrors.length} unregistered branch name(s). All branches must already exist in the database.`
            });
            return;
        }

        let created = null;
        try {
            setConfirming(true);

            let targetId = importReconciliationData?.id;
            let targetName = importReconciliationData?.reconciliationName;

            // 1. If not yet created in DB (staged from Step 1), create it now upon user confirmation!
            if (!targetId) {
                created = await createReconciliation(importReconciliationData);
                targetId = created.id;
                targetName = created.reconciliationName;
            }

            // 2. Import transactions linked to confirmed targetId
            try {
                await importTransactions(
                    targetId,
                    previewData.transactions
                );
            } catch (importErr) {
                // If transactions bulk import fails and we just created this reconciliation,
                // roll it back immediately so zero incomplete records remain in database!
                if (created && !importReconciliationData.id) {
                    try {
                        await deleteReconciliation(targetId);
                    } catch (cleanupErr) {
                        console.error("Failed to rollback incomplete reconciliation:", cleanupErr);
                    }
                }
                throw importErr;
            }

            triggerRefresh();

            addToast({
                type: "success",
                title: "Excel Import Successful",
                message: `Imported ${previewData.mInCount} M_IN and ${previewData.mOutCount} M_OUT rows into "${targetName}".`
            });

            closeImportModal();
            navigate(`/reconciliations/${targetId}?tab=transactions`);
        } catch (err) {
            addToast({
                type: "error",
                title: "Import Error",
                message: err.message || "Failed to import transactions."
            });
        } finally {
            setConfirming(false);
        }
    };

    const resetImport = () => {
        setFileState(null);
        setPreviewData(null);
        setUploadProgress(0);
        setStatusStage("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="modal-backdrop" onClick={closeImportModal}>
            <div
                className="modal-container import-excel-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Hidden Native File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                    style={{ display: "none" }}
                />

                <div className="modal-header">
                    <div>
                        <div className="modal-badge">
                            Step 2 of 2 • File Import
                        </div>
                        <h2 className="modal-title">
                            Import Excel Transactions
                        </h2>
                        {importReconciliationData?.reconciliationName && (
                            <p className="modal-subtitle">
                                For reconciliation: <strong className="text-white">{importReconciliationData.reconciliationName}</strong>
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={closeImportModal}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    {!previewData && !uploading && (
                        <div className="excel-dropzone-wrapper">
                            {/* Drag and Drop Zone */}
                            <div
                                className={`excel-dropzone-box ${isDragging ? "dropzone-dragging" : ""}`}
                                onClick={handleBrowseClick}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDragging(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDragging(false);
                                    const droppedFile = e.dataTransfer.files?.[0];
                                    if (droppedFile) {
                                        handleProcessRealFile(droppedFile);
                                    }
                                }}
                            >
                                <div className="excel-dropzone-icon-circle">
                                    <UploadCloud size={40} className="excel-dropzone-cloud-icon" />
                                </div>
                                <h3 className="excel-dropzone-title">
                                    Click or Drag &amp; Drop Excel Spreadsheet
                                </h3>
                                <p className="excel-dropzone-subtitle">
                                    Select your transaction workbook containing <code>M_IN</code> and <code>M_OUT</code> sheets
                                </p>
                                <div className="excel-supported-formats-pills">
                                    <span className="excel-format-pill">.XLSX</span>
                                    <span className="excel-format-pill">.XLS</span>
                                    <span className="excel-format-pill">.CSV</span>
                                    <span className="excel-format-divider">•</span>
                                    <span className="excel-format-note">Requires M_IN &amp; M_OUT sheets</span>
                                </div>
                                <div className="excel-dropzone-button-wrap">
                                    <button
                                        type="button"
                                        className="excel-browse-btn"
                                        onClick={handleBrowseClick}
                                    >
                                        <FileSpreadsheet size={17} />
                                        Browse File
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {uploading && (
                        <div className="upload-progress-container">
                            <div className="reconciliation-gear-animation">
                                <Cpu size={32} className="spin text-blue-400" />
                            </div>
                            <h3 className="uploading-title">Processing Excel File</h3>
                            <p className="uploading-stage">{statusStage}</p>
                            <div className="progress-percent">{uploadProgress}% complete</div>
                        </div>
                    )}

                    {previewData && (
                        <div className="excel-preview-container">
                            {/* File summary banner */}
                            <div className="excel-preview-file-banner">
                                <div className="excel-banner-left">
                                    <div className="excel-file-icon-box">
                                        <FileSpreadsheet size={24} className="excel-banner-icon" />
                                    </div>
                                    <div className="excel-file-info">
                                        <div className="excel-file-title-row">
                                            <span className="excel-filename">{fileState?.name || previewData.fileName}</span>
                                            <span className="excel-filesize-badge">{fileState?.size || previewData.fileSize}</span>
                                        </div>
                                        <div className="excel-file-subtitle">
                                            {previewData.invalidBranchErrors && previewData.invalidBranchErrors.length > 0
                                                ? `${previewData.invalidBranchErrors.length} unregistered branch error(s) detected • Import blocked`
                                                : `${previewData.totalRows} transactions parsed successfully • Ready for YesCapital Engine`}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="excel-change-file-btn"
                                    onClick={resetImport}
                                >
                                    <RotateCw size={14} />
                                    Change File
                                </button>
                            </div>

                            {/* 4 KPI Stat Cards */}
                            <div className="excel-preview-stat-grid">
                                <div className="excel-stat-card">
                                    <div className="excel-stat-header">
                                        <span className="excel-stat-dot dot-cyan"></span>
                                        <span className="excel-stat-label">M_IN Sheet</span>
                                    </div>
                                    <div className="excel-stat-val text-cyan">
                                        {previewData.mInCount} <span className="excel-stat-unit">rows</span>
                                    </div>
                                </div>
                                <div className="excel-stat-card">
                                    <div className="excel-stat-header">
                                        <span className="excel-stat-dot dot-indigo"></span>
                                        <span className="excel-stat-label">M_OUT Sheet</span>
                                    </div>
                                    <div className="excel-stat-val text-indigo">
                                        {previewData.mOutCount} <span className="excel-stat-unit">rows</span>
                                    </div>
                                </div>
                                <div className="excel-stat-card">
                                    <div className="excel-stat-header">
                                        <CheckCircle2 size={15} className="text-emerald" />
                                        <span className="excel-stat-label">Valid Entries</span>
                                    </div>
                                    <div className="excel-stat-val text-emerald">
                                        {previewData.validCount} <span className="excel-stat-unit">verified</span>
                                    </div>
                                </div>
                                <div className="excel-stat-card">
                                    <div className="excel-stat-header">
                                        <AlertTriangle size={15} className={previewData.errorCount > 0 ? "text-rose-400" : "text-amber"} />
                                        <span className="excel-stat-label">{previewData.errorCount > 0 ? "Branch Errors" : "Warnings"}</span>
                                    </div>
                                    <div className={`excel-stat-val ${previewData.errorCount > 0 ? "text-rose-400" : "text-amber"}`}>
                                        {previewData.errorCount > 0 ? previewData.errorCount : previewData.warningCount} <span className="excel-stat-unit">{previewData.errorCount > 0 ? "errors" : "flagged"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Invalid Branch Error Details Box */}
                            {previewData.invalidBranchErrors && previewData.invalidBranchErrors.length > 0 && (
                                <div style={{
                                    marginTop: "1.25rem",
                                    padding: "1rem",
                                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    borderRadius: "0.5rem"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                                        <AlertTriangle size={18} />
                                        <span>Unregistered Branches Detected ({previewData.invalidBranchErrors.length} Issue{previewData.invalidBranchErrors.length > 1 ? "s" : ""}) - Import Blocked</span>
                                    </div>

                                    <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.375rem", backgroundColor: "rgba(0,0,0,0.25)", padding: "0.5rem 0.75rem" }}>
                                        {previewData.invalidBranchErrors.map((err, idx) => (
                                            <div key={idx} style={{ fontSize: "0.8rem", color: "#fca5a5", padding: "0.3rem 0", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: idx < previewData.invalidBranchErrors.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                                <span style={{ fontWeight: 600, color: "#94a3b8" }}>[{err.sheet} Row {err.row}]</span>
                                                <span style={{ color: "#e2e8f0" }}>{err.direction}:</span>
                                                <span style={{ color: "#ef4444", fontWeight: 700, backgroundColor: "rgba(239, 68, 68, 0.2)", padding: "1px 6px", borderRadius: "3px" }}>{err.branchName}</span>
                                                <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>is not registered in the database</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={closeImportModal}
                        disabled={confirming}
                    >
                        Cancel
                    </button>
                    {previewData && (
                        <button
                            type="button"
                            className="primary-button confirm-import-btn"
                            onClick={handleConfirmImport}
                            disabled={confirming || (previewData.invalidBranchErrors && previewData.invalidBranchErrors.length > 0)}
                            style={previewData.invalidBranchErrors && previewData.invalidBranchErrors.length > 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                        >
                            {confirming ? (
                                "Importing..."
                            ) : previewData.invalidBranchErrors && previewData.invalidBranchErrors.length > 0 ? (
                                "Import Blocked (Unregistered Branches)"
                            ) : (
                                <>
                                    Confirm Import ({previewData.totalRows} Rows)
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
