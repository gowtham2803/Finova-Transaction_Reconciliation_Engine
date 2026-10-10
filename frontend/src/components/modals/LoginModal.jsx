import { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
    X,
    Lock,
    User,
    UserCheck,
    UserPlus,
    AlertCircle,
    Loader2
} from "lucide-react";

export default function LoginModal() {
    const { isLoginModalOpen, closeLoginModal, login, register } = useApp();

    const [mode, setMode] = useState("signin"); // "signin" | "signup"

    // Sign in form
    const [signInIdentifier, setSignInIdentifier] = useState("operations@yescapital.com");
    const [signInPassword, setSignInPassword] = useState("Password@123");

    // Sign up form: strictly two fields only (Username and Password)
    const [signUpUsername, setSignUpUsername] = useState("");
    const [signUpPassword, setSignUpPassword] = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isLoginModalOpen) return null;

    const handleSignInSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(signInIdentifier, signInPassword);
        } catch (err) {
            setError(err.message || "Invalid credentials. Please check your username/email and password.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignUpSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const username = signUpUsername.trim();
        if (!username || username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }
        if (!signUpPassword || signUpPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            await register({
                username,
                password: signUpPassword
            });
        } catch (err) {
            setError(err.message || "Failed to register account. Please try again.");
        } finally {
            setLoading(false);
        }
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
                        <h2 className="modal-title">
                            {mode === "signin" ? "Sign in to YesCapital" : "Sign Up"}
                        </h2>
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

                {/* Mode Switcher Tabs */}
                <div style={{ padding: "0 24px 0 24px", paddingTop: "14px" }}>
                    <div style={{
                        display: "flex",
                        gap: "6px",
                        background: "var(--bg-surface-elevated)",
                        padding: "4px",
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--border-subtle)"
                    }}>
                        <button
                            type="button"
                            style={{
                                flex: 1,
                                padding: "8px 14px",
                                fontSize: "13px",
                                fontWeight: 600,
                                borderRadius: "var(--radius-md)",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                background: mode === "signin" ? "#2563eb" : "transparent",
                                color: mode === "signin" ? "#ffffff" : "var(--text-secondary)"
                            }}
                            onClick={() => {
                                setMode("signin");
                                setError(null);
                            }}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            style={{
                                flex: 1,
                                padding: "8px 14px",
                                fontSize: "13px",
                                fontWeight: 600,
                                borderRadius: "var(--radius-md)",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                background: mode === "signup" ? "#2563eb" : "transparent",
                                color: mode === "signup" ? "#ffffff" : "var(--text-secondary)"
                            }}
                            onClick={() => {
                                setMode("signup");
                                setError(null);
                            }}
                        >
                            Sign Up
                        </button>
                    </div>
                </div>

                {mode === "signin" ? (
                    /* SIGN IN FORM */
                    <form onSubmit={handleSignInSubmit} className="modal-form">
                        <div className="modal-body">
                            {error && (
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 14px",
                                    borderRadius: "var(--radius-md)",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    color: "#f87171",
                                    fontSize: "13px",
                                    marginBottom: "16px"
                                }}>
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" htmlFor="login-email">
                                    Username or Email
                                </label>
                                <div className="input-with-icon">
                                    <User size={17} className="input-icon" />
                                    <input
                                        id="login-email"
                                        type="text"
                                        className="form-input"
                                        value={signInIdentifier}
                                        onChange={(e) => setSignInIdentifier(e.target.value)}
                                        placeholder="Enter username or email"
                                        autoComplete="username"
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
                                        value={signInPassword}
                                        onChange={(e) => setSignInPassword(e.target.value)}
                                        placeholder="Enter password"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                Don&apos;t have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("signup");
                                        setError(null);
                                    }}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#38bdf8",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        textDecoration: "underline"
                                    }}
                                >
                                    Sign up now
                                </button>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={closeLoginModal}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="primary-button flex items-center gap-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Signing In...
                                    </>
                                ) : (
                                    <>
                                        <UserCheck size={16} />
                                        Sign In
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* SIGN UP FORM: ONLY USERNAME AND PASSWORD */
                    <form onSubmit={handleSignUpSubmit} className="modal-form">
                        <div className="modal-body">
                            {error && (
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 14px",
                                    borderRadius: "var(--radius-md)",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    color: "#f87171",
                                    fontSize: "13px",
                                    marginBottom: "16px"
                                }}>
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" htmlFor="register-username">
                                    Username
                                </label>
                                <div className="input-with-icon">
                                    <User size={17} className="input-icon" />
                                    <input
                                        id="register-username"
                                        type="text"
                                        className="form-input"
                                        value={signUpUsername}
                                        onChange={(e) => setSignUpUsername(e.target.value)}
                                        placeholder="Enter your username"
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="register-password">
                                    Password
                                </label>
                                <div className="input-with-icon">
                                    <Lock size={17} className="input-icon" />
                                    <input
                                        id="register-password"
                                        type="password"
                                        className="form-input"
                                        value={signUpPassword}
                                        onChange={(e) => setSignUpPassword(e.target.value)}
                                        placeholder="Enter your password (min 6 characters)"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                Already registered?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("signin");
                                        setError(null);
                                    }}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#38bdf8",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        textDecoration: "underline"
                                    }}
                                >
                                    Sign in to your account
                                </button>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={closeLoginModal}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="primary-button flex items-center gap-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        Register
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
