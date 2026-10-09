import { createContext, useContext, useState, useCallback, useEffect } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
    // Theme state ('dark' | 'light', defaults to 'dark' for modern trendy look)
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("yescapital_theme") || "dark";
        } catch {
            return "dark";
        }
    });

    useEffect(() => {
        try {
            document.documentElement.setAttribute("data-theme", theme);
            localStorage.setItem("yescapital_theme", theme);
        } catch {
            // Ignore storage errors
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    // Toast notifications stack
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(({ type = "info", title = "", message = "", duration = 4000 }) => {
        const id = Date.now() + Math.random().toString(36).substring(2, 9);
        const newToast = { id, type, title, message };
        setToasts((prev) => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalMode, setCreateModalMode] = useState("new"); // "new" | "import"

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importReconciliationData, setImportReconciliationData] = useState(null);

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Current User Session
    const [currentUser, setCurrentUser] = useState({
        id: "finance_ops_lead",
        name: "Karthik Subramanian",
        role: "Financial Operations Lead",
        email: "karthik.s@yescapital.com",
        initials: "KS",
        department: "South Zone Treasury"
    });
    const [isAuthenticated, setIsAuthenticated] = useState(true);

    const openCreateModal = useCallback((mode = "new") => {
        setCreateModalMode(mode);
        setIsCreateModalOpen(true);
    }, []);

    const closeCreateModal = useCallback(() => {
        setIsCreateModalOpen(false);
    }, []);

    const openImportModal = useCallback((reconciliationData) => {
        setImportReconciliationData(reconciliationData);
        setIsImportModalOpen(true);
    }, []);

    const closeImportModal = useCallback(() => {
        setIsImportModalOpen(false);
        setImportReconciliationData(null);
    }, []);

    const openLoginModal = useCallback(() => {
        setIsLoginModalOpen(true);
    }, []);

    const closeLoginModal = useCallback(() => {
        setIsLoginModalOpen(false);
    }, []);

    const login = useCallback((email) => {
        setIsAuthenticated(true);
        setCurrentUser({
            id: "finance_ops_lead",
            name: email.split("@")[0].replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Finance Lead",
            role: "Financial Operations Lead",
            email: email || "operations@yescapital.com",
            initials: "FL",
            department: "South Zone Treasury"
        });
        addToast({
            type: "success",
            title: "Authentication Successful",
            message: "Signed in to YesCapital Enterprise Portal"
        });
        closeLoginModal();
    }, [addToast, closeLoginModal]);

    const logout = useCallback(() => {
        setIsAuthenticated(false);
        addToast({
            type: "info",
            title: "Signed Out",
            message: "You have securely signed out."
        });
    }, [addToast]);

    // Global refresh counter
    const [refreshSignal, setRefreshSignal] = useState(0);
    const triggerRefresh = useCallback(() => {
        setRefreshSignal((prev) => prev + 1);
    }, []);

    const value = {
        theme,
        toggleTheme,
        toasts,
        addToast,
        removeToast,
        isCreateModalOpen,
        createModalMode,
        openCreateModal,
        closeCreateModal,
        isImportModalOpen,
        importReconciliationData,
        openImportModal,
        closeImportModal,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        currentUser,
        isAuthenticated,
        login,
        logout,
        refreshSignal,
        triggerRefresh
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useApp must be used within an AppProvider");
    }
    return context;
}
