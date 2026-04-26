import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSecurity } from "../hooks/useSecurity";
import { resourcesApi } from "../services/api";
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import s from "./PDFViewer.module.css";

// ── Watermark — baked into canvas pixels after each render ───────────────────
function drawWatermark(ctx, width, height, text, scale = 1) {
    const baseWidth = width / scale;

    // ── Draw the WowNotes book+star icon ─────────────────────────────────────
    function drawIcon(iconPx) {
        const sc = iconPx / 140;
        ctx.save();
        ctx.scale(sc, sc);

        const pageL = ctx.createLinearGradient(-8,-66,-8,48);
        pageL.addColorStop(0,"#1e2d42"); pageL.addColorStop(1,"#162032");
        const pageR = ctx.createLinearGradient(8,-66,8,48);
        pageR.addColorStop(0,"#243348"); pageR.addColorStop(1,"#1a2840");
        const spine = ctx.createLinearGradient(0,-66,0,48);
        spine.addColorStop(0,"#fef08a"); spine.addColorStop(0.55,"#facc15"); spine.addColorStop(1,"#d97706");
        const star = ctx.createLinearGradient(-13,-104,13,-76);
        star.addColorStop(0,"#fef9c3"); star.addColorStop(1,"#facc15");

        ctx.beginPath(); ctx.moveTo(-8,-66); ctx.quadraticCurveTo(-42,-61,-55,-30);
        ctx.quadraticCurveTo(-58,2,-51,33); ctx.quadraticCurveTo(-38,48,-8,48); ctx.closePath();
        ctx.fillStyle = pageL; ctx.fill();
        ctx.beginPath(); ctx.moveTo(8,-66); ctx.quadraticCurveTo(42,-61,55,-30);
        ctx.quadraticCurveTo(58,2,51,33); ctx.quadraticCurveTo(38,48,8,48); ctx.closePath();
        ctx.fillStyle = pageR; ctx.fill();

        ctx.strokeStyle="#3d5470"; ctx.lineWidth=2.4; ctx.lineCap="round";
        [[-46,-22,-14,-27],[-48,-6,-14,-10],[-48,10,-14,8]].forEach(([x1,y1,x2,y2])=>{
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });
        ctx.strokeStyle="#2d3f55"; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.moveTo(-46,26); ctx.lineTo(-14,26); ctx.stroke();
        ctx.strokeStyle="#455f7a"; ctx.lineWidth=2.4;
        [[14,-27,46,-22],[14,-10,48,-6],[14,8,48,10]].forEach(([x1,y1,x2,y2])=>{
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });
        ctx.strokeStyle="#354d66"; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.moveTo(14,26); ctx.lineTo(46,26); ctx.stroke();

        ctx.fillStyle = spine;
        ctx.beginPath(); ctx.roundRect(-5.5,-66,11,114,5.5); ctx.fill();

        ctx.strokeStyle="#0a0c12"; ctx.lineWidth=2.6; ctx.lineCap="round"; ctx.lineJoin="round";
        ctx.beginPath(); ctx.moveTo(2.5,-30); ctx.lineTo(-3,0); ctx.lineTo(2,0); ctx.lineTo(-3,32); ctx.stroke();

        ctx.beginPath(); ctx.moveTo(0,-104); ctx.quadraticCurveTo(3,-93,13,-90);
        ctx.quadraticCurveTo(3,-87,0,-76); ctx.quadraticCurveTo(-3,-87,-13,-90);
        ctx.quadraticCurveTo(-3,-93,0,-104); ctx.closePath();
        ctx.fillStyle = star; ctx.fill();

        ctx.restore();
    }

    // Clip all watermark drawing strictly to the canvas bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    // ── 1. Tiled diagonal repeating text ─────────────────────────────────────
    const fontSize = Math.max(14, baseWidth / 28);
    const spacing  = Math.max(120, baseWidth / 4);
    const diagLen  = Math.sqrt(width * width + height * height);

    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.font = `bold ${fontSize * scale}px "DM Sans", Arial, sans-serif`;
    ctx.fillStyle = "#facc15";
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    for (let x = -diagLen; x < diagLen * 2; x += spacing * scale)
        for (let y = -diagLen; y < diagLen * 2; y += spacing * scale)
            ctx.fillText(text, x, y);
    ctx.restore();

    // ── 2. Full-diagonal stamp ────────────────────────────────────────────────
    // Angle along the page diagonal (bottom-left to top-right)
    const angle = -Math.atan2(height, width);
    const diagLength = Math.sqrt(width * width + height * height);

    // Measure text at 100px to compute scale ratio
    ctx.save();
    ctx.font = `900 100px "DM Sans", Arial Black, sans-serif`;
    const probeWidth = ctx.measureText("WOWNOTES").width;
    ctx.restore();

    // fontSize2: size that makes icon+gap+text span the diagonal,
    // but also capped so the stamp HEIGHT (≈ fontSize2) fits within the
    // shorter page dimension with a comfortable margin.
    const ratio     = (probeWidth / 100) + 1.25;
    const byDiag    = diagLength / ratio;
    const byEdge    = Math.min(width, height) * 0.80;
    const fontSize2 = Math.min(byDiag, byEdge);
    const iconPx    = fontSize2 * 1.1;
    const gap2      = fontSize2 * 0.15;
    const textWidth = fontSize2 * (probeWidth / 100);
    const totalW    = iconPx + gap2 + textWidth;
    const startX    = -totalW / 2;

    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);

    // Icon — fit full natural extent (116 × 158 units) within iconPx slot
    const iconFit    = Math.min(iconPx / 116, iconPx / 158);
    const iconDrawPx = 140 * iconFit;

    ctx.save();
    ctx.beginPath();
    ctx.rect(startX, -iconPx / 2, iconPx, iconPx);
    ctx.clip();
    ctx.translate(startX + iconPx / 2, -25 * iconFit);
    drawIcon(iconDrawPx);
    ctx.restore();

    // "WOWNOTES" text — dark stroke + gold gradient fill
    ctx.font = `900 ${fontSize2}px "DM Sans", Arial Black, sans-serif`;
    ctx.textAlign    = "left";
    ctx.textBaseline = "alphabetic";

    ctx.strokeStyle = "#0a0c12";
    ctx.lineWidth   = fontSize2 * 0.04;
    ctx.lineJoin    = "round";
    ctx.strokeText("WOWNOTES", startX + iconPx + gap2, 0);

    const goldGrad = ctx.createLinearGradient(
        startX + iconPx + gap2, -fontSize2,
        startX + iconPx + gap2 + textWidth, 0
    );
    goldGrad.addColorStop(0, "#fef08a");
    goldGrad.addColorStop(0.5, "#facc15");
    goldGrad.addColorStop(1, "#d97706");
    ctx.fillStyle = goldGrad;
    ctx.fillText("WOWNOTES", startX + iconPx + gap2, 0);

    ctx.restore(); // rotate+translate
    ctx.restore(); // outer clip
}

// ── Page image fetcher — proxied through our backend (never exposes Cloudinary URL) ──
// Returns an HTMLImageElement drawn from an object URL so canvas is never tainted.
async function fetchPageImage(resourceId, pageIndex) {
    const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/resources/${resourceId}/page/${pageIndex}`,
        { credentials: "include" },
    );
    if (!resp.ok) throw new Error(`Failed to load page ${pageIndex}`);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(blob);
        img.onload = () => {
            resolve({ img, objUrl });
        };
        img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            reject(new Error("Image decode failed"));
        };
        img.src = objUrl;
    });
}

// ── PAGED VIEWER ──────────────────────────────────────────────────────────────
// One page at a time, loaded through the backend proxy, drawn onto canvas.
// Adjacent pages are pre-fetched into an in-memory cache for instant navigation.
function PagedViewer({
    resourceId,
    pageCount,
    watermarkText,
    scale,
    onPageChange,
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInputVal, setPageInputVal] = useState("1");
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    const canvasRef = useRef(null);
    // Cache: { [pageIndex]: { img, objUrl } }
    const cacheRef = useRef({});
    const renderTokenRef = useRef(null);

    // Keep input in sync when page changes via Prev/Next or keyboard
    useEffect(() => {
        setPageInputVal(String(currentPage));
    }, [currentPage]);

    // Report current page up to the shell for the top-bar counter
    useEffect(() => {
        onPageChange(currentPage);
    }, [currentPage, onPageChange]);

    // ── Fetch one page (with caching) ────────────────────────────────────────
    const getPage = useCallback(
        async (index) => {
            if (cacheRef.current[index]) return cacheRef.current[index];
            const result = await fetchPageImage(resourceId, index);
            cacheRef.current[index] = result;
            return result;
        },
        [resourceId],
    );

    // ── Render current page onto canvas + watermark ───────────────────────────
    const renderPage = useCallback(
        async (pageNum) => {
            if (!canvasRef.current) return;

            // Cancel any stale in-flight render
            if (renderTokenRef.current) renderTokenRef.current.cancelled = true;
            const token = { cancelled: false };
            renderTokenRef.current = token;

            setPageLoading(true);
            try {
                const { img } = await getPage(pageNum);
                if (token.cancelled) return;

                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Watermark is drawn AFTER the image — baked into pixels
                drawWatermark(
                    ctx,
                    canvas.width,
                    canvas.height,
                    watermarkText,
                    scale,
                );
            } catch (err) {
                if (!token.cancelled) setError(err.message);
            } finally {
                if (!token.cancelled) setPageLoading(false);
            }
        },
        [getPage, scale, watermarkText],
    );

    useEffect(() => {
        renderPage(currentPage);
    }, [currentPage, renderPage]);

    // ── Pre-fetch neighbours ──────────────────────────────────────────────────
    useEffect(() => {
        [currentPage - 1, currentPage + 1]
            .filter((n) => n >= 1 && n <= pageCount && !cacheRef.current[n])
            .forEach((n) => getPage(n).catch(() => {}));
    }, [currentPage, pageCount, getPage]);

    // ── Keyboard navigation ───────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown")
                setCurrentPage((p) => Math.min(pageCount, p + 1));
            if (e.key === "ArrowLeft" || e.key === "ArrowUp")
                setCurrentPage((p) => Math.max(1, p - 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [pageCount]);

    // Clean up object URLs when component unmounts
    useEffect(() => {
        return () => {
            Object.values(cacheRef.current).forEach(({ objUrl }) =>
                URL.revokeObjectURL(objUrl),
            );
        };
    }, []);

    if (error)
        return (
            <div className={s.loader} style={{ color: "#f87171" }}>
                <p>{error}</p>
            </div>
        );

    return (
        <>
            <div className={s.viewerArea}>
                <div className={s.canvasWrap}>
                    {pageLoading && (
                        <div className={s.pageSpinner}>
                            <span className={s.spin} />
                        </div>
                    )}
                    <canvas ref={canvasRef} className={s.pdfCanvas} />
                </div>
            </div>

            {pageCount > 1 && (
                <div className={s.navBar}>
                    <button
                        className={s.navBtn}
                        onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft size={16} /> Prev
                    </button>
                    <div className={s.pageJumper}>
                        <input
                            className={s.pageInput}
                            type="text"
                            value={pageInputVal}
                            onChange={(e) => setPageInputVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const v = parseInt(pageInputVal);
                                    if (!isNaN(v) && v >= 1 && v <= pageCount) {
                                        setCurrentPage(v);
                                    } else {
                                        setPageInputVal(String(currentPage));
                                    }
                                    e.target.blur();
                                }
                            }}
                            onBlur={() => {
                                const v = parseInt(pageInputVal);
                                if (!isNaN(v) && v >= 1 && v <= pageCount) {
                                    setCurrentPage(v);
                                } else {
                                    setPageInputVal(String(currentPage));
                                }
                            }}
                        />
                        <span className={s.pageOf}>/ {pageCount}</span>
                    </div>
                    <button
                        className={s.navBtn}
                        onClick={() =>
                            setCurrentPage((p) => Math.min(pageCount, p + 1))
                        }
                        disabled={currentPage >= pageCount}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </>
    );
}

// ── PDFJS VIEWER (small PDFs — original behaviour, unchanged) ─────────────────
function PdfjsViewer({ resourceId, watermarkText, scale, onPageChange }) {
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInputVal, setPageInputVal] = useState("1");
    const [loading, setLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(false);
    const [error, setError] = useState(null);

    const pdfDocRef = useRef(null);
    const canvasRef = useRef(null);
    const renderTaskRef = useRef(null);

    useEffect(() => {
        setPageInputVal(String(currentPage));
    }, [currentPage]);

    useEffect(() => {
        onPageChange({ currentPage, numPages });
    }, [currentPage, numPages, onPageChange]);

    useEffect(() => {
        let cancelled = false;
        async function init() {
            try {
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

                const resp = await fetch(
                    `${import.meta.env.VITE_API_URL}/resources/${resourceId}/view`,
                    { credentials: "include" },
                );
                if (!resp.ok)
                    throw new Error("Failed to load PDF. Check your access.");
                const pdfData = await resp.arrayBuffer();
                if (cancelled) return;

                const pdfDoc = await pdfjsLib.getDocument({ data: pdfData })
                    .promise;
                if (cancelled) return;

                pdfDocRef.current = pdfDoc;
                setNumPages(pdfDoc.numPages);
                setLoading(false);
            } catch (err) {
                if (!cancelled)
                    setError(err.message || "Failed to load document.");
            }
        }
        init();
        return () => {
            cancelled = true;
        };
    }, [resourceId]);

    const renderPage = useCallback(
        async (pageNum) => {
            if (!pdfDocRef.current || !canvasRef.current) return;
            if (renderTaskRef.current) {
                try {
                    await renderTaskRef.current.cancel();
                } catch {}
            }

            setPageLoading(true);
            try {
                const page = await pdfDocRef.current.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const renderTask = page.render({
                    canvasContext: ctx,
                    viewport,
                });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                drawWatermark(
                    ctx,
                    viewport.width,
                    viewport.height,
                    watermarkText,
                    scale,
                );
            } catch (err) {
                if (err?.name !== "RenderingCancelledException")
                    console.error(err);
            } finally {
                setPageLoading(false);
            }
        },
        [scale, watermarkText],
    );

    useEffect(() => {
        if (!loading) renderPage(currentPage);
    }, [currentPage, loading, renderPage]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown")
                setCurrentPage((p) => Math.min(numPages, p + 1));
            if (e.key === "ArrowLeft" || e.key === "ArrowUp")
                setCurrentPage((p) => Math.max(1, p - 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [numPages]);

    if (error)
        return (
            <div className={s.errorPage}>
                <p className={s.errorMsg}>{error}</p>
            </div>
        );

    return (
        <>
            <div className={s.viewerArea}>
                {loading ? (
                    <div className={s.loader}>
                        <span className={s.spin} />
                        <p>Loading document…</p>
                    </div>
                ) : (
                    <div className={s.canvasWrap}>
                        {pageLoading && (
                            <div className={s.pageSpinner}>
                                <span className={s.spin} />
                            </div>
                        )}
                        <canvas ref={canvasRef} className={s.pdfCanvas} />
                    </div>
                )}
            </div>

            {!loading && numPages > 1 && (
                <div className={s.navBar}>
                    <button
                        className={s.navBtn}
                        onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft size={16} /> Prev
                    </button>
                    <div className={s.pageJumper}>
                        <input
                            className={s.pageInput}
                            type="text"
                            value={pageInputVal}
                            onChange={(e) => setPageInputVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const v = parseInt(pageInputVal);
                                    if (!isNaN(v) && v >= 1 && v <= numPages) {
                                        setCurrentPage(v);
                                    } else {
                                        setPageInputVal(String(currentPage));
                                    }
                                    e.target.blur();
                                }
                            }}
                            onBlur={() => {
                                const v = parseInt(pageInputVal);
                                if (!isNaN(v) && v >= 1 && v <= numPages) {
                                    setCurrentPage(v);
                                } else {
                                    setPageInputVal(String(currentPage));
                                }
                            }}
                        />
                        <span className={s.pageOf}>/ {numPages}</span>
                    </div>
                    <button
                        className={s.navBtn}
                        onClick={() =>
                            setCurrentPage((p) => Math.min(numPages, p + 1))
                        }
                        disabled={currentPage >= numPages}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </>
    );
}

// ── SHELL ─────────────────────────────────────────────────────────────────────
// ── VIOLATION WARNING TOAST ────────────────────────────────────────────────
const VIOLATION_MESSAGES = {
    print: "Printing is disabled to protect this content.",
    copy: "Copying is disabled to protect this content.",
    save: "Saving is disabled to protect this content.",
    devtools: "Developer tools are not allowed while viewing.",
    default: "This action is not allowed while viewing notes.",
};

function ViolationToast({ message, onDismiss }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 6000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div className={s.violationToast}>
            <div className={s.violationLeft}>
                <span className={s.violationIcon}>⚠️</span>
                <div className={s.violationBody}>
                    <p className={s.violationTitle}>
                        Content Protection Notice
                    </p>
                    <p className={s.violationMsg}>{message}</p>
                    <p className={s.violationSub}>
                        Repeated violations may result in suspension of your
                        WowNotes subscription. Please respect our content
                        guidelines.
                    </p>
                </div>
            </div>
            <button
                className={s.violationClose}
                onClick={onDismiss}
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}

export default function PDFViewer() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [resource, setResource] = useState(null);
    const [loadingResource, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scale, setScale] = useState(1.4);
    const [violationMsg, setViolationMsg] = useState(null);
    const toastTimerRef = useRef(null);

    const showWarning = useCallback((type) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setViolationMsg(VIOLATION_MESSAGES[type] || VIOLATION_MESSAGES.default);
        toastTimerRef.current = setTimeout(() => setViolationMsg(null), 6000);
    }, []);

    // ── Violation tracking ────────────────────────────────────────────────────────────────────
    const VIOLATION_LIMIT = 10;
    const STORAGE_KEY = `wownotes_violations_${id}`;

    const trackViolation = useCallback(
        (type) => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const data = raw
                    ? JSON.parse(raw)
                    : { total: 0, reported: false, breakdown: {} };
                if (data.reported) return; // already reported, don\'t keep firing

                data.breakdown[type] = (data.breakdown[type] || 0) + 1;
                data.total = Object.values(data.breakdown).reduce(
                    (s, v) => s + v,
                    0,
                );
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

                if (data.total >= VIOLATION_LIMIT) {
                    data.reported = true;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    // Fire report to backend
                    const violations = Object.entries(data.breakdown).map(
                        ([t, count]) => ({ type: t, count }),
                    );
                    fetch(
                        `${import.meta.env.VITE_API_URL}/admin/violation-report`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                resourceId: id,
                                resourceTitle: resource?.title || null,
                                violations,
                            }),
                        },
                    ).catch(() => {}); // fire-and-forget
                }
            } catch {}
        },
        [id, resource],
    );

    // Wrap showWarning to also track
    const warnAndTrack = useCallback(
        (type) => {
            showWarning(type);
            trackViolation(type);
        },
        [showWarning, trackViolation],
    );

    useSecurity(true, warnAndTrack);

    // Unified page display — updated by whichever sub-viewer is active
    const [pageDisplay, setPageDisplay] = useState({ current: 1, total: 0 });

    const watermarkText =
        user?.roll || user?.email?.split("@")[0] || "KIIT NOTES";

    // ── Block print / drag ────────────────────────────────────────────────────
    useEffect(() => {
        const blockPrint = (e) => {
            if (
                (e.ctrlKey || e.metaKey) &&
                ["p", "P", "s", "S"].includes(e.key) &&
                (e.key === "p" || e.key === "P" || e.shiftKey)
            )
                e.preventDefault();
        };
        const blockDrag = (e) => e.preventDefault();
        const hidePrint = () => {
            document.body.style.display = "none";
        };
        const showPrint = () => {
            document.body.style.display = "";
        };

        document.addEventListener("keydown", blockPrint, true);
        document.addEventListener("dragstart", blockDrag, true);
        document.addEventListener("drop", blockDrag, true);
        window.addEventListener("beforeprint", hidePrint);
        window.addEventListener("afterprint", showPrint);
        return () => {
            document.removeEventListener("keydown", blockPrint, true);
            document.removeEventListener("dragstart", blockDrag, true);
            document.removeEventListener("drop", blockDrag, true);
            window.removeEventListener("beforeprint", hidePrint);
            window.removeEventListener("afterprint", showPrint);
        };
    }, []);

    // ── Load resource metadata ────────────────────────────────────────────────
    useEffect(() => {
        resourcesApi
            .getOne(id)
            .then((r) => {
                setResource(r);
                if (r.type === "notes") setScale(0.7);
                // Pre-seed total for paged mode immediately from metadata
                if (r.storageMode === "pages")
                    setPageDisplay({ current: 1, total: r.pageCount || 0 });
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message || "Failed to load document.");
                setLoading(false);
            });
    }, [id]);

    if (error)
        return (
            <div className={s.errorPage}>
                <p className={s.errorMsg}>{error}</p>
                <button
                    className={s.backBtn}
                    onClick={() => navigate("/resources")}
                >
                    <ArrowLeft size={15} /> Back to Resources
                </button>
            </div>
        );

    const isPaged = resource?.storageMode === "pages";

    return (
        <div className={s.shell}>
            {/* Top bar */}
            <div className={s.topBar}>
                <button className={s.backBtn} onClick={() => window.close()}>
                    <ArrowLeft size={15} /> Close
                </button>
                <div className={s.docInfo}>
                    <span className={s.docTitle}>
                        {loadingResource ? "Loading…" : resource?.title}
                    </span>
                    {pageDisplay.total > 0 && (
                        <span className={s.pageCount}>
                            Page {pageDisplay.current} / {pageDisplay.total}
                        </span>
                    )}
                </div>
                <div className={s.zoomBtns}>
                    <button
                        className={s.zoomBtn}
                        onClick={() =>
                            setScale((z) =>
                                Math.max(0.7, +(z - 0.2).toFixed(1)),
                            )
                        }
                        title="Zoom out"
                    >
                        <ZoomOut size={15} />
                    </button>
                    <span className={s.zoomLabel}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        className={s.zoomBtn}
                        onClick={() =>
                            setScale((z) =>
                                Math.min(3.0, +(z + 0.2).toFixed(1)),
                            )
                        }
                        title="Zoom in"
                    >
                        <ZoomIn size={15} />
                    </button>
                </div>
            </div>

            {loadingResource ? (
                <div className={s.loader}>
                    <span className={s.spin} />
                    <p>Loading document…</p>
                </div>
            ) : isPaged ? (
                <PagedViewer
                    resourceId={resource._id}
                    pageCount={resource.pageCount}
                    watermarkText={watermarkText}
                    scale={scale}
                    onPageChange={(current) =>
                        setPageDisplay((d) => ({ ...d, current }))
                    }
                />
            ) : (
                <PdfjsViewer
                    resourceId={resource._id}
                    watermarkText={watermarkText}
                    scale={scale}
                    onPageChange={({ currentPage, numPages }) =>
                        setPageDisplay({
                            current: currentPage,
                            total: numPages,
                        })
                    }
                />
            )}

            {/* ── Violation Warning Toast ── */}
            {violationMsg && (
                <ViolationToast
                    message={violationMsg}
                    onDismiss={() => setViolationMsg(null)}
                />
            )}
        </div>
    );
}