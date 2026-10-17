import React from "react";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        } else {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 max-w-4xl mx-auto my-8">
                    <div className="content-card border border-rose-500/30 bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                                <AlertTriangle size={28} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-slate-100 mb-1">
                                    Unable to load workspace view
                                </h2>
                                <p className="text-sm text-slate-400 mb-4">
                                    An unexpected rendering issue occurred while processing this view. You can reload the workspace or return to the reconciliation registry.
                                </p>
                                {this.state.error?.message && (
                                    <div className="font-mono text-xs bg-slate-950/70 border border-slate-800 text-rose-300 p-3 rounded-lg mb-6 overflow-x-auto">
                                        {this.state.error.message}
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        className="primary-button flex items-center gap-2"
                                        onClick={this.handleReset}
                                    >
                                        <RotateCw size={15} />
                                        <span>Reload Workspace</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="secondary-button flex items-center gap-2"
                                        onClick={() => {
                                            window.location.href = "/reconciliations";
                                        }}
                                    >
                                        <ArrowLeft size={15} />
                                        <span>Return to Reconciliations</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
