import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ToastContainer from "../components/common/ToastContainer";
import ThemeToggle from "../components/common/ThemeToggle";
import CreateReconciliationModal from "../components/modals/CreateReconciliationModal";
import ImportExcelModal from "../components/modals/ImportExcelModal";
import LoginModal from "../components/modals/LoginModal";
import {
    FileSpreadsheet,
    PlusCircle,
    ArrowRight,
    LogIn,
    Sparkles,
    LayoutDashboard,
    Database
} from "lucide-react";

export default function LandingPage() {
    const navigate = useNavigate();
    const { openCreateModal, openLoginModal, isAuthenticated, currentUser } = useApp();

    const handleImportExcelClick = () => {
        // Required Flow: ALWAYS open Create Reconciliation Modal first!
        openCreateModal("import");
    };

    const handleCreateNewClick = () => {
        // Required Flow: ALWAYS open Create Reconciliation Modal first!
        openCreateModal("new");
    };

    return (
        <div className="landing-page-root">
            {/* Ambient Background Glowing Orbs (CloudPeak Aesthetic) */}
            <div className="landing-glow-orb-top"></div>
            <div className="landing-glow-orb-bottom"></div>

            {/* Top Navigation Bar */}
            <header className="landing-header">
                <div className="landing-header-inner">
                    <div className="flex items-center gap-3">
                        <div className="brand-logo-mark">
                            <span>YC</span>
                        </div>
                        <div>
                            <span className="brand-name">YesCapital</span>
                            <span className="landing-brand-tag">Finance</span>
                        </div>
                    </div>

                    <div className="landing-header-actions">
                        {/* Theme Toggle (Dark / Light) */}
                        <ThemeToggle />

                        <button
                            type="button"
                            className="landing-dashboard-link"
                            onClick={() => navigate("/dashboard")}
                        >
                            <LayoutDashboard size={16} />
                            <span>Go to Dashboard</span>
                        </button>

                        {isAuthenticated && currentUser ? (
                            <div className="landing-auth-pill">
                                <span className="auth-pill-dot"></span>
                                <span>{currentUser.name || currentUser.fullName || currentUser.username}</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="landing-login-btn"
                                onClick={openLoginModal}
                            >
                                <LogIn size={15} />
                                <span>Login</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="landing-main">
                <div className="landing-hero-container">
                    {/* Announcement Pill */}
                    <div className="landing-pill-badge">
                        <Sparkles size={14} className="pill-sparkle" />
                        <span>Transaction Reconciliation System</span>
                    </div>

                    {/* Grand Hero Title */}
                    <h3 className="landing-hero-title">
                        Reconcile financial transactions <br />
                        <span className="gradient-text">faster, smarter, and with confidence.</span>
                    </h3>

                    {/* TWO PRIMARY VISUALLY PROMINENT ACTIONS (Required by prompt) */}
                    <div className="landing-primary-actions-grid">
                        <button
                            type="button"
                            className="landing-action-card"
                            onClick={handleImportExcelClick}
                        >
                            <div className="action-card-icon-wrap import-icon">
                                <FileSpreadsheet size={30} />
                            </div>
                            <div className="action-card-text">
                                <div className="action-card-title">
                                    Import Excel File
                                </div>
                                <div className="action-card-desc">
                                    Upload existing workbook or test with pre-built file
                                </div>
                            </div>
                            <div className="action-card-arrow">
                                <ArrowRight size={22} />
                            </div>
                        </button>

                        <button
                            type="button"
                            className="landing-action-card"
                            onClick={handleCreateNewClick}
                        >
                            <div className="action-card-icon-wrap create-icon">
                                <PlusCircle size={30} />
                            </div>
                            <div className="action-card-text">
                                <div className="action-card-title">
                                    Create New
                                </div>
                                <div className="action-card-desc">
                                    Initialize reconciliation or paste transactions
                                </div>
                            </div>
                            <div className="action-card-arrow">
                                <ArrowRight size={22} />
                            </div>
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer (Image 1 style) */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="text-xs text-slate-400">
                        © 2026 <strong>YesCapital Financial Technologies</strong>.
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Database size={13} className="text-emerald-400" />
                        <span>Transaction Reconciliation Management System.</span>
                    </div>
                </div>
            </footer>

            {/* Modals & Toasts mounted for landing page interaction */}
            <CreateReconciliationModal />
            <ImportExcelModal />
            <LoginModal />
            <ToastContainer />
        </div>
    );
}
