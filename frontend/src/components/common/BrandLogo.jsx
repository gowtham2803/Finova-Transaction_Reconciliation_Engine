import { useApp } from "../../context/AppContext";
import logoDark from "../../assets/logo-dark.png";
import logoLight from "../../assets/logo-light.png";

/**
 * BrandLogo Component
 * Dynamically switches between Light Mode and Dark Mode logo images.
 * - Dark Mode: logoDark (white text with blue & green icon)
 * - Light Mode: logoLight (dark navy text with blue & green icon)
 */
export default function BrandLogo({ className = "", height = 36, onClick, title = "YesCapital Home" }) {
    const { theme } = useApp();
    const isLight = theme === "light";
    const logoSrc = isLight ? logoLight : logoDark;

    return (
        <div
            className={`app-brand-container ${onClick ? "cursor-pointer" : ""} ${className}`}
            onClick={onClick}
            title={title}
        >
            <img
                src={logoSrc}
                alt="YesCapital - Transaction Reconciliation System"
                className="app-brand-logo-img"
                style={{
                    height: `${height}px`,
                    width: "auto",
                    display: "block",
                    objectFit: "contain"
                }}
                loading="eager"
            />
        </div>
    );
}
