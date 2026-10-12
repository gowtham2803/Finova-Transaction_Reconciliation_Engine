import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import ToastContainer from "../common/ToastContainer";
import ThemeToggle from "../common/ThemeToggle";
import BrandLogo from "../common/BrandLogo";
import CreateReconciliationModal from "../modals/CreateReconciliationModal";
import ImportExcelModal from "../modals/ImportExcelModal";
import LoginModal from "../modals/LoginModal";
import {
    LayoutDashboard,
    ArrowLeftRight,
    AlertOctagon,
    History,
    Plus,
    Bell,
    Database,
    LogIn,
    LogOut,
    ChevronRight
} from "lucide-react";

export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        currentUser,
        isAuthenticated,
        openCreateModal,
        openLoginModal,
        logout
    } = useApp();

    const navigationItems = [
        {
            label: "Dashboard",
            path: "/dashboard",
            icon: LayoutDashboard
        },
        {
            label: "Reconciliations",
            path: "/reconciliations",
            icon: ArrowLeftRight
        },
        {
            label: "Errors",
            path: "/errors",
            icon: AlertOctagon
        },
        {
            label: "Audit History",
            path: "/audit-logs",
            icon: History
        }
    ];

    const getBreadcrumbTitle = () => {
        const path = location.pathname;
        if (path === "/dashboard") return "Operations Dashboard";
        if (path === "/reconciliations") return "Reconciliation Registry";
        if (path.startsWith("/reconciliations/")) return "Reconciliation Workspace";
        if (path === "/errors") return "Error Management & Exceptions";
        if (path === "/audit-logs") return "Audit History & Compliance";
        return "Transaction Reconciliation System";
    };

    return (
        <div className="app-layout-shell">
            {/* Top Navigation Header */}
            <header className="app-header-shell">
                <div className="app-header-left">
                    <div
                        className="app-brand cursor-pointer"
                        onClick={() => navigate("/")}
                        title="YesCapital Home"
                    >
                        <BrandLogo height={36} />
                    </div>

                    <div className="header-breadcrumbs">
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-active">{getBreadcrumbTitle()}</span>
                    </div>
                </div>

                <div className="app-header-right">
                    {/* Primary Fast Action */}
                    <button
                        type="button"
                        className="header-create-btn"
                        onClick={() => openCreateModal("new")}
                    >
                        <Plus size={15} />
                        <span>Create Reconciliation</span>
                    </button>

                    {/* Theme Toggle (Dark / Light) */}
                    <ThemeToggle />

                    {/* Notification Bell */}
                    <div className="header-action-icon" title="Notifications">
                        <Bell size={18} />
                        <span className="notification-badge-dot"></span>
                    </div>

                    {/* User profile dropdown / login trigger */}
                    {isAuthenticated && currentUser ? (
                        <div className="user-profile-badge">
                            <div className="user-avatar-circle">
                                {currentUser.initials || "YC"}
                            </div>
                            <div className="user-text-meta">
                                <span className="user-display-name">{currentUser.username || currentUser.name}</span>
                            </div>
                            <button
                                type="button"
                                className="logout-icon-btn"
                                onClick={logout}
                                title="Sign Out"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="secondary-button login-trigger-btn"
                            onClick={openLoginModal}
                        >
                            <LogIn size={15} />
                            <span>Sign In</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Application Main Layout with Sidebar */}
            <div className="app-body-shell">
                {/* Left Enterprise Navigation Sidebar */}
                <aside className="app-sidebar-shell">
                    <div className="sidebar-nav-header">
                        MAIN NAVIGATION
                    </div>

                    <nav className="sidebar-nav-menu">
                        {navigationItems.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `sidebar-nav-link ${
                                            isActive ? "sidebar-nav-link-active" : ""
                                        }`
                                    }
                                >
                                    <IconComponent size={18} className="sidebar-nav-icon" />
                                    <span className="sidebar-nav-label">{item.label}</span>
                                    <ChevronRight size={13} className="sidebar-chevron" />
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* Bottom Status Card */}
                    <div className="sidebar-system-footer">
                        <div className="system-status-indicator">
                            <div className="status-pulse-dot"></div>
                            <div>
                                <div className="system-status-mode">Enterprise Engine</div>
                                <div className="system-status-sub">Spring Boot &amp; MySQL</div>
                            </div>
                        </div>

                        <div className="system-engine-details">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Database size={12} className="text-emerald-500" />
                                <span>Port 8088 Connected</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                YesCapital v2.4 Enterprise
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Dynamic View Outlet */}
                <main className="app-main-content">
                    <Outlet />
                </main>
            </div>

            {/* Global Modals & Feedback Stack */}
            <CreateReconciliationModal />
            <ImportExcelModal />
            <LoginModal />
            <ToastContainer />
        </div>
    );
}