import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { importTransactions, getBranches } from "../../services/api";
import { parseExcelWorkbook, formatFileSize } from "../../utils/excelParser";
import { initialMockTransactions } from "../../mock/mockTransactions";
import {
    UploadCloud,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    X,
    ArrowRight,
    Sparkles,
    FileCheck
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

            const branchList = branches.length > 0 ? branches : await getBranches().catch(() => []);
            const parsed = await parseExcelWorkbook(file, branchList, importReconciliationData.id);

            await new Promise((r) => setTimeout(r, 300));
            setUploadProgress(85);
            setStatusStage("Validating branch IDs and numeric amounts...");

            await new Promise((r) => setTimeout(r, 250));
            setUploadProgress(100);
            setStatusStage("Validation complete. Ready for preview.");

            await new Promise((r) => setTimeout(r, 150));
            setUploading(false);
            setPreviewData(parsed);

            addToast({
                type: "success",
                title: "Excel File Loaded",
                message: `Parsed ${parsed.totalRows} transactions from "${file.name}". Review preview below.`
            });
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

    const handleLoadSampleDataset = () => {
        setFileState({
            name: "tamil_nadu_hubs_october_settlement.xlsx",
            size: "142.8 KB",
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        setUploading(true);
        setUploadProgress(15);
        setStatusStage("Reading demo workbook sheets (M_IN & M_OUT)...");

        setTimeout(() => {
            setUploadProgress(50);
            setStatusStage("Parsing 23 M_IN rows & 23 M_OUT rows...");
        }, 250);

        setTimeout(() => {
            setUploadProgress(85);
            setStatusStage("Validating branch IDs and numeric amounts...");
        }, 500);

        setTimeout(() => {
            setUploadProgress(100);
            setStatusStage("Validation complete. Ready for preview.");
            setUploading(false);

            const sampleTxns = initialMockTransactions.map((t) => ({
                ...t,
                reconciliationId: importReconciliationData.id
            }));

            const mIns = sampleTxns.filter((t) => t.sourceSheet === "M_IN");
            const mOuts = sampleTxns.filter((t) => t.sourceSheet === "M_OUT");

            setPreviewData({
                fileName: "tamil_nadu_hubs_october_settlement.xlsx",
                totalRows: sampleTxns.length,
                mInCount: mIns.length,
                mOutCount: mOuts.length,
                validCount: sampleTxns.length - 2,
                warningCount: 2,
                errorCount: 0,
                transactions: sampleTxns,
                sampleMIns: mIns.slice(0, 4),
                sampleMOuts: mOuts.slice(0, 4)
            });
        }, 800);
    };

    const handleConfirmImport = async () => {
        if (!previewData) return;
        try {
            setConfirming(true);
            await importTransactions(
                importReconciliationData.id,
                previewData.transactions
            );

            triggerRefresh();

            addToast({
                type: "success",
                title: "Excel Import Successful",
                message: `Imported ${previewData.mInCount} M_IN and ${previewData.mOutCount} M_OUT rows into "${importReconciliationData.reconciliationName}".`
            });

            closeImportModal();
            navigate(`/reconciliations/${importReconciliationData.id}?tab=transactions`);
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
                        <p className="modal-subtitle">
                            Target Reconciliation: <strong>{importReconciliationData.reconciliationName}</strong> ({importReconciliationData.reconciliationCode})
                        </p>
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
                        <div>
                            {/* Drag and Drop Zone */}
                            <div
                                className={`dropzone-area ${isDragging ? "dropzone-dragging" : ""}`}
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
                                <div className="dropzone-icon-wrap">
                                    <UploadCloud size={38} className="dropzone-icon" />
                                </div>
                                <h3 className="dropzone-title">
                                    Click or Drag &amp; Drop Excel Spreadsheet
                                </h3>
                                <p className="dropzone-hint">
                                    Supports .xlsx, .xls, .csv with <code>M_IN</code> and <code>M_OUT</code> sheets
                                </p>
                                <div className="dropzone-actions">
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={handleBrowseClick}
                                    >
                                        <FileSpreadsheet size={16} />
                                        Browse File
                                    </button>
                                </div>
                            </div>

                            {/* Sample Template Quick Click */}
                            <div className="sample-template-box">
                                <div className="sample-template-info">
                                    <Sparkles size={18} className="text-blue-500" />
                                    <div>
                                        <div className="sample-template-title">
                                            Quick Demo: Load Sample South Zone Dataset
                                        </div>
                                        <div className="sample-template-desc">
                                            Pre-populated with 23 M In and 23 M Out transactions across Chennai, Madurai, Coimbatore, Trichy, Salem.
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="primary-button sample-btn"
                                    onClick={handleLoadSampleDataset}
                                >
                                    Load Sample Excel
                                </button>
                            </div>
                        </div>
                    )}

                    {uploading && (
                        <div className="upload-progress-container">
                            <div className="uploading-spinner-wrap">
                                <div className="uploading-spinner"></div>
                            </div>
                            <h3 className="uploading-title">Processing Excel File</h3>
                            <p className="uploading-stage">{statusStage}</p>
                            <div className="progress-bar-track">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <div className="progress-percent">{uploadProgress}% complete</div>
                        </div>
                    )}

                    {previewData && (
                        <div className="preview-container">
                            {/* File summary pill */}
                            <div className="file-summary-card">
                                <div className="file-summary-left">
                                    <div className="file-badge-icon">
                                        <FileCheck size={22} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <div className="file-name">{fileState?.name || previewData.fileName}</div>
                                        <div className="file-meta">
                                            {previewData.totalRows} total rows detected • Formatted for YesCapital
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="change-file-btn"
                                    onClick={resetImport}
                                >
                                    Change File
                                </button>
                            </div>

                            {/* Stat chips */}
                            <div className="import-stat-grid">
                                <div className="import-stat-card">
                                    <div className="import-stat-label">M In Sheet</div>
                                    <div className="import-stat-val text-blue-600">{previewData.mInCount} rows</div>
                                </div>
                                <div className="import-stat-card">
                                    <div className="import-stat-label">M Out Sheet</div>
                                    <div className="import-stat-val text-indigo-600">{previewData.mOutCount} rows</div>
                                </div>
                                <div className="import-stat-card">
                                    <div className="import-stat-label">Valid Entries</div>
                                    <div className="import-stat-val text-emerald-600">
                                        <CheckCircle2 size={15} />
                                        {previewData.validCount}
                                    </div>
                                </div>
                                <div className="import-stat-card">
                                    <div className="import-stat-label">Warnings</div>
                                    <div className="import-stat-val text-amber-600">
                                        <AlertTriangle size={15} />
                                        {previewData.warningCount}
                                    </div>
                                </div>
                            </div>

                            {/* Split preview snippet tables */}
                            <div className="import-preview-tables">
                                <div className="import-preview-column">
                                    <div className="preview-column-header">
                                        <span>Preview: M In (First 4 rows)</span>
                                        <span className="badge-count">{previewData.mInCount} total</span>
                                    </div>
                                    <table className="mini-preview-table">
                                        <thead>
                                            <tr>
                                                <th>BRANCH</th>
                                                <th>From BRANCH</th>
                                                <th>AMOUNT</th>
                                                <th>COMM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.sampleMIns.map((row, idx) => (
                                                <tr key={row.id || `min-${idx}`}>
                                                    <td>{row.toBranchName}</td>
                                                    <td>{row.fromBranchName}</td>
                                                    <td className="text-right">₹{Number(row.amount).toLocaleString("en-IN")}</td>
                                                    <td className="text-right">₹{row.commission}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="import-preview-column">
                                    <div className="preview-column-header">
                                        <span>Preview: M Out (First 4 rows)</span>
                                        <span className="badge-count">{previewData.mOutCount} total</span>
                                    </div>
                                    <table className="mini-preview-table">
                                        <thead>
                                            <tr>
                                                <th>BRANCH</th>
                                                <th>To BRANCH</th>
                                                <th>AMOUNT</th>
                                                <th>COMM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.sampleMOuts.map((row, idx) => (
                                                <tr key={row.id || `mout-${idx}`}>
                                                    <td>{row.fromBranchName}</td>
                                                    <td>{row.toBranchName}</td>
                                                    <td className="text-right">₹{Number(row.amount).toLocaleString("en-IN")}</td>
                                                    <td className="text-right">₹{row.commission}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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
                            disabled={confirming}
                        >
                            {confirming ? (
                                "Importing..."
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
