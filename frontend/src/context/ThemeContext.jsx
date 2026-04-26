import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    document.documentElement.setAttribute("data-theme", resolved);
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(
        () => localStorage.getItem("theme") || "system"
    );

    const setTheme = (t) => {
        setThemeState(t);
        localStorage.setItem("theme", t);
        applyTheme(t);
    };

    useEffect(() => {
        applyTheme(theme);

        if (theme === "system") {
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = () => applyTheme("system");
            mq.addEventListener("change", handler);
            return () => mq.removeEventListener("change", handler);
        }
    }, [theme]);

    const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
