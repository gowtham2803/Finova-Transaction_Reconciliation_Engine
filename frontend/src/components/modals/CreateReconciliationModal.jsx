import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { createReconciliation } from "../../services/mockApi";
import { X, Calendar, FileText, Tag, AlignLeft, Sparkles, AlertCircle } from "lucide-react";

export default function CreateReconciliationModal() {
    const {
        isCreateModalOpen,
        closeCreateModal,
        createModalMode,
        openImportModal,
        addToast,
        triggerRefresh
    } = useApp();

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        reconciliationName: "",
        reconciliationDate: new Date().toISOString().split("T")[0],
        description: "",
        referenceBatch: "",
        notes: ""
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isCreateModalOpen) {
            // Suggest default batch name based on current date
            const dateStr = new Date().toISOString().split("T")[0];
            const batchNum = Math.floor(100 + Math.random() * 900);
            setFormData({
                reconciliationName: "",
                reconciliationDate: dateStr,
                description: "",
                referenceBatch: `BATCH-${dateStr.replace(/-/g, "").slice(2)}-${batchNum}`,
                notes: ""
            });
            setErrors({});
            setSubmitting(false);
        }
    }, [isCreateModalOpen]);

    if (!isCreateModalOpen) return null;

    const validate = () => {
        const newErrors = {};
        if (!formData.reconciliationName.trim()) {
            newErrors.reconciliationName = "Reconciliation Name is required";
        }
        if (!formData.reconciliationDate) {
            newErrors.reconciliationDate = "Reconciliation Date is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSubmitting(true);
            const created = await createReconciliation(formData);
            triggerRefresh();

            addToast({
                type: "success",
                title: "Reconciliation Initialized",
                message: `Successfully created "${created.reconciliationName}"`
            });

            closeCreateModal();

            if (createModalMode === "import") {
                // Next step in import flow: Excel upload & preview modal
                openImportModal(created);
            } else {
                // Direct create flow: navigate to workspace transactions tab
                navigate(`/reconciliations/${created.id}?tab=transactions`);
            }
        } catch (err) {
            addToast({
                type: "error",
                title: "Creation Failed",
                message: err.message || "Failed to create reconciliation."
            });
        } finally {
            setSubmitting(false);
        }
    };

    const applySampleName = (name, desc) => {
        setFormData((prev) => ({
            ...prev,
            reconciliationName: name,
            description: desc
        }));
        setErrors((prev) => ({ ...prev, reconciliationName: null }));
    };

    return (
        <div className="modal-backdrop" onClick={closeCreateModal}>
            <div
                className="modal-container create-reconciliation-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="modal-header">
                    <div>
                        <div className="modal-badge">
                            {createModalMode === "import" ? "Step 1 of 2 • Import Setup" : "New Reconciliation"}
                        </div>
                        <h2 id="modal-title" className="modal-title">
                            Create Reconciliation
                        </h2>
                        <p className="modal-subtitle">
                            Configure parameters for inter-branch M In &amp; M Out settlement reconciliation.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={closeCreateModal}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body">
                        {/* Quick suggestion chips */}
                        <div className="preset-chips-section">
                            <span className="preset-label">
                                <Sparkles size={14} className="text-blue-500" />
                                Quick Presets:
                            </span>
                            <div className="preset-chips">
                                <button
                                    type="button"
                                    className="preset-chip"
                                    onClick={() =>
                                        applySampleName(
                                            "October High-Value Clearing",
                                            "Monthly inter-branch transaction reconciliation for Tamil Nadu hubs."
                                        )
                                    }
                                >
                                    October High-Value Clearing
                                </button>
                                <button
                                    type="button"
                                    className="preset-chip"
                                    onClick={() =>
                                        applySampleName(
                                            "South Zone Liquidity Settlement",
                                            "Intraday fund transfer settlement between Chennai and regional branches."
                                        )
                                    }
                                >
                                    South Zone Liquidity
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="rec-name">
                                Reconciliation Name <span className="text-red-500">*</span>
                            </label>
                            <div className="input-with-icon">
                                <FileText size={17} className="input-icon" />
                                <input
                                    id="rec-name"
                                    type="text"
                                    className={`form-input ${errors.reconciliationName ? "input-error" : ""}`}
                                    placeholder="e.g. October Branch Reconciliation"
                                    value={formData.reconciliationName}
                                    onChange={(e) => handleChange("reconciliationName", e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {errors.reconciliationName && (
                                <div className="form-error-msg">
                                    <AlertCircle size={13} />
                                    {errors.reconciliationName}
                                </div>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="rec-date">
                                    Reconciliation Date <span className="text-red-500">*</span>
                                </label>
                                <div className="input-with-icon">
                                    <Calendar size={17} className="input-icon" />
                                    <input
                                        id="rec-date"
                                        type="date"
                                        className={`form-input ${errors.reconciliationDate ? "input-error" : ""}`}
                                        value={formData.reconciliationDate}
                                        onChange={(e) => handleChange("reconciliationDate", e.target.value)}
                                    />
                                </div>
                                {errors.reconciliationDate && (
                                    <div className="form-error-msg">
                                        <AlertCircle size={13} />
                                        {errors.reconciliationDate}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="rec-batch">
                                    Reference / Batch Name
                                </label>
                                <div className="input-with-icon">
                                    <Tag size={17} className="input-icon" />
                                    <input
                                        id="rec-batch"
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. BATCH-TN-202610-A"
                                        value={formData.referenceBatch}
                                        onChange={(e) => handleChange("referenceBatch", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="rec-desc">
                                Description
                            </label>
                            <div className="input-with-icon">
                                <AlignLeft size={17} className="input-icon textarea-icon" />
                                <textarea
                                    id="rec-desc"
                                    rows={2}
                                    className="form-textarea"
                                    placeholder="Enter operational context or branch clearing scope..."
                                    value={formData.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="rec-notes">
                                Optional Notes
                            </label>
                            <input
                                id="rec-notes"
                                type="text"
                                className="form-input"
                                placeholder="Additional ledger audit notes or special instructions..."
                                value={formData.notes}
                                onChange={(e) => handleChange("notes", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={closeCreateModal}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary-button"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Creating..."
                                : createModalMode === "import"
                                ? "Continue to Excel Import →"
                                : "Continue to Workspace →"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
