import { useApp } from "../../context/AppContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
    const { theme, toggleTheme } = useApp();

    return (
        <button
            type="button"
            className={`theme-toggle-btn ${className}`}
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle visual theme"
        >
            {theme === "dark" ? (
                <Sun size={17} className="text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
                <Moon size={17} className="text-slate-600 hover:-rotate-12 transition-transform" />
            )}
        </button>
    );
}
