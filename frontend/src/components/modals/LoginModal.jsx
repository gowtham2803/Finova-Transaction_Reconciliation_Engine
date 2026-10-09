import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { X, Lock, Mail, ShieldCheck, UserCheck } from "lucide-react";

export default function LoginModal() {
    const { isLoginModalOpen, closeLoginModal, login } = useApp();
    const [email, setEmail] = useState("operations@yescapital.com");
    const [password, setPassword] = useState("••••••••");

    if (!isLoginModalOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        login(email, password);
    };

    return (
        <div className="modal-backdrop" onClick={closeLoginModal}>
            <div
                className="modal-container login-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-header">
                    <div>
                        <div className="modal-badge">
                            Enterprise Access
                        </div>
                        <h2 className="modal-title">Sign in to YesCapital</h2>
                        <p className="modal-subtitle">
                            Transaction Reconciliation Management System
                        </p>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={closeLoginModal}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body">
                        <div className="demo-notice-box">
                            <ShieldCheck size={18} className="text-emerald-500 flex-shrink-0" />
                            <div>
                                <strong>Prototype Demo Mode</strong>
                                <div className="text-xs text-slate-500">
                                    Pre-filled with standard financial operations credentials. No backend database required.
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="login-email">
                                Corporate Email
                            </label>
                            <div className="input-with-icon">
                                <Mail size={17} className="input-icon" />
                                <input
                                    id="login-email"
                                    type="email"
                                    className="form-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="login-password">
                                Password
                            </label>
                            <div className="input-with-icon">
                                <Lock size={17} className="input-icon" />
                                <input
                                    id="login-password"
                                    type="password"
                                    className="form-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={closeLoginModal}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary-button flex items-center gap-2"
                        >
                            <UserCheck size={16} />
                            Sign In to Portal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
