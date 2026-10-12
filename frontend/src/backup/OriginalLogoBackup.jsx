/**
 * BACKUP FILE: Original Logo Implementation
 * Created: 2026-10-13
 * 
 * This file preserves the exact original logo code, layout, and styling
 * for rollback purposes if requested by the user.
 */

import React from "react";

/**
 * Original Logo for AppLayout (Dashboard, Reconciliations, Details, Errors, Audit Logs)
 */
export function OriginalAppLayoutLogo({ navigate }) {
    return (
        <div
            className="app-brand cursor-pointer"
            onClick={() => (navigate ? navigate("/") : null)}
            title="YesCapital Home"
        >
            <div className="brand-logo-mark">
                <span>YC</span>
            </div>
            <div className="brand-text-block">
                <div className="brand-name">
                    YesCapital
                </div>
                <div className="brand-product">
                    Transaction Reconciliation System
                </div>
            </div>
        </div>
    );
}

/**
 * Original Logo for LandingPage
 */
export function OriginalLandingPageLogo() {
    return (
        <div className="flex items-center gap-3">
            <div className="brand-logo-mark">
                <span>YC</span>
            </div>
            <div>
                <span className="brand-name">YesCapital</span>
                <span className="landing-brand-tag">Finance</span>
            </div>
        </div>
    );
}

/**
 * ORIGINAL CSS STYLING (from frontend/src/index.css):
 * 
 * .brand-logo-mark {
 *     width: 38px;
 *     height: 38px;
 *     background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
 *     color: #ffffff;
 *     font-weight: 800;
 *     font-size: 14px;
 *     border-radius: var(--radius-md);
 *     display: flex;
 *     align-items: center;
 *     justify-content: center;
 *     box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
 * }
 * 
 * .brand-name {
 *     font-size: 20px;
 *     font-weight: 800;
 *     letter-spacing: -0.02em;
 *     color: var(--text-primary);
 * }
 * 
 * .landing-brand-tag {
 *     margin-left: 8px;
 *     font-size: 10px;
 *     font-weight: 700;
 *     background: rgba(37, 99, 235, 0.12);
 *     color: #60a5fa;
 *     border: 1px solid rgba(37, 99, 235, 0.25);
 *     padding: 2px 7px;
 *     border-radius: 9999px;
 *     letter-spacing: 0.05em;
 * }
 * 
 * .app-brand {
 *     display: flex;
 *     align-items: center;
 *     gap: 12px;
 * }
 * 
 * .brand-text-block {
 *     display: flex;
 *     flex-direction: column;
 * }
 * 
 * .brand-product {
 *     font-size: 11px;
 *     color: var(--text-muted);
 *     font-weight: 500;
 * }
 */
