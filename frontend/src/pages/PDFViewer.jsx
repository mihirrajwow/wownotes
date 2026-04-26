import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from "react";
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
    Sparkles,
    MessageCircle,
    Search,
    X,
    Send,
    RefreshCw,
    BookOpen,
    AlertCircle,
} from "lucide-react";
import s from "./PDFViewer.module.css";

const API = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Watermark helper (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
function drawWatermark(ctx, width, height, text, scale = 1) {
    const baseWidth = width / scale;

    function drawIcon(iconPx) {
        const sc = iconPx / 140;
        ctx.save();
        ctx.scale(sc, sc);
        const pageL = ctx.createLinearGradient(-8, -66, -8, 48);
        pageL.addColorStop(0, "#1e2d42");
        pageL.addColorStop(1, "#162032");
        const pageR = ctx.createLinearGradient(8, -66, 8, 48);
        pageR.addColorStop(0, "#243348");
        pageR.addColorStop(1, "#1a2840");
        const spine = ctx.createLinearGradient(0, -66, 0, 48);
        spine.addColorStop(0, "#fef08a");
        spine.addColorStop(0.55, "#facc15");
        spine.addColorStop(1, "#d97706");
        const star = ctx.createLinearGradient(-13, -104, 13, -76);
        star.addColorStop(0, "#fef9c3");
        star.addColorStop(1, "#facc15");

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

    ctx.save();
    ctx.beginPath(); ctx.rect(0,0,width,height); ctx.clip();

    const fontSize = Math.max(14, baseWidth/28);
    const spacing  = Math.max(120, baseWidth/4);
    const diagLen  = Math.sqrt(width*width + height*height);

    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.font = `bold ${fontSize*scale}px "DM Sans", Arial, sans-serif`;
    ctx.fillStyle = "#facc15";
    ctx.translate(width/2, height/2);
    ctx.rotate(-Math.PI/6);
    for (let x=-diagLen; x<diagLen*2; x+=spacing*scale)
        for (let y=-diagLen; y<diagLen*2; y+=spacing*scale)
            ctx.fillText(text, x, y);
    ctx.restore();

    const angle = -Math.atan2(height, width);
    const diagLength = Math.sqrt(width*width + height*height);

    ctx.save();
    ctx.font = `900 100px "DM Sans", Arial Black, sans-serif`;
    const probeWidth = ctx.measureText("WOWNOTES").width;
    ctx.restore();

    const ratio     = (probeWidth/100) + 1.25;
    const byDiag    = diagLength / ratio;
    const byEdge    = Math.min(width,height) * 0.80;
    const fontSize2 = Math.min(byDiag, byEdge);
    const iconPx    = fontSize2 * 1.1;
    const gap2      = fontSize2 * 0.15;
    const textWidth = fontSize2 * (probeWidth/100);
    const totalW    = iconPx + gap2 + textWidth;
    const startX    = -totalW / 2;

    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.translate(width/2, height/2);
    ctx.rotate(angle);

    const iconFit    = Math.min(iconPx/116, iconPx/158);
    const iconDrawPx = 140 * iconFit;

    ctx.save();
    ctx.beginPath(); ctx.rect(startX,-iconPx/2,iconPx,iconPx); ctx.clip();
    ctx.translate(startX + iconPx/2, -25*iconFit);
    drawIcon(iconDrawPx);
    ctx.restore();

    ctx.font = `900 ${fontSize2}px "DM Sans", Arial Black, sans-serif`;
    ctx.textAlign    = "left";
    ctx.textBaseline = "alphabetic";

    ctx.strokeStyle = "#0a0c12";
    ctx.lineWidth   = fontSize2 * 0.04;
    ctx.lineJoin    = "round";
    ctx.strokeText("WOWNOTES", startX + iconPx + gap2, 0);

    const goldGrad = ctx.createLinearGradient(
        startX+iconPx+gap2, -fontSize2,
        startX+iconPx+gap2+textWidth, 0
    );
    goldGrad.addColorStop(0,"#fef08a");
    goldGrad.addColorStop(0.5,"#facc15");
    goldGrad.addColorStop(1,"#d97706");
    ctx.fillStyle = goldGrad;
    ctx.fillText("WOWNOTES", startX + iconPx + gap2, 0);

    ctx.restore();
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Page image fetcher (proxied through backend)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPageImage(resourceId, pageIndex) {
    const resp = await fetch(`${API}/resources/${resourceId}/page/${pageIndex}`, {
        credentials: "include",
    });
    if (!resp.ok) throw new Error(`Failed to load page ${pageIndex}`);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(blob);
        img.onload = () => resolve({ img, objUrl });
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Image decode failed")); };
        img.src = objUrl;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple Markdown renderer (no external deps)
// ─────────────────────────────────────────────────────────────────────────────
function InlineMarkdown({ text }) {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2,-2)}</strong>;
                if (/^\*[^*]+\*$/.test(part))     return <em key={i}>{part.slice(1,-1)}</em>;
                if (/^`[^`]+`$/.test(part))       return <code key={i} className={s.mdCode}>{part.slice(1,-1)}</code>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

function MarkdownBlock({ text }) {
    if (!text) return null;
    const lines = text.split("\n");
    const elements = [];
    let listBuf = [];
    let listType = "ul";

    const flushList = (key) => {
        if (!listBuf.length) return;
        const Tag = listType === "ol" ? "ol" : "ul";
        elements.push(
            <Tag key={`list-${key}`} className={s.mdList}>
                {listBuf.map((item, i) => (
                    <li key={i} className={s.mdLi}><InlineMarkdown text={item} /></li>
                ))}
            </Tag>
        );
        listBuf = [];
    };

    lines.forEach((line, i) => {
        const hMatch  = line.match(/^(#{1,3})\s+(.+)/);
        const liMatch = line.match(/^[\-\*\+]\s+(.+)/);
        const numMatch = line.match(/^\d+\.\s+(.+)/);

        if (hMatch) {
            flushList(i);
            const level = hMatch[1].length;
            const Tag = level===1 ? "h2" : level===2 ? "h3" : "h4";
            elements.push(<Tag key={i} className={s[`mdH${level}`]}>{hMatch[2]}</Tag>);
        } else if (liMatch) {
            listType = "ul";
            listBuf.push(liMatch[1]);
        } else if (numMatch) {
            listType = "ol";
            listBuf.push(numMatch[1]);
        } else if (line.trim() === "") {
            flushList(i);
        } else {
            flushList(i);
            elements.push(<p key={i} className={s.mdP}><InlineMarkdown text={line} /></p>);
        }
    });
    flushList("end");
    return <div className={s.markdown}>{elements}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GeminiPanel — the AI side panel with 3 tabs
// ─────────────────────────────────────────────────────────────────────────────
function GeminiPanel({ resourceId, currentPage, pageCount, onJumpToPage, isPaged }) {
    const [activeTab, setActiveTab] = useState("summary");

    // Summary
    const [summary, setSummary]         = useState(null);
    const [summaryPage, setSummaryPage] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError]     = useState(null);

    // Q&A
    const [qaMessages, setQaMessages] = useState([]);
    const [qaInput, setQaInput]       = useState("");
    const [qaLoading, setQaLoading]   = useState(false);
    const [qaError, setQaError]       = useState(null);
    const qaEndRef = useRef(null);

    // Topic search
    const [topicInput, setTopicInput]   = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError]     = useState(null);

    useEffect(() => { qaEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [qaMessages]);

    // ── Summary ──────────────────────────────────────────────────────────────
    async function handleSummarize() {
        setSummaryLoading(true); setSummaryError(null);
        try {
            const res = await fetch(`${API}/ai/summarize`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resourceId, pageIndex: currentPage }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate summary.");
            setSummary(data.summary);
            setSummaryPage(currentPage);
        } catch (err) {
            setSummaryError(err.message);
        } finally {
            setSummaryLoading(false);
        }
    }

    // ── Q&A ──────────────────────────────────────────────────────────────────
    async function handleQA() {
        const q = qaInput.trim();
        if (!q || qaLoading) return;
        setQaInput(""); setQaLoading(true); setQaError(null);
        const userMsg = { role: "user", content: q };
        setQaMessages(prev => [...prev, userMsg]);
        try {
            const res = await fetch(`${API}/ai/qa`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId, pageIndex: currentPage, question: q,
                    conversationHistory: [...qaMessages, userMsg].slice(-8),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to get answer.");
            setQaMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
        } catch (err) {
            setQaError(err.message);
            setQaMessages(prev => prev.slice(0, -1));
        } finally {
            setQaLoading(false);
        }
    }

    // ── Topic search ──────────────────────────────────────────────────────────
    async function handleTopicSearch() {
        const t = topicInput.trim();
        if (!t || searchLoading) return;
        setSearchLoading(true); setSearchError(null); setSearchResult(null);
        try {
            const res = await fetch(`${API}/ai/search-topic`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resourceId, topic: t }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Search failed.");
            setSearchResult(data);
        } catch (err) {
            setSearchError(err.message);
        } finally {
            setSearchLoading(false);
        }
    }

    // ── Unavailable for non-paged ─────────────────────────────────────────────
    if (!isPaged) {
        return (
            <div className={s.aiUnavailable}>
                <Sparkles size={28} className={s.aiUnavailableIcon} />
                <p className={s.aiUnavailableTitle}>AI Features Unavailable</p>
                <p className={s.aiUnavailableMsg}>
                    AI-powered features require paged resources. This document uses legacy PDF mode.
                </p>
            </div>
        );
    }

    return (
        <div className={s.aiPanelInner}>
            {/* Tab bar */}
            <div className={s.aiTabs}>
                {[
                    { key: "summary", icon: <BookOpen size={13}/>, label: "Summary" },
                    { key: "qa",      icon: <MessageCircle size={13}/>, label: "Ask AI" },
                    { key: "search",  icon: <Search size={13}/>, label: "Find Topic" },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`${s.aiTab} ${activeTab===tab.key ? s.aiTabActive : ""}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── SUMMARY TAB ── */}
            {activeTab === "summary" && (
                <div className={s.aiTabContent}>
                    <div className={s.aiTabHeader}>
                        <p className={s.aiTabTitle}>
                            {summaryPage ? `Summary — Page ${summaryPage}` : "Page Summary"}
                        </p>
                        <p className={s.aiTabHint}>
                            Gemini reads the current page and extracts topics, concepts, and revision points.
                        </p>
                    </div>

                    <button className={s.aiPrimaryBtn} onClick={handleSummarize} disabled={summaryLoading}>
                        {summaryLoading ? (
                            <><span className={s.aiSpin}/> Analysing page {currentPage}…</>
                        ) : summary ? (
                            <><RefreshCw size={13}/> Regenerate for page {currentPage}</>
                        ) : (
                            <><Sparkles size={13}/> Generate Summary — page {currentPage}</>
                        )}
                    </button>

                    {summaryError && (
                        <div className={s.aiError}><AlertCircle size={13}/> {summaryError}</div>
                    )}

                    {summary && !summaryLoading && (
                        <div className={s.aiScrollArea}><MarkdownBlock text={summary}/></div>
                    )}

                    {!summary && !summaryLoading && !summaryError && (
                        <div className={s.aiEmptyState}>
                            <BookOpen size={30} className={s.aiEmptyIcon}/>
                            <p>Click above to generate a smart study summary for the currently visible page.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Q&A TAB ── */}
            {activeTab === "qa" && (
                <div className={s.aiTabContent}>
                    <div className={s.aiTabHeader}>
                        <p className={s.aiTabTitle}>Ask about page {currentPage}</p>
                        <p className={s.aiTabHint}>
                            Gemini sees the current page and answers your questions in context.
                        </p>
                    </div>

                    {qaMessages.length > 0 && (
                        <button className={s.aiClearBtn}
                            onClick={() => { setQaMessages([]); setQaError(null); }}>
                            Clear conversation
                        </button>
                    )}

                    <div className={s.qaMessages}>
                        {qaMessages.length === 0 && !qaLoading && (
                            <div className={s.aiEmptyState}>
                                <MessageCircle size={30} className={s.aiEmptyIcon}/>
                                <p>Ask anything about page {currentPage}. Try "Explain this concept" or "What formula is shown here?"</p>
                            </div>
                        )}

                        {qaMessages.map((msg, i) => (
                            <div key={i} className={msg.role==="user" ? s.qaMsgUser : s.qaMsgAI}>
                                {msg.role==="assistant"
                                    ? <MarkdownBlock text={msg.content}/>
                                    : <p className={s.qaMsgText}>{msg.content}</p>
                                }
                            </div>
                        ))}

                        {qaLoading && (
                            <div className={s.qaMsgAI}>
                                <span className={s.qaTyping}><span/><span/><span/></span>
                            </div>
                        )}

                        {qaError && (
                            <div className={s.aiError}><AlertCircle size={13}/> {qaError}</div>
                        )}
                        <div ref={qaEndRef}/>
                    </div>

                    <div className={s.qaInputRow}>
                        <input
                            className={s.qaInput}
                            placeholder="Ask a question about this page…"
                            value={qaInput}
                            onChange={e => setQaInput(e.target.value)}
                            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleQA(); }}}
                            disabled={qaLoading}
                        />
                        <button className={s.qaSendBtn} onClick={handleQA}
                            disabled={qaLoading || !qaInput.trim()}>
                            <Send size={14}/>
                        </button>
                    </div>
                </div>
            )}

            {/* ── TOPIC SEARCH TAB ── */}
            {activeTab === "search" && (
                <div className={s.aiTabContent}>
                    <div className={s.aiTabHeader}>
                        <p className={s.aiTabTitle}>Find Topic in Notes</p>
                        <p className={s.aiTabHint}>
                            Type a topic and Gemini will scan the document and jump you to the right page.
                        </p>
                    </div>

                    <div className={s.searchInputRow}>
                        <input
                            className={s.searchInput}
                            placeholder="e.g. Fourier Transform, Ohm's Law…"
                            value={topicInput}
                            onChange={e => { setTopicInput(e.target.value); setSearchResult(null); setSearchError(null); }}
                            onKeyDown={e => { if (e.key==="Enter" && !searchLoading) handleTopicSearch(); }}
                            disabled={searchLoading}
                        />
                        <button className={s.searchBtn} onClick={handleTopicSearch}
                            disabled={searchLoading || !topicInput.trim()}>
                            {searchLoading ? <span className={s.aiSpin}/> : <Search size={14}/>}
                        </button>
                    </div>

                    {searchLoading && (
                        <div className={s.searchScanning}>
                            <span className={s.aiSpin}/>
                            <p>Gemini is scanning your notes… This may take a few seconds.</p>
                        </div>
                    )}

                    {searchError && (
                        <div className={s.aiError}><AlertCircle size={13}/> {searchError}</div>
                    )}

                    {searchResult && !searchLoading && (
                        searchResult.found ? (
                            <div className={s.searchFound}>
                                <div className={s.searchFoundHeader}>
                                    <span className={s.searchFoundBadge}>✓ Found</span>
                                    <p className={s.searchFoundTitle}>
                                        "{topicInput}" appears on {searchResult.pages.length === 1 ? "page" : "pages"}:
                                    </p>
                                </div>
                                <div className={s.searchPageList}>
                                    {searchResult.pages.map(pg => (
                                        <button key={pg}
                                            className={`${s.searchPageBtn} ${pg===currentPage ? s.searchPageBtnCurrent : ""}`}
                                            onClick={() => onJumpToPage(pg)}>
                                            Page {pg}
                                            {pg===currentPage && <span className={s.searchCurrentBadge}>here</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={s.searchNotFound}>
                                <AlertCircle size={18} className={s.searchNotFoundIcon}/>
                                <p className={s.searchNotFoundTitle}>Not Found</p>
                                <p className={s.searchNotFoundMsg}>{searchResult.message}</p>
                                <p className={s.searchNotFoundTip}>Try different or more specific keywords.</p>
                            </div>
                        )
                    )}

                    {!searchResult && !searchLoading && !searchError && (
                        <div className={s.aiEmptyState}>
                            <Search size={30} className={s.aiEmptyIcon}/>
                            <p>Enter a topic above and press Enter. Gemini will scan up to 80 pages to locate it.</p>
                        </div>
                    )}

                    <div className={s.searchFootnote}>
                        <AlertCircle size={11}/> Scans up to 80 pages. Use specific terms for best results.
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PagedViewer — one page at a time, supports imperative jumpToPage via ref
// ─────────────────────────────────────────────────────────────────────────────
const PagedViewer = forwardRef(function PagedViewer(
    { resourceId, pageCount, watermarkText, scale, onPageChange }, ref
) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInputVal, setPageInputVal] = useState("1");
    const [pageLoading, setPageLoading]   = useState(true);
    const [error, setError] = useState(null);

    const canvasRef      = useRef(null);
    const cacheRef       = useRef({});
    const renderTokenRef = useRef(null);

    // Expose jumpToPage for parent (AI panel topic search result)
    useImperativeHandle(ref, () => ({
        jumpToPage: (pg) => {
            const n = parseInt(pg, 10);
            if (!isNaN(n) && n >= 1 && n <= pageCount) setCurrentPage(n);
        },
    }));

    useEffect(() => { setPageInputVal(String(currentPage)); }, [currentPage]);
    useEffect(() => { onPageChange(currentPage); }, [currentPage, onPageChange]);

    const getPage = useCallback(async (index) => {
        if (cacheRef.current[index]) return cacheRef.current[index];
        const result = await fetchPageImage(resourceId, index);
        cacheRef.current[index] = result;
        return result;
    }, [resourceId]);

    const renderPage = useCallback(async (pageNum) => {
        if (!canvasRef.current) return;
        if (renderTokenRef.current) renderTokenRef.current.cancelled = true;
        const token = { cancelled: false };
        renderTokenRef.current = token;
        setPageLoading(true);
        try {
            const { img } = await getPage(pageNum);
            if (token.cancelled) return;
            const canvas = canvasRef.current;
            const ctx    = canvas.getContext("2d");
            canvas.width  = Math.round(img.naturalWidth  * scale);
            canvas.height = Math.round(img.naturalHeight * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawWatermark(ctx, canvas.width, canvas.height, watermarkText, scale);
        } catch (err) {
            if (!token.cancelled) setError(err.message);
        } finally {
            if (!token.cancelled) setPageLoading(false);
        }
    }, [getPage, scale, watermarkText]);

    useEffect(() => { renderPage(currentPage); }, [currentPage, renderPage]);

    useEffect(() => {
        [currentPage - 1, currentPage + 1]
            .filter(n => n >= 1 && n <= pageCount && !cacheRef.current[n])
            .forEach(n => getPage(n).catch(() => {}));
    }, [currentPage, pageCount, getPage]);

    useEffect(() => {
        const onKey = e => {
            if (e.key==="ArrowRight"||e.key==="ArrowDown") setCurrentPage(p=>Math.min(pageCount,p+1));
            if (e.key==="ArrowLeft" ||e.key==="ArrowUp")   setCurrentPage(p=>Math.max(1,p-1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [pageCount]);

    useEffect(() => () => {
        Object.values(cacheRef.current).forEach(({ objUrl }) => URL.revokeObjectURL(objUrl));
    }, []);

    if (error) return <div className={s.loader} style={{color:"#f87171"}}><p>{error}</p></div>;

    return (
        <>
            <div className={s.viewerArea}>
                <div className={s.canvasWrap}>
                    {pageLoading && <div className={s.pageSpinner}><span className={s.spin}/></div>}
                    <canvas ref={canvasRef} className={s.pdfCanvas}/>
                </div>
            </div>

            {pageCount > 1 && (
                <div className={s.navBar}>
                    <button className={s.navBtn}
                        onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage<=1}>
                        <ChevronLeft size={16}/> Prev
                    </button>
                    <div className={s.pageJumper}>
                        <input className={s.pageInput} type="text" value={pageInputVal}
                            onChange={e=>setPageInputVal(e.target.value)}
                            onKeyDown={e=>{
                                if (e.key==="Enter") {
                                    const v=parseInt(pageInputVal);
                                    if (!isNaN(v)&&v>=1&&v<=pageCount) setCurrentPage(v);
                                    else setPageInputVal(String(currentPage));
                                    e.target.blur();
                                }
                            }}
                            onBlur={()=>{
                                const v=parseInt(pageInputVal);
                                if (!isNaN(v)&&v>=1&&v<=pageCount) setCurrentPage(v);
                                else setPageInputVal(String(currentPage));
                            }}
                        />
                        <span className={s.pageOf}>/ {pageCount}</span>
                    </div>
                    <button className={s.navBtn}
                        onClick={() => setCurrentPage(p=>Math.min(pageCount,p+1))} disabled={currentPage>=pageCount}>
                        Next <ChevronRight size={16}/>
                    </button>
                </div>
            )}
        </>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// PdfjsViewer — small PDFs via pdfjs-dist (original behaviour)
// ─────────────────────────────────────────────────────────────────────────────
function PdfjsViewer({ resourceId, watermarkText, scale, onPageChange }) {
    const [numPages, setNumPages]         = useState(0);
    const [currentPage, setCurrentPage]   = useState(1);
    const [pageInputVal, setPageInputVal] = useState("1");
    const [loading, setLoading]           = useState(true);
    const [pageLoading, setPageLoading]   = useState(false);
    const [error, setError]               = useState(null);

    const pdfDocRef      = useRef(null);
    const canvasRef      = useRef(null);
    const renderTaskRef  = useRef(null);

    useEffect(() => { setPageInputVal(String(currentPage)); }, [currentPage]);
    useEffect(() => { onPageChange({ currentPage, numPages }); }, [currentPage, numPages, onPageChange]);

    useEffect(() => {
        let cancelled = false;
        async function init() {
            try {
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                const resp = await fetch(`${API}/resources/${resourceId}/view`, { credentials: "include" });
                if (!resp.ok) throw new Error("Failed to load PDF. Check your access.");
                const pdfData = await resp.arrayBuffer();
                if (cancelled) return;
                const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
                if (cancelled) return;
                pdfDocRef.current = pdfDoc;
                setNumPages(pdfDoc.numPages);
                setLoading(false);
            } catch (err) {
                if (!cancelled) setError(err.message || "Failed to load document.");
            }
        }
        init();
        return () => { cancelled = true; };
    }, [resourceId]);

    const renderPage = useCallback(async (pageNum) => {
        if (!pdfDocRef.current || !canvasRef.current) return;
        if (renderTaskRef.current) { try { await renderTaskRef.current.cancel(); } catch {} }
        setPageLoading(true);
        try {
            const page     = await pdfDocRef.current.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const canvas   = canvasRef.current;
            const ctx      = canvas.getContext("2d");
            canvas.width   = viewport.width;
            canvas.height  = viewport.height;
            const renderTask = page.render({ canvasContext: ctx, viewport });
            renderTaskRef.current = renderTask;
            await renderTask.promise;
            drawWatermark(ctx, viewport.width, viewport.height, watermarkText, scale);
        } catch (err) {
            if (err?.name !== "RenderingCancelledException") console.error(err);
        } finally {
            setPageLoading(false);
        }
    }, [scale, watermarkText]);

    useEffect(() => { if (!loading) renderPage(currentPage); }, [currentPage, loading, renderPage]);

    useEffect(() => {
        const onKey = e => {
            if (e.key==="ArrowRight"||e.key==="ArrowDown") setCurrentPage(p=>Math.min(numPages,p+1));
            if (e.key==="ArrowLeft" ||e.key==="ArrowUp")   setCurrentPage(p=>Math.max(1,p-1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [numPages]);

    if (error) return <div className={s.errorPage}><p className={s.errorMsg}>{error}</p></div>;

    return (
        <>
            <div className={s.viewerArea}>
                {loading ? (
                    <div className={s.loader}><span className={s.spin}/><p>Loading document…</p></div>
                ) : (
                    <div className={s.canvasWrap}>
                        {pageLoading && <div className={s.pageSpinner}><span className={s.spin}/></div>}
                        <canvas ref={canvasRef} className={s.pdfCanvas}/>
                    </div>
                )}
            </div>

            {!loading && numPages > 1 && (
                <div className={s.navBar}>
                    <button className={s.navBtn}
                        onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage<=1}>
                        <ChevronLeft size={16}/> Prev
                    </button>
                    <div className={s.pageJumper}>
                        <input className={s.pageInput} type="text" value={pageInputVal}
                            onChange={e=>setPageInputVal(e.target.value)}
                            onKeyDown={e=>{
                                if (e.key==="Enter") {
                                    const v=parseInt(pageInputVal);
                                    if (!isNaN(v)&&v>=1&&v<=numPages) setCurrentPage(v);
                                    else setPageInputVal(String(currentPage));
                                    e.target.blur();
                                }
                            }}
                            onBlur={()=>{
                                const v=parseInt(pageInputVal);
                                if (!isNaN(v)&&v>=1&&v<=numPages) setCurrentPage(v);
                                else setPageInputVal(String(currentPage));
                            }}
                        />
                        <span className={s.pageOf}>/ {numPages}</span>
                    </div>
                    <button className={s.navBtn}
                        onClick={() => setCurrentPage(p=>Math.min(numPages,p+1))} disabled={currentPage>=numPages}>
                        Next <ChevronRight size={16}/>
                    </button>
                </div>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Violation toast (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const VIOLATION_MESSAGES = {
    print: "Printing is disabled to protect this content.",
    copy:  "Copying is disabled to protect this content.",
    save:  "Saving is disabled to protect this content.",
    devtools: "Developer tools are not allowed while viewing.",
    default:  "This action is not allowed while viewing notes.",
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
                    <p className={s.violationTitle}>Content Protection Notice</p>
                    <p className={s.violationMsg}>{message}</p>
                    <p className={s.violationSub}>
                        Repeated violations may result in suspension of your WowNotes subscription. Please respect our content guidelines.
                    </p>
                </div>
            </div>
            <button className={s.violationClose} onClick={onDismiss} aria-label="Dismiss">✕</button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell — top-level PDFViewer page
// ─────────────────────────────────────────────────────────────────────────────
export default function PDFViewer() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [resource, setResource]           = useState(null);
    const [loadingResource, setLoading]     = useState(true);
    const [error, setError]                 = useState(null);
    const [scale, setScale]                 = useState(1.4);
    const [violationMsg, setViolationMsg]   = useState(null);
    const [aiOpen, setAiOpen]               = useState(false);
    const [pageDisplay, setPageDisplay]     = useState({ current: 1, total: 0 });

    const pagedViewerRef = useRef(null);
    const toastTimerRef  = useRef(null);

    const showWarning = useCallback((type) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setViolationMsg(VIOLATION_MESSAGES[type] || VIOLATION_MESSAGES.default);
        toastTimerRef.current = setTimeout(() => setViolationMsg(null), 6000);
    }, []);

    const STORAGE_KEY = `wownotes_violations_${id}`;
    const trackViolation = useCallback((type) => {
        try {
            const raw  = localStorage.getItem(STORAGE_KEY);
            const data = raw ? JSON.parse(raw) : { total: 0, reported: false, breakdown: {} };
            if (data.reported) return;
            data.breakdown[type] = (data.breakdown[type] || 0) + 1;
            data.total = Object.values(data.breakdown).reduce((s,v) => s+v, 0);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            if (data.total >= 10) {
                data.reported = true;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                const violations = Object.entries(data.breakdown).map(([t,count]) => ({ type: t, count }));
                fetch(`${API}/admin/violation-report`, {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resourceId: id, resourceTitle: resource?.title || null, violations }),
                }).catch(() => {});
            }
        } catch {}
    }, [id, resource]);

    const warnAndTrack = useCallback((type) => {
        showWarning(type); trackViolation(type);
    }, [showWarning, trackViolation]);

    useSecurity(true, warnAndTrack);

    const watermarkText = user?.roll || user?.email?.split("@")[0] || "KIIT NOTES";

    // Block print / drag
    useEffect(() => {
        const blockPrint = e => {
            if ((e.ctrlKey||e.metaKey) && ["p","P","s","S"].includes(e.key) && (e.key==="p"||e.key==="P"||e.shiftKey))
                e.preventDefault();
        };
        const blockDrag = e => e.preventDefault();
        const hidePrint = () => { document.body.style.display = "none"; };
        const showPrint = () => { document.body.style.display = ""; };

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

    // Load resource metadata
    useEffect(() => {
        resourcesApi.getOne(id)
            .then(r => {
                setResource(r);
                if (r.type === "notes") setScale(0.7);
                if (r.storageMode === "pages")
                    setPageDisplay({ current: 1, total: r.pageCount || 0 });
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || "Failed to load document.");
                setLoading(false);
            });
    }, [id]);

    const handleJumpToPage = useCallback((pg) => {
        pagedViewerRef.current?.jumpToPage(pg);
    }, []);

    if (error) return (
        <div className={s.errorPage}>
            <p className={s.errorMsg}>{error}</p>
            <button className={s.backBtn} onClick={() => navigate("/resources")}>
                <ArrowLeft size={15}/> Back to Resources
            </button>
        </div>
    );

    const isPaged = resource?.storageMode === "pages";

    return (
        <div className={s.shell}>
            {/* ── Top bar ── */}
            <div className={s.topBar}>
                <button className={s.backBtn} onClick={() => window.close()}>
                    <ArrowLeft size={15}/> Close
                </button>
                <div className={s.docInfo}>
                    <span className={s.docTitle}>{loadingResource ? "Loading…" : resource?.title}</span>
                    {pageDisplay.total > 0 && (
                        <span className={s.pageCount}>Page {pageDisplay.current} / {pageDisplay.total}</span>
                    )}
                </div>
                <div className={s.topBarRight}>
                    <div className={s.zoomBtns}>
                        <button className={s.zoomBtn}
                            onClick={() => setScale(z => Math.max(0.7, +(z-0.2).toFixed(1)))} title="Zoom out">
                            <ZoomOut size={15}/>
                        </button>
                        <span className={s.zoomLabel}>{Math.round(scale*100)}%</span>
                        <button className={s.zoomBtn}
                            onClick={() => setScale(z => Math.min(3.0, +(z+0.2).toFixed(1)))} title="Zoom in">
                            <ZoomIn size={15}/>
                        </button>
                    </div>

                    {/* AI toggle button */}
                    <button
                        className={`${s.aiToggleBtn} ${aiOpen ? s.aiToggleBtnActive : ""}`}
                        onClick={() => setAiOpen(v => !v)}
                        title={aiOpen ? "Close AI Assistant" : "Open AI Assistant"}
                    >
                        <Sparkles size={14}/>
                        <span>AI</span>
                    </button>
                </div>
            </div>

            {/* ── Main area: viewer + optional AI panel side by side ── */}
            <div className={s.mainArea}>
                {/* Viewer column */}
                <div className={s.viewerColumn}>
                    {loadingResource ? (
                        <div className={s.loader}><span className={s.spin}/><p>Loading document…</p></div>
                    ) : isPaged ? (
                        <PagedViewer
                            ref={pagedViewerRef}
                            resourceId={resource._id}
                            pageCount={resource.pageCount}
                            watermarkText={watermarkText}
                            scale={scale}
                            onPageChange={current => setPageDisplay(d => ({ ...d, current }))}
                        />
                    ) : (
                        <PdfjsViewer
                            resourceId={resource._id}
                            watermarkText={watermarkText}
                            scale={scale}
                            onPageChange={({ currentPage, numPages }) =>
                                setPageDisplay({ current: currentPage, total: numPages })
                            }
                        />
                    )}
                </div>

                {/* AI Panel */}
                {aiOpen && (
                    <div className={s.aiPanel}>
                        <div className={s.aiPanelTopBar}>
                            <div className={s.aiPanelTitle}>
                                <Sparkles size={13} className={s.aiPanelTitleIcon}/>
                                AI Assistant
                            </div>
                            <button className={s.aiPanelClose} onClick={() => setAiOpen(false)} title="Close">
                                <X size={15}/>
                            </button>
                        </div>

                        {!loadingResource && (
                            <GeminiPanel
                                resourceId={resource?._id}
                                currentPage={pageDisplay.current}
                                pageCount={pageDisplay.total}
                                onJumpToPage={handleJumpToPage}
                                isPaged={isPaged}
                            />
                        )}
                    </div>
                )}
            </div>

            {violationMsg && (
                <ViolationToast message={violationMsg} onDismiss={() => setViolationMsg(null)}/>
            )}
        </div>
    );
}