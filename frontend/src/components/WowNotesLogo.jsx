/**
 * WowNotesLogo
 *
 * variant="icon"     — just the book+star mark, no text (collapsed sidebar)
 * variant="wordmark" — icon mark + "WowNotes" text side by side (footer, expanded sidebar)
 * variant="full"     — the complete card with tagline (login hero, landing)
 */
export default function WowNotesLogo({ variant = "wordmark", style, className, onClick }) {

    // ── Shared defs used by all variants ──────────────────────────────────────
    const Defs = () => (
        <defs>
            <linearGradient id="wn-pageL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#1e2d42" />
                <stop offset="100%" stopColor="#162032" />
            </linearGradient>
            <linearGradient id="wn-pageR" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#243348" />
                <stop offset="100%" stopColor="#1a2840" />
            </linearGradient>
            <linearGradient id="wn-spine" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#fef08a" />
                <stop offset="55%"  stopColor="#facc15" />
                <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="wn-star" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#fef9c3" />
                <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
            <linearGradient id="wn-card" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#13151e" />
                <stop offset="100%" stopColor="#0a0c12" />
            </linearGradient>
            <filter id="wn-glow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
    );

    // ── The book+star mark (reused in every variant) ──────────────────────────
    // Drawn around origin (0,0); caller translates to centre it.
    const BookMark = () => (
        <g>
            {/* Left page shadow + page */}
            <path d="M-9,-68 Q-44,-63 -57,-32 Q-60,2 -53,34 Q-40,50 -9,50 L-9,-68Z" fill="#0a0c12" opacity="0.35" />
            <path d="M-8,-66 Q-42,-61 -55,-30 Q-58,2 -51,33 Q-38,48 -8,48 L-8,-66Z" fill="url(#wn-pageL)" />
            {/* Right page shadow + page */}
            <path d="M9,-68 Q44,-63 57,-32 Q60,2 53,34 Q40,50 9,50 L9,-68Z"  fill="#0a0c12" opacity="0.25" />
            <path d="M8,-66 Q42,-61 55,-30 Q58,2 51,33 Q38,48 8,48 L8,-66Z"  fill="url(#wn-pageR)" />
            {/* Left page lines */}
            <line x1="-46" y1="-22" x2="-14" y2="-27" stroke="#3d5470" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="-48" y1="-6"  x2="-14" y2="-10" stroke="#3d5470" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="-48" y1="10"  x2="-14" y2="8"   stroke="#3d5470" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="-46" y1="26"  x2="-14" y2="26"  stroke="#2d3f55" strokeWidth="1.6" strokeLinecap="round" />
            {/* Right page lines */}
            <line x1="14" y1="-27" x2="46" y2="-22" stroke="#455f7a" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="14" y1="-10" x2="48" y2="-6"  stroke="#455f7a" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="14" y1="8"   x2="48" y2="10"  stroke="#455f7a" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="14" y1="26"  x2="46" y2="26"  stroke="#354d66" strokeWidth="1.6" strokeLinecap="round" />
            {/* Spine glow + spine */}
            <rect x="-9" y="-66" width="18" height="114" rx="9" fill="#facc15" opacity="0.12" filter="url(#wn-glow)" />
            <rect x="-5.5" y="-66" width="11" height="114" rx="5.5" fill="url(#wn-spine)" />
            {/* Bookmark ribbon */}
            <path d="M2.5,-30 L-3,0 L2,0 L-3,32" fill="none" stroke="#0a0c12" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            {/* Spine top highlight */}
            <ellipse cx="0" cy="-66" rx="5.5" ry="3" fill="#fef08a" opacity="0.7" />
            {/* Drop shadow */}
            <ellipse cx="0" cy="54" rx="44" ry="6" fill="#000" opacity="0.22" />
            {/* Star glow halo */}
            <circle cx="0" cy="-92" r="14" fill="#facc15" opacity="0.1" />
            {/* Star */}
            <path d="M0,-104 Q3,-93 13,-90 Q3,-87 0,-76 Q-3,-87 -13,-90 Q-3,-93 0,-104Z" fill="url(#wn-star)" />
            {/* Starburst tick marks */}
            <line x1="0"   y1="-113" x2="0"   y2="-108" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="0"   y1="-72"  x2="0"   y2="-77"  stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="19"  y1="-90"  x2="15"  y2="-90"  stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="-19" y1="-90"  x2="-15" y2="-90"  stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="15"  y1="-104" x2="12"  y2="-101" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            <line x1="-15" y1="-104" x2="-12" y2="-101" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            <line x1="15"  y1="-76"  x2="12"  y2="-79"  stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            <line x1="-15" y1="-76"  x2="-12" y2="-79"  stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        </g>
    );

    // ── variant="icon" ────────────────────────────────────────────────────────
    // 36×36 px — just the mark on a dark rounded-square, no text.
    // Use in the collapsed sidebar.
    if (variant === "icon") {
        return (
            <svg
                width="36" height="36"
                viewBox="-72 -116 144 176"
                xmlns="http://www.w3.org/2000/svg"
                style={style} className={className}
                onClick={onClick}
            >
                <Defs />
                <rect x="-72" y="-116" width="144" height="176" rx="12" fill="url(#wn-card)" />
                <rect x="-72" y="-116" width="144" height="176" rx="12" fill="none" stroke="#facc15" strokeWidth="1.2" opacity="0.2" />
                <BookMark />
            </svg>
        );
    }

    // ── variant="wordmark" ────────────────────────────────────────────────────
    // Icon mark + "WowNotes" text side by side. Fits the sidebar & footer.
    if (variant === "wordmark") {
        return (
            <svg
                width="148" height="36"
                viewBox="0 0 148 36"
                xmlns="http://www.w3.org/2000/svg"
                style={style} className={className}
                onClick={onClick}
            >
                <Defs />
                {/* Icon tile */}
                <rect x="0" y="0" width="36" height="36" rx="8" fill="url(#wn-card)" />
                <rect x="0" y="0" width="36" height="36" rx="8" fill="none" stroke="#facc15" strokeWidth="0.8" opacity="0.22" />
                <g transform="translate(18,22)">
                    <BookMark />
                </g>
                {/* Wordmark text */}
                <text
                    x="46" y="24"
                    fontFamily="'DM Serif Display', Georgia, serif"
                    fontSize="20"
                    fontWeight="400"
                    fill="#f0ede6"
                    letterSpacing="0.3"
                >
                    WowNotes
                </text>
            </svg>
        );
    }

    // ── variant="full" ────────────────────────────────────────────────────────
    // The complete card with tagline. Use on Login / Landing.
    return (
        <svg
            width="100%" viewBox="0 0 680 380"
            xmlns="http://www.w3.org/2000/svg"
            style={style} className={className}
            onClick={onClick}
        >
            <Defs />
            <rect x="190" y="20"  width="300" height="320" rx="44" fill="url(#wn-card)" />
            <rect x="190" y="20"  width="300" height="320" rx="44" fill="none" stroke="#facc15" strokeWidth="0.9" opacity="0.22" />
            <g transform="translate(340,158)">
                <BookMark />
            </g>
            <text x="340" y="285" fontFamily="'DM Serif Display', Georgia, serif" fontSize="33" fontWeight="400" textAnchor="middle" fill="#f0ede6" letterSpacing="0.5">WowNotes</text>
            <rect x="284" y="292" width="112" height="2.2" rx="1.1" fill="#facc15" opacity="0.7" />
            <text x="340" y="317" fontFamily="'DM Sans', system-ui, sans-serif" fontSize="10.5" fontWeight="500" letterSpacing="4" textAnchor="middle" fill="#6b6357">STUDY SMARTER</text>
        </svg>
    );
}