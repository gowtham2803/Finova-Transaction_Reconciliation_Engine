import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { importTransactions } from "../../services/mockApi";
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

    if (!isImportModalOpen || !importReconciliationData) return null;

    const handleSelectFile = (fileName = "transactions_october_batch.xlsx") => {
        setFileState({
            name: fileName,
            size: "142.8 KB",
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        simulateUpload();
    };

    const simulateUpload = () => {
        setUploading(true);
        setUploadProgress(10);
        setStatusStage("Reading workbook sheets (M_IN & M_OUT)...");

        setTimeout(() => {
            setUploadProgress(45);
            setStatusStage("Parsing 23 M_IN rows & 23 M_OUT rows...");
        }, 350);

        setTimeout(() => {
            setUploadProgress(80);
            setStatusStage("Validating branch IDs and numeric amounts...");
        }, 700);

        setTimeout(() => {
            setUploadProgress(100);
            setStatusStage("Validation complete. Ready for preview.");
            setUploading(false);

            // Construct preview using rich realistic transactions
            const sampleTxns = initialMockTransactions.map((t) => ({
                ...t,
                reconciliationId: importReconciliationData.id
            }));

            const mIns = sampleTxns.filter((t) => t.sourceSheet === "M_IN");
            const mOuts = sampleTxns.filter((t) => t.sourceSheet === "M_OUT");

            setPreviewData({
                fileName: "transactions_october_batch.xlsx",
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
        }, 1050);
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
    };

    return (
        <div className="modal-backdrop" onClick={closeImportModal}>
            <div
                className="modal-container import-excel-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
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
                                className="dropzone-area"
                                onClick={() => handleSelectFile("transactions_october_batch.xlsx")}
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectFile("transactions_october_batch.xlsx");
                                        }}
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
                                    onClick={() => handleSelectFile("tamil_nadu_hubs_october_settlement.xlsx")}
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
                                        <div className="file-name">{fileState?.name || "transactions_october.xlsx"}</div>
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
                                            {previewData.sampleMIns.map((row) => (
                                                <tr key={row.id}>
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
                                            {previewData.sampleMOuts.map((row) => (
                                                <tr key={row.id}>
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
