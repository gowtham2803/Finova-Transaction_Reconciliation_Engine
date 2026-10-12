import { useState } from "react";
import { X, Plus, Minus, Layers, Info } from "lucide-react";

export default function AddRowsModal({ isOpen, onClose, onAddRows, sheetTitle = "Transactions" }) {
    const [rowCount, setRowCount] = useState(10);

    if (!isOpen) return null;

    const presets = [1, 5, 10, 20, 50, 100];

    const handleIncrement = () => {
        setRowCount((prev) => Math.min(100, (Number(prev) || 0) + 1));
    };

    const handleDecrement = () => {
        setRowCount((prev) => Math.max(1, (Number(prev) || 0) - 1));
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (val === "") {
            setRowCount("");
            return;
        }
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
            setRowCount(Math.min(100, Math.max(1, parsed)));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const num = Math.min(Math.max(1, parseInt(rowCount, 10) || 1), 100);
        onAddRows(num);
        onClose();
    };

    const parsedCount = Math.min(Math.max(1, parseInt(rowCount, 10) || 1), 100);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container add-rows-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <Layers size={22} />
                        </div>
                        <div>
                            <h3 className="modal-title text-base font-bold text-slate-100">
                                Add Multiple Rows to {sheetTitle}
                            </h3>
                            <p className="modal-subtitle">
                                Append empty editable transaction rows to the spreadsheet
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

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body space-y-5">
                        {/* Quick Presets */}
                        <div className="presets-section">
                            <div className="presets-grid">
                                {presets.map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        className={`preset-pill-btn ${
                                            Number(rowCount) === val ? "preset-pill-btn-active" : ""
                                        }`}
                                        onClick={() => setRowCount(val)}
                                    >
                                        +{val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modern Stepper & Input Control */}
                        <div className="form-group mb-0">
                            <label className="form-label text-xs uppercase tracking-wider text-slate-400 font-semibold" htmlFor="custom-row-count">
                                Number of Rows (1 – 100)
                            </label>
                            <div className="add-rows-stepper-wrap">
                                <button
                                    type="button"
                                    className="stepper-btn"
                                    onClick={handleDecrement}
                                    disabled={Number(rowCount) <= 1}
                                    aria-label="Decrease rows"
                                    title="Decrease rows"
                                >
                                    <Minus size={18} />
                                </button>
                                <input
                                    id="custom-row-count"
                                    type="number"
                                    min="1"
                                    max="100"
                                    className="stepper-input font-mono"
                                    value={rowCount}
                                    onChange={handleInputChange}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="stepper-btn"
                                    onClick={handleIncrement}
                                    disabled={Number(rowCount) >= 100}
                                    aria-label="Increase rows"
                                    title="Increase rows"
                                >
                                    <Plus size={18} />
                                </button>
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
                            type="submit"
                            className="primary-button flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Add {parsedCount} {parsedCount === 1 ? "Row" : "Rows"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
