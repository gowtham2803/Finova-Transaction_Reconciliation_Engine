import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import { AppProvider } from "./context/AppContext";
import AppLayout from "./components/layout/AppLayout";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Reconciliations from "./pages/Reconciliations";
import ReconciliationDetails from "./pages/ReconciliationDetails";
import Errors from "./pages/Errors";
import AuditLogs from "./pages/AuditLogs";

function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    {/* The Landing Page is the initial route / */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Main Application Shell */}
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/reconciliations" element={<Reconciliations />} />
                        <Route
                            path="/reconciliations/:reconciliationId"
                            element={<ReconciliationDetails />}
                        />
                        <Route
                            path="/transactions"
                            element={<Navigate to="/reconciliations" replace />}
                        />
                        <Route path="/errors" element={<Errors />} />
                        <Route path="/audit-logs" element={<AuditLogs />} />
                        <Route
                            path="/audit-history"
                            element={<Navigate to="/audit-logs" replace />}
                        />
                    </Route>

                    {/* Catch-all redirect to Landing Page */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AppProvider>
    );
}

export default App;