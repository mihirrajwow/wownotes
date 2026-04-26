import { useEffect } from "react";

/**
 * Anti-devtools security hook.
 * Applies multiple layers of deterrence:
 *   1. Detects DevTools open via window size heuristic
 *   2. Overrides right-click context menu
 *   3. Blocks common keyboard shortcuts (F12, Ctrl+Shift+I/J/C/U)
 *   4. Detects debugger via timing attack
 */
export function useSecurity(enabled = true, onViolation = null) {
    useEffect(() => {
        if (!enabled) return;
        // if (typeof __DEV_STAGING__ !== "undefined") return;

        // ── 1. Keyboard shortcut blocking ────────────────────────────────────────
        const blockKeys = (e) => {
            // F12
            if (e.key === "F12") {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I / J / C  (DevTools panels)
            if (
                e.ctrlKey &&
                e.shiftKey &&
                ["i", "I", "j", "J", "c", "C"].includes(e.key)
            ) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (view source)
            if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
                e.preventDefault();
                return false;
            }
            // Ctrl+S (save page)
            if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
                e.preventDefault();
                return false;
            }
        };
        document.addEventListener("keydown", blockKeys);

        // ── 2. Context menu (right-click) ────────────────────────────────────────
        const blockMenu = (e) => e.preventDefault();
        document.addEventListener("contextmenu", blockMenu);

        // ── 3. DevTools open detection (size heuristic) ──────────────────────────
        let devtoolsOpen = false;
        const THRESHOLD = 160;

        const checkDevTools = () => {
            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;
            const opened = widthDiff > THRESHOLD || heightDiff > THRESHOLD;

            if (opened && !devtoolsOpen) {
                devtoolsOpen = true;
                handleDetection();
            } else if (!opened) {
                devtoolsOpen = false;
            }
        };

        // ── 4. Debugger timing trap ───────────────────────────────────────────────
        const debuggerTrap = () => {
            const start = performance.now();
            // eslint-disable-next-line no-debugger
            debugger; // pauses in DevTools, takes time
            if (performance.now() - start > 100) handleDetection();
        };

        const handleDetection = () => {
            if (onViolation) onViolation("devtools");
            // Blur content, show warning overlay
            document.body.style.filter = "blur(8px)";
            document.body.style.pointerEvents = "none";
            if (!document.getElementById("__devtools-warning")) {
                const el = document.createElement("div");
                el.id = "__devtools-warning";
                el.style.cssText = `
          position:fixed;top:0;left:0;width:100%;height:100%;
          display:flex;align-items:center;justify-content:center;
          z-index:999999;pointer-events:all;
          background:rgba(15,14,13,0.85);
          font-family:'DM Sans',sans-serif;
          flex-direction:column;gap:12px;color:#f5f2ed;text-align:center;
        `;
                el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c8501a" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <h2 style="font-size:1.25rem;font-weight:600;margin:0">DevTools Detected</h2>
          <p style="font-size:0.875rem;color:#a09890;max-width:280px">Close developer tools to continue using KIIT Notes.</p>
        `;
                document.body.appendChild(el);
            }
        };

        const restoreIfClosed = () => {
            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;
            if (widthDiff <= THRESHOLD && heightDiff <= THRESHOLD) {
                document.body.style.filter = "";
                document.body.style.pointerEvents = "";
                const el = document.getElementById("__devtools-warning");
                if (el) el.remove();
                devtoolsOpen = false;
            }
        };

        const sizeInterval = setInterval(() => {
            checkDevTools();
            restoreIfClosed();
        }, 1000);
        const debugInterval = setInterval(debuggerTrap, 3000);

        window.addEventListener("resize", restoreIfClosed);

        return () => {
            document.removeEventListener("keydown", blockKeys);
            document.removeEventListener("contextmenu", blockMenu);
            clearInterval(sizeInterval);
            clearInterval(debugInterval);
            window.removeEventListener("resize", restoreIfClosed);
            document.body.style.filter = "";
            document.body.style.pointerEvents = "";
            document.getElementById("__devtools-warning")?.remove();
        };
    }, [enabled]);
}
