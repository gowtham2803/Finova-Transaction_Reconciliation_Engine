import { useApp } from "../../context/AppContext";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export default function ToastContainer() {
    const { toasts, removeToast } = useApp();

    if (!toasts || toasts.length === 0) return null;

    const getIcon = (type) => {
        switch (type) {
            case "success":
                return <CheckCircle2 className="toast-icon text-emerald-500" size={20} />;
            case "warning":
                return <AlertTriangle className="toast-icon text-amber-500" size={20} />;
            case "error":
                return <AlertCircle className="toast-icon text-rose-500" size={20} />;
            default:
                return <Info className="toast-icon text-blue-500" size={20} />;
        }
    };

    return (
        <div className="toast-container" role="region" aria-live="polite">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast-card toast-${toast.type}`}>
                    <div className="toast-icon-wrapper">
                        {getIcon(toast.type)}
                    </div>
                    <div className="toast-content">
                        {toast.title && <div className="toast-title">{toast.title}</div>}
                        <div className="toast-message">{toast.message}</div>
                    </div>
                    <button
                        type="button"
                        className="toast-close-btn"
                        onClick={() => removeToast(toast.id)}
                        aria-label="Close notification"
                    >
                        <X size={15} />
                    </button>
                </div>
            ))}
        </div>
    );
}
