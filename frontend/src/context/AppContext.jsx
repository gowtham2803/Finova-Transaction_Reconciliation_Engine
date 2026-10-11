import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiLogin, apiRegister, apiGetCurrentUser } from "../services/api";

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
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const stored = localStorage.getItem("yescapital_auth_user");
            if (stored) return JSON.parse(stored);
        } catch {
            // Ignore parse error
        }
        return null;
    });

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        try {
            return Boolean(localStorage.getItem("yescapital_auth_token"));
        } catch {
            return false;
        }
    });

    // Verify and synchronize active user session with backend on mount
    useEffect(() => {
        let token = null;
        try {
            token = localStorage.getItem("yescapital_auth_token");
        } catch {
            // Ignore storage errors
        }

        if (token) {
            apiGetCurrentUser()
                .then((userData) => {
                    if (userData) {
                        const formatted = {
                            ...userData,
                            name: userData.fullName || userData.username
                        };
                        setCurrentUser(formatted);
                        setIsAuthenticated(true);
                        try {
                            localStorage.setItem("yescapital_auth_user", JSON.stringify(formatted));
                        } catch {
                            // Ignore
                        }
                    }
                })
                .catch(() => {
                    // Token invalid or expired
                    try {
                        localStorage.removeItem("yescapital_auth_token");
                        localStorage.removeItem("yescapital_auth_user");
                    } catch {
                        // Ignore
                    }
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                });
        }
    }, []);

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

    const login = useCallback(async (identifier, password) => {
        const res = await apiLogin({ identifier, password });
        if (res && res.token && res.user) {
            const formatted = {
                ...res.user,
                name: res.user.fullName || res.user.username
            };
            try {
                localStorage.setItem("yescapital_auth_token", res.token);
                localStorage.setItem("yescapital_auth_user", JSON.stringify(formatted));
            } catch {
                // Ignore storage error
            }
            setCurrentUser(formatted);
            setIsAuthenticated(true);
            addToast({
                type: "success",
                title: "Authentication Successful",
                message: `Signed in as ${formatted.username || formatted.name}`
            });
            closeLoginModal();
            return formatted;
        }
    }, [addToast, closeLoginModal]);

    const register = useCallback(async (userData) => {
        const res = await apiRegister(userData);
        if (res && res.token && res.user) {
            const formatted = {
                ...res.user,
                name: res.user.fullName || res.user.username
            };
            try {
                localStorage.setItem("yescapital_auth_token", res.token);
                localStorage.setItem("yescapital_auth_user", JSON.stringify(formatted));
            } catch {
                // Ignore storage error
            }
            setCurrentUser(formatted);
            setIsAuthenticated(true);
            addToast({
                type: "success",
                title: "Registration Successful",
                message: `Account created for ${formatted.username || formatted.name}`
            });
            closeLoginModal();
            return formatted;
        }
    }, [addToast, closeLoginModal]);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem("yescapital_auth_token");
            localStorage.removeItem("yescapital_auth_user");
        } catch {
            // Ignore
        }
        setIsAuthenticated(false);
        setCurrentUser(null);
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
        register,
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
