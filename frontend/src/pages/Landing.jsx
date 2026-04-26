import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { contactApi } from "../services/api";
import Footer from "../components/Footer";
import WowNotesLogo from "../components/WowNotesLogo";
import s from "./Landing.module.css";

// ── Typing challenge sentences (academic flavour) ─────────────────────────────
const SENTENCES = [
    "The derivative of sin(x) is cos(x) and that's non-negotiable.",
    "Normalization removes redundancy from relational database schemas.",
    "Newton's second law states force equals mass times acceleration.",
    "A binary tree has at most two children per node.",
    "Kirchhoff's voltage law says the sum of voltages in a loop is zero.",
    "Object-oriented programming encapsulates data within class structures.",
    "The time complexity of quicksort is O(n log n) on average.",
    "Photosynthesis converts carbon dioxide and water into glucose.",
];

function pick() {
    return SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
}

// ── TPP animation phases ───────────────────────────────────────────────────────
export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // TPP anim
    const [phase, setPhase] = useState("idle");
    const [showFull, setShowFull] = useState(false);
    const [showBody, setShowBody] = useState(false);

    // Contact Us
    const CONTACT_TAGS = [
        "bug",
        "payment",
        "resources",
        "feature-request",
        "account",
        "other",
    ];
    const [ctMsg, setCtMsg] = useState("");
    const [ctTags, setCtTags] = useState([]);
    const [ctStatus, setCtStatus] = useState("idle"); // idle | loading | success | error
    const [ctError, setCtError] = useState("");

    const toggleCtTag = (tag) =>
        setCtTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );

    const handleContactSubmit = useCallback(async () => {
        if (!ctMsg.trim() || ctMsg.trim().length < 10) {
            setCtError("Please write at least 10 characters.");
            return;
        }
        setCtStatus("loading");
        setCtError("");
        try {
            await contactApi.send({
                message: ctMsg.trim(),
                tags: ctTags,
                senderEmail: user?.email,
            });
            setCtStatus("success");
        } catch (err) {
            setCtStatus("error");
            setCtError(
                err?.response?.data?.error || "Failed to send. Try again.",
            );
        }
    }, [ctMsg, ctTags, user]);

    // Typing game
    const [sentence, setSentence] = useState(pick);
    const [typed, setTyped] = useState("");
    const [startTime, setStartTime] = useState(null);
    const [wpm, setWpm] = useState(null);
    const [acc, setAcc] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [errors, setErrors] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (user)
            navigate(user.course ? "/dashboard" : "/onboarding", {
                replace: true,
            });
    }, [user, navigate]);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("pulse"), 350);
        const t2 = setTimeout(() => setPhase("expand"), 900);
        const t3 = setTimeout(() => setShowFull(true), 1250);
        const t4 = setTimeout(() => setPhase("done"), 1900);
        const t5 = setTimeout(() => setShowBody(true), 2100);
        return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
    }, []);

    // ── Typing logic ──────────────────────────────────────────────────────────
    const handleType = useCallback(
        (e) => {
            const val = e.target.value;
            if (gameOver) return;
            if (!startTime && val.length === 1) setStartTime(Date.now());

            // count errors
            let errs = 0;
            for (let i = 0; i < val.length; i++) {
                if (val[i] !== sentence[i]) errs++;
            }
            setErrors(errs);
            setTyped(val);

            if (val.length === sentence.length) {
                const elapsed = (Date.now() - startTime) / 60000;
                const words = sentence.trim().split(" ").length;
                const calcWpm = Math.round(words / elapsed);
                const calcAcc = Math.round(
                    ((sentence.length - errs) / sentence.length) * 100,
                );
                setWpm(calcWpm);
                setAcc(calcAcc);
                setGameOver(true);
            }
        },
        [gameOver, startTime, sentence],
    );

    const resetGame = () => {
        setSentence(pick());
        setTyped("");
        setStartTime(null);
        setWpm(null);
        setAcc(null);
        setGameOver(false);
        setErrors(0);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    // Render typed chars with colour
    const renderSentence = () => {
        return sentence.split("").map((ch, i) => {
            let cls = s.charPending;
            if (i < typed.length) cls = typed[i] === ch ? s.charOk : s.charErr;
            else if (i === typed.length) cls = s.charCursor;
            return (
                <span key={i} className={cls}>
                    {ch}
                </span>
            );
        });
    };

    return (
        <div className={s.root}>
            <div className={s.bgGrid} />
            <div className={s.bgVignette} />
            <div className={s.bgGlow} />
            {[...Array(12)].map((_, i) => (
                <span key={i} className={s.particle} style={{ "--i": i }} />
            ))}

            {/* ── Hero ── */}
            <div className={`${s.hero} ${phase === "done" ? s.heroRisen : ""}`}>
                <div className={`${s.acronym} ${s["phase_" + phase]}`}>
                    <span className={s.chunk}>
                        <span className={s.letter}>T</span>
                        <span
                            className={`${s.exp} ${showFull ? s.expIn : ""}`}
                            style={{ "--d": "0ms" }}
                        >
                            hird-person's
                        </span>
                    </span>
                    <span className={`${s.ws} ${showFull ? s.wsIn : ""}`}>
                        &nbsp;
                    </span>
                    <span className={s.chunk}>
                        <span className={s.letter}>P</span>
                        <span
                            className={`${s.exp} ${showFull ? s.expIn : ""}`}
                            style={{ "--d": "60ms" }}
                        >
                            erspective
                        </span>
                    </span>
                    <span className={`${s.ws} ${showFull ? s.wsIn : ""}`}>
                        &nbsp;
                    </span>
                    <span className={s.chunk}>
                        <span className={s.letter}>P</span>
                        <span
                            className={`${s.exp} ${showFull ? s.expIn : ""}`}
                            style={{ "--d": "120ms" }}
                        >
                            lay
                        </span>
                    </span>
                </div>

                <h1
                    className={`${s.heading} ${phase === "done" ? s.headingIn : ""}`}
                >
                    <span className={s.h1}>Wow</span>
                    <span className={s.h2}>Notes</span>
                </h1>
                <p
                    className={`${s.tagline} ${phase === "done" ? s.taglineIn : ""}`}
                >
                    Secure academic notes for KIIT students.
                </p>
            </div>

            {/* ── Body: game + login ── */}
            <div className={`${s.body} ${showBody ? s.bodyIn : ""}`}>
                {/* Typing Game */}
                <div className={s.gameCard}>
                    <div className={s.gameHeader}>
                        <span className={s.gameTitle}>⌨ Typing Challenge</span>
                        <span className={s.gameHint}>
                            Free feature — no login needed
                        </span>
                    </div>

                    <div
                        className={s.sentenceBox}
                        onClick={() => inputRef.current?.focus()}
                    >
                        {renderSentence()}
                    </div>

                    <input
                        ref={inputRef}
                        className={s.typeInput}
                        value={typed}
                        onChange={handleType}
                        placeholder="Start typing here…"
                        disabled={gameOver}
                        spellCheck={false}
                        autoComplete="off"
                    />

                    {/* Progress bar */}
                    <div className={s.progressBar}>
                        <div
                            className={s.progressFill}
                            style={{
                                width: `${(typed.length / sentence.length) * 100}%`,
                            }}
                        />
                    </div>

                    {/* Stats row */}
                    <div className={s.statsRow}>
                        <span className={s.stat}>
                            <span className={s.statLabel}>chars</span>
                            <span className={s.statVal}>
                                {typed.length}/{sentence.length}
                            </span>
                        </span>
                        <span className={s.stat}>
                            <span className={s.statLabel}>errors</span>
                            <span
                                className={`${s.statVal} ${errors > 0 ? s.statErr : ""}`}
                            >
                                {errors}
                            </span>
                        </span>
                        {wpm !== null && (
                            <>
                                <span className={s.stat}>
                                    <span className={s.statLabel}>WPM</span>
                                    <span className={s.statVal}>{wpm}</span>
                                </span>
                                <span className={s.stat}>
                                    <span className={s.statLabel}>
                                        accuracy
                                    </span>
                                    <span
                                        className={`${s.statVal} ${acc < 80 ? s.statErr : s.statGood}`}
                                    >
                                        {acc}%
                                    </span>
                                </span>
                            </>
                        )}
                    </div>

                    {gameOver && (
                        <div className={s.result}>
                            <span>
                                {wpm >= 60
                                    ? "🔥 Impressive!"
                                    : wpm >= 40
                                      ? "👍 Good job!"
                                      : "📚 Keep practising!"}
                            </span>
                            <button className={s.retryBtn} onClick={resetGame}>
                                Try again
                            </button>
                        </div>
                    )}
                </div>

                {/* Login card */}
                <div className={s.loginCard}>
                    <div className={s.badge}>
                        <span className={s.dot} />
                        KIIT University · @kiit.ac.in only
                    </div>
                    <p className={s.loginText}>
                        Sign in to access your notes and resources.
                    </p>
                    <a href="/api/auth/google" className={s.btn}>
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </a>
                    <div className={s.packList}>
                        <p className={s.packTitle}>Subscription packs</p>
                        <div className={s.packs}>
                            <div className={s.pack}>
                                <span className={s.packName}>Semester</span>
                                <span className={s.packDesc}>1 sem access</span>
                            </div>
                            <div className={s.pack}>
                                <span className={s.packName}>Year</span>
                                <span className={s.packDesc}>
                                    2 sems access
                                </span>
                            </div>
                            <div className={`${s.pack} ${s.packFeatured}`}>
                                <span className={s.packName}>Full Course</span>
                                <span className={s.packDesc}>
                                    All sems · best value
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className={s.fine}>
                        <WowNotesLogo variant="icon" style={{ width: 16, height: 16, verticalAlign: 'middle', display: 'inline-block' }} /> · WowNotes · KIIT exclusive
                    </p>
                </div>
            </div>
            {/* ── Contact Us ── */}
            <div
                className={`${s.contactSection} ${showBody ? s.contactIn : ""}`}
            >
                <div className={s.contactCard}>
                    <div className={s.contactHeader}>
                        <span className={s.contactTitle}>✉ Contact Us</span>
                        <span className={s.contactSub}>
                            We read every message
                        </span>
                    </div>

                    {ctStatus === "success" ? (
                        <div className={s.contactSuccess}>
                            <span className={s.contactSuccessIcon}>✓</span>
                            <p className={s.contactSuccessText}>
                                Message received! We'll get back to you soon.
                            </p>
                            <button
                                className={s.retryBtn}
                                onClick={() => {
                                    setCtMsg("");
                                    setCtTags([]);
                                    setCtStatus("idle");
                                }}
                            >
                                Send another
                            </button>
                        </div>
                    ) : (
                        <>
                            <textarea
                                className={s.contactTextarea}
                                placeholder="Describe your issue or question…"
                                value={ctMsg}
                                onChange={(e) => {
                                    setCtMsg(e.target.value);
                                    setCtError("");
                                }}
                                rows={3}
                                maxLength={2000}
                                disabled={ctStatus === "loading"}
                            />

                            <div className={s.contactTags}>
                                {CONTACT_TAGS.map((tag) => (
                                    <button
                                        key={tag}
                                        className={`${s.contactTag} ${ctTags.includes(tag) ? s.contactTagOn : ""}`}
                                        onClick={() => toggleCtTag(tag)}
                                        disabled={ctStatus === "loading"}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>

                            {ctError && (
                                <p className={s.contactError}>{ctError}</p>
                            )}

                            <button
                                className={s.contactSubmit}
                                onClick={handleContactSubmit}
                                disabled={
                                    ctStatus === "loading" || !ctMsg.trim()
                                }
                            >
                                {ctStatus === "loading"
                                    ? "Sending…"
                                    : "Send message →"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}