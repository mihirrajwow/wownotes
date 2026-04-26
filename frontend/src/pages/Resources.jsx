import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSecurity } from "../hooks/useSecurity";
import { resourcesApi, curriculumApi } from "../services/api";
import AppShell from "../components/AppShell";
import {
    Search,
    X,
    Lock,
    FileText,
    BookOpen,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Presentation,
    SlidersHorizontal,
} from "lucide-react";
import s from "./Resources.module.css";

const PROGRAMMES = [
    { id: "btech", label: "B.Tech", sems: 8 },
    { id: "btech_lateral", label: "B.Tech (Lateral)", sems: 6 },
    { id: "mba", label: "MBA", sems: 4 },
    { id: "mca", label: "MCA", sems: 4 },
    { id: "bsc_nursing", label: "B.Sc Nursing", sems: 8 },
    { id: "ballb", label: "BA/BBA/B.Sc LLB", sems: 10 },
    { id: "bba", label: "BBA", sems: 6 },
    { id: "bca", label: "BCA", sems: 6 },
    { id: "bsc", label: "B.Sc", sems: 6 },
    { id: "barch", label: "B.Architecture", sems: 10 },
    { id: "bdes", label: "B.Design", sems: 8 },
    { id: "bpharma", label: "B.Pharma", sems: 8 },
    { id: "bcom", label: "B.Com", sems: 6 },
    { id: "ba", label: "B.A", sems: 6 },
    { id: "biotech_dual", label: "Biotech Dual (B+M)", sems: 10 },
];

const TYPES = ["notes", "assignment", "syllabus", "pyq", "ppt", "other"];
const PYQ_YEARS = Array.from({ length: new Date().getFullYear() - 2010 + 1 }, (_, i) => new Date().getFullYear() - i);
const SOURCES = [
    "classroom",
    "library",
    "internet",
    "student",
    "faculty",
    "other",
];
const BRANCHES = [
    "Civil Engineering",
    "Construction Technology",
    "Mechanical Engineering",
    "Mechanical Engineering (Automobile)",
    "Aerospace Engineering",
    "Mechatronics Engineering",
    "Electrical Engineering",
    "Electrical and Computer Engineering",
    "Electronics & Tele-Communication Engineering",
    "Electronics & Electrical Engineering",
    "Electronics and Computer Science Engineering",
    "Electronics Engineering VLSI Design and Technology",
    "Electronics and Instrumentation",
    "Computer Science & Engineering",
    "Computer Science & Communication Engineering",
    "CSE (Artificial Intelligence)",
    "CSE (Cyber Security)",
    "CSE (Data Science)",
    "CSE (IoT and Cyber Security Including Block Chain Technology)",
    "CSE (Internet of Things)",
    "Computer Science & Systems Engineering",
    "CSE (Artificial Intelligence and Machine Learning)",
    "Information Technology",
    "Chemical Engineering",
    "Other",
];
const TYPE_COLORS = {
    notes: "sky",
    midsem: "amber",
    endsem: "rose",
    ppt: "pink",
    pyq: "violet",
    assignment: "emerald",
    syllabus: "default",
    other: "default",
};

// Display order and labels for resource groups
const TYPE_ORDER = ["notes", "ppt", "syllabus", "assignment", "pyq", "other"];
const TYPE_LABELS = {
    notes: "Notes",
    syllabus: "Syllabus",
    assignment: "Assignments",
    ppt: "Presentations",
    pyq: "Previous Year Questions",
    other: "Other",
};

// Sort within each type group
function sortGroup(resources, type) {
    if (type === "pyq") {
        // PYQs: newest year first, then by exam type order, then upload date
        const examOrder = { midsem: 0, "make-up midsem": 1, endsem: 2, supplementary: 3 };
        return [...resources].sort((a, b) => {
            if ((b.pyqYear || 0) !== (a.pyqYear || 0))
                return (b.pyqYear || 0) - (a.pyqYear || 0);
            const ea = examOrder[a.pyqExamType] ?? 99;
            const eb = examOrder[b.pyqExamType] ?? 99;
            if (ea !== eb) return ea - eb;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }
    // Others: priority desc, then upload date desc
    return [...resources].sort(
        (a, b) => (b.priority || 0) - (a.priority || 0) || new Date(b.createdAt) - new Date(a.createdAt),
    );
}

// Group and sort resources by type in TYPE_ORDER
function groupResources(resources) {
    const map = {};
    for (const r of resources) {
        const key = TYPE_ORDER.includes(r.type) ? r.type : "other";
        if (!map[key]) map[key] = [];
        map[key].push(r);
    }
    return TYPE_ORDER.filter((t) => map[t]?.length > 0).map((t) => ({
        type: t,
        label: TYPE_LABELS[t],
        items: sortGroup(map[t], t),
    }));
}

// For PPT: group individual resources by subject into subject-cards
function groupPptsBySubject(ppts) {
    const map = {};
    for (const r of ppts) {
        const key = r.subject || "Unknown Subject";
        if (!map[key]) map[key] = [];
        map[key].push(r);
    }
    return Object.entries(map)
        .map(([subject, items]) => ({ subject, items }))
        .sort((a, b) => a.subject.localeCompare(b.subject));
}

function timeAgo(d) {
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days < 1) return "today";
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });
}

function FilterSection({ label, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={s.filterSection}>
            <button
                className={s.filterSectionHead}
                onClick={() => setOpen((o) => !o)}
            >
                <span className={s.filterSectionLabel}>{label}</span>
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {open && <div className={s.filterSectionBody}>{children}</div>}
        </div>
    );
}

function Pill({ active, locked, onClick, children }) {
    return (
        <button
            className={`${s.pill} ${active ? s.pillOn : ""} ${locked ? s.pillLocked : ""}`}
            onClick={onClick}
        >
            {locked && <Lock size={9} />}
            {children}
        </button>
    );
}

export default function Resources() {
    useSecurity(true);
    const { user, hasAccess } = useAuth();
    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        course: user?.course || "",
        semester: user?.currentSemester || "",
        branch:
            BRANCHES.find(
                (b) => b.toLowerCase() === (user?.branch || "").toLowerCase(),
            ) || "",
        year: "",
        pyqYear: "",
        subject: "",
        faculty: "",
        source: "",
        type: "",
        exam: "",
        search: "",
        free: "",
    });

    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [selectedPptGroup, setSelectedPptGroup] = useState(null); // { subject, items, slideIdx }
    const [subjects, setSubjects] = useState([]);
    const [sidebarOpen, setSidebar] = useState(true);

    const semCount = PROGRAMMES.find((p) => p.id === filters.course)?.sems || 8;

    const yearCount = Math.ceil(semCount / 2);

    // Fetch subjects from curriculum for the subject filter pills.
    // Subject pills — match the backend's per-type curriculum rules:
    //   "other"  → no subject gate, so no pills needed
    //   "pyq"    → all subjects across every semester of the branch
    //   rest     → subjects for the selected semester only
    useEffect(() => {
        const t = filters.type;
        if (t === "other") {
            setSubjects([]);
        } else if (t === "pyq" && filters.course && filters.branch) {
            curriculumApi
                .getAllSubjects(filters.course, filters.branch)
                .then(setSubjects)
                .catch(() => setSubjects([]));
        } else if (t !== "pyq" && filters.course && filters.branch && filters.semester) {
            curriculumApi
                .getSubjects(filters.course, filters.branch, filters.semester)
                .then(setSubjects)
                .catch(() => setSubjects([]));
        } else {
            setSubjects([]);
        }
        setFilters((f) => ({ ...f, subject: "" }));
    }, [filters.course, filters.branch, filters.semester, filters.type]);

    const loadResources = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            Object.entries(filters).forEach(([k, v]) => {
                if (v !== "") params[k] = v;
            });

            // Curriculum-aware mode:
            // - For PYQ: semester is irrelevant, only course + branch needed.
            // - For other types: course + branch + semester are all required.
            // In both cases we send `byCurriculum=true` so the backend knows to
            // use curriculum subject matching instead of raw field filters.
            const isPyq = filters.type === "pyq";
            if (isPyq && (filters.branch || user?.branch)) {
                if (!params.course && user?.course) params.course = user.course;
                if (!params.branch && user?.branch) params.branch = user.branch;
                if (params.course && params.branch) params.byCurriculum = "true";
            } else if (filters.course && filters.branch && filters.semester) {
                params.byCurriculum = "true";
            }

            setResources(await resourcesApi.getAll(params));
        } catch {
            setResources([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const t = setTimeout(loadResources, filters.search ? 320 : 0);
        return () => clearTimeout(t);
    }, [loadResources, filters.search]);

    const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

    const clearFilters = () =>
        setFilters({
            course: user?.course || "",
            semester: "",
            branch:
                BRANCHES.find(
                    (b) =>
                        b.toLowerCase() === (user?.branch || "").toLowerCase(),
                ) || "",
            year: "",
            pyqYear: "",
            subject: "",
            faculty: "",
            source: "",
            type: "",
            exam: "",
            search: "",
            free: "",
        });

    const activeCount = Object.entries(filters).filter(
        ([k, v]) => v !== "" && !["course", "search"].includes(k),
    ).length;

    const isBtech =
        filters.course === "btech" || filters.course === "btech_lateral";

    return (
        <AppShell>
            <div className={s.page}>
                {/* Top bar */}
                <div className={s.topBar}>
                    <div className={s.topLeft}>
                        <h1 className={s.title}>Resources</h1>
                        <span className={s.resultCount}>
                            {resources.length} result
                            {resources.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className={s.topRight}>
                        <div className={s.searchWrap}>
                            <Search size={14} className={s.searchIcon} />
                            <input
                                className={s.searchInput}
                                placeholder="Search title, subject…"
                                value={filters.search}
                                onChange={(e) => setF("search", e.target.value)}
                            />
                            {filters.search && (
                                <button
                                    className={s.clearX}
                                    onClick={() => setF("search", "")}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <button
                            className={`${s.sidebarToggle} ${sidebarOpen ? s.sidebarToggleOn : ""}`}
                            onClick={() => setSidebar((o) => !o)}
                        >
                            <SlidersHorizontal size={14} />
                            Filters
                            {activeCount > 0 && (
                                <span className={s.activeBadge}>
                                    {activeCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className={`${s.body} ${sidebarOpen ? s.bodyOpen : ""}`}>
                    {/* Sidebar */}
                    {sidebarOpen && (
                        <aside className={s.sidebar}>
                            <div className={s.sidebarHeader}>
                                <span className={s.sidebarTitle}>
                                    <SlidersHorizontal size={13} /> Filters
                                </span>
                                {activeCount > 0 && (
                                    <button
                                        className={s.clearBtn}
                                        onClick={clearFilters}
                                    >
                                        Clear {activeCount}
                                    </button>
                                )}
                            </div>

                            {/* Programme */}
                            <FilterSection
                                label="Programme"
                                defaultOpen={false}
                            >
                                <div className={s.pills}>
                                    <Pill
                                        active={filters.course === ""}
                                        onClick={() => {
                                            setF("course", "");
                                            setF("semester", "");
                                            setF("branch", "");
                                        }}
                                    >
                                        All
                                    </Pill>
                                    {PROGRAMMES.map((p) => {
                                        const locked =
                                            user?.role !== "admin" &&
                                            user?.course !== p.id;
                                        return (
                                            <Pill
                                                key={p.id}
                                                active={filters.course === p.id}
                                                locked={locked}
                                                onClick={() => {
                                                    if (locked) return;
                                                    setF("course", p.id);
                                                    setF("semester", "");
                                                    setF("branch", "");
                                                }}
                                            >
                                                {p.label}
                                            </Pill>
                                        );
                                    })}
                                </div>
                            </FilterSection>

                            {/* Semester — hidden for PYQ since they are semester-agnostic */}
                            {filters.course && filters.type !== "pyq" && filters.type !== "other" && (
                                <FilterSection label="Semester">
                                    <div className={s.pills}>
                                        <Pill
                                            active={filters.semester === ""}
                                            onClick={() => setF("semester", "")}
                                        >
                                            All
                                        </Pill>
                                        {Array.from(
                                            { length: semCount },
                                            (_, i) => i + 1,
                                        ).map((n) => {
                                            const locked = !hasAccess(
                                                filters.course,
                                                n,
                                            );
                                            return (
                                                <Pill
                                                    key={n}
                                                    active={
                                                        filters.semester == n
                                                    }
                                                    locked={locked}
                                                    onClick={() =>
                                                        setF("semester", n)
                                                    }
                                                >
                                                    Sem {n}
                                                </Pill>
                                            );
                                        })}
                                    </div>
                                </FilterSection>
                            )}

                            {/* Type */}
                            <FilterSection label="Type">
                                <div className={s.pills}>
                                    <Pill
                                        active={filters.type === ""}
                                        onClick={() => setF("type", "")}
                                    >
                                        All
                                    </Pill>
                                    {TYPES.map((t) => (
                                        <Pill
                                            key={t}
                                            active={filters.type === t}
                                            onClick={() => {
                                                setF("type", t);
                                                // pyq and other are semester-agnostic — clear semester
                                                const noSem = ["pyq", "other"];
                                                if (noSem.includes(t) || noSem.includes(filters.type)) setF("semester", "");
                                                // clear pyqYear when leaving pyq
                                                if (t !== "pyq") setF("pyqYear", "");
                                            }}
                                        >
                                            {t}
                                        </Pill>
                                    ))}
                                </div>
                            </FilterSection>

                            {/* Exam */}
                            <FilterSection label="Exam" defaultOpen={false}>
                                <div className={s.pills}>
                                    <Pill
                                        active={filters.exam === ""}
                                        onClick={() => setF("exam", "")}
                                    >
                                        All
                                    </Pill>
                                    <Pill
                                        active={filters.exam === "midsem"}
                                        onClick={() => setF("exam", "midsem")}
                                    >
                                        Midsem
                                    </Pill>
                                    <Pill
                                        active={filters.exam === "endsem"}
                                        onClick={() => setF("exam", "endsem")}
                                    >
                                        Endsem
                                    </Pill>
                                </div>
                            </FilterSection>

                            {/* Source */}
                            <FilterSection label="Source" defaultOpen={false}>
                                <div className={s.pills}>
                                    <Pill
                                        active={filters.source === ""}
                                        onClick={() => setF("source", "")}
                                    >
                                        All
                                    </Pill>
                                    {SOURCES.map((src) => (
                                        <Pill
                                            key={src}
                                            active={filters.source === src}
                                            onClick={() => setF("source", src)}
                                        >
                                            {src}
                                        </Pill>
                                    ))}
                                </div>
                            </FilterSection>

                            {/* Access */}
                            <FilterSection label="Access">
                                <div className={s.pills}>
                                    <Pill
                                        active={filters.free === ""}
                                        onClick={() => setF("free", "")}
                                    >
                                        All
                                    </Pill>
                                    <Pill
                                        active={filters.free === "true"}
                                        onClick={() => setF("free", "true")}
                                    >
                                        Free only
                                    </Pill>
                                </div>
                            </FilterSection>

                            {/* Subject — smart pills from curriculum */}
                            <FilterSection label="Subject" defaultOpen={true}>
                                {subjects.length > 0 ? (
                                    <div className={s.pills}>
                                        <Pill
                                            active={filters.subject === ""}
                                            onClick={() => setF("subject", "")}
                                        >
                                            All
                                        </Pill>
                                        {subjects.map((subj) => (
                                            <Pill
                                                key={subj.name}
                                                active={
                                                    filters.subject ===
                                                    subj.name
                                                }
                                                onClick={() =>
                                                    setF("subject", subj.name)
                                                }
                                            >
                                                {subj.shortName || subj.name}
                                            </Pill>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        className={s.textFilter}
                                        placeholder={
                                            filters.course &&
                                            filters.branch &&
                                            filters.semester
                                                ? "No subjects added yet"
                                                : "Select programme, branch & sem"
                                        }
                                        value={filters.subject}
                                        onChange={(e) =>
                                            setF("subject", e.target.value)
                                        }
                                    />
                                )}
                            </FilterSection>

                            {/* Branch — moved to bottom, defaultOpen false */}
                            {isBtech && (
                                <FilterSection
                                    label="Branch"
                                    defaultOpen={false}
                                >
                                    <div className={s.pills}>
                                        <Pill
                                            active={filters.branch === ""}
                                            onClick={() => setF("branch", "")}
                                        >
                                            All
                                        </Pill>
                                        {BRANCHES.map((b) => (
                                            <Pill
                                                key={b}
                                                active={filters.branch === b}
                                                onClick={() =>
                                                    setF("branch", b)
                                                }
                                            >
                                                {b}
                                            </Pill>
                                        ))}
                                    </div>
                                </FilterSection>
                            )}

                            {/* PYQ Paper Year filter — only when type=pyq */}
                            {filters.type === "pyq" && (
                                <FilterSection label="Paper Year" defaultOpen={true}>
                                    <div className={s.pills}>
                                        <Pill
                                            active={filters.pyqYear === ""}
                                            onClick={() => setF("pyqYear", "")}
                                        >
                                            All
                                        </Pill>
                                        {PYQ_YEARS.map((y) => (
                                            <Pill
                                                key={y}
                                                active={filters.pyqYear == y}
                                                onClick={() => setF("pyqYear", y)}
                                            >
                                                {y}
                                            </Pill>
                                        ))}
                                    </div>
                                </FilterSection>
                            )}

                            {/* Academic Year — hidden for pyq (uses paper year instead) */}
                            {filters.course && filters.type !== "pyq" && (
                                <FilterSection label="Year" defaultOpen={false}>
                                    <div className={s.pills}>
                                        <Pill
                                            active={filters.year === ""}
                                            onClick={() => setF("year", "")}
                                        >
                                            All
                                        </Pill>
                                        {Array.from(
                                            { length: yearCount },
                                            (_, i) => i + 1,
                                        ).map((n) => (
                                            <Pill
                                                key={n}
                                                active={filters.year == n}
                                                onClick={() => setF("year", n)}
                                            >
                                                Year {n}
                                            </Pill>
                                        ))}
                                    </div>
                                </FilterSection>
                            )}

                            {/* Faculty */}
                            <FilterSection label="Faculty" defaultOpen={false}>
                                <input
                                    className={s.textFilter}
                                    placeholder="e.g. Dr. Sharma"
                                    value={filters.faculty}
                                    onChange={(e) =>
                                        setF("faculty", e.target.value)
                                    }
                                />
                            </FilterSection>
                        </aside>
                    )}

                    {/* Main grid area */}
                    <main className={s.main}>
                        {/* Active filter chips */}
                        {activeCount > 0 && (
                            <div className={s.activeChips}>
                                {Object.entries(filters)
                                    .filter(
                                        ([k, v]) =>
                                            v !== "" &&
                                            !["course", "search"].includes(k),
                                    )
                                    .map(([k, v]) => (
                                        <span key={k} className={s.activeChip}>
                                            <span className={s.chipKey}>
                                                {k === "pyqYear" ? "Year" : k === "pyqSeason" ? "Season" : k}
                                            </span>
                                            {String(v)}
                                            <button
                                                className={s.chipX}
                                                onClick={() => setF(k, "")}
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                <button
                                    className={s.clearAllChips}
                                    onClick={clearFilters}
                                >
                                    Clear all
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className={s.loader}>
                                <span className={s.spin} />
                            </div>
                        ) : resources.length === 0 ? (
                            <div className={s.empty}>
                                <FileText size={32} className={s.emptyIcon} />
                                <p>No resources found.</p>
                                {activeCount > 0 && (
                                    <button
                                        className={s.emptyBtn}
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={s.groupedSections}>
                                {groupResources(resources).map((group) => (
                                    <section key={group.type} className={s.typeSection}>
                                        <div className={s.typeSectionHeader}>
                                            <span
                                                className={`${s.typeSectionBadge} ${s["type_" + (TYPE_COLORS[group.type] || "default")]}`}
                                            >
                                                {group.label}
                                            </span>
                                            <span className={s.typeSectionCount}>
                                                {group.items.length}
                                            </span>
                                            <div className={s.typeSectionLine} />
                                        </div>
                                        {group.type === "ppt" ? (
                                            /* ── PPT: one card per subject ── */
                                            <div className={s.grid}>
                                                {groupPptsBySubject(group.items).map((sg, i) => {
                                                    const allLocked = sg.items.every(r => !r.accessible);
                                                    return (
                                                        <div
                                                            key={sg.subject}
                                                            className={`${s.card} ${s.pptCard} ${allLocked ? s.cardLocked : ""}`}
                                                            style={{ animationDelay: `${i * 25}ms` }}
                                                            onClick={() => !allLocked && setSelectedPptGroup({ subject: sg.subject, items: sg.items, slideIdx: 0 })}
                                                        >
                                                            {/* Thumbnail strip */}
                                                            {(() => {
                                                                const firstPaged = sg.items.find(r => r.storageMode === "pages" && r.pageCount > 0);
                                                                const API_URL = import.meta.env.VITE_API_URL || "/api";
                                                                return (
                                                                    <div className={s.pptCardThumb}>
                                                                        {firstPaged ? (
                                                                            <img
                                                                                src={`${API_URL}/resources/${firstPaged._id}/preview-page/1`}
                                                                                alt={sg.subject}
                                                                                className={s.pptCardThumbImg}
                                                                                loading="lazy"
                                                                            />
                                                                        ) : (
                                                                            <div className={s.pptCardThumbPlaceholder}>
                                                                                <Presentation size={28} />
                                                                            </div>
                                                                        )}
                                                                        <div className={s.pptCardThumbOverlay} />
                                                                        {allLocked && <Lock size={13} className={s.pptCardLockIcon} />}
                                                                        <span className={s.pptCardCount}>{sg.items.length} file{sg.items.length !== 1 ? "s" : ""}</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className={s.cardTop}>
                                                                <span className={`${s.typeBadge} ${s["type_" + (TYPE_COLORS["ppt"] || "default")]}`}>ppt</span>
                                                                {allLocked && <Lock size={13} className={s.lockIcon} />}
                                                            </div>
                                                            <h3 className={s.cardTitle}>{sg.subject}</h3>
                                                            <div className={s.cardMeta}>
                                                                <span>{sg.items.map(r => r.faculty).filter(Boolean).filter((v,i,a) => a.indexOf(v) === i).join(", ") || "—"}</span>
                                                            </div>
                                                            <div className={s.cardFooter}>
                                                                <span className={s.cardSemester}>
                                                                    {sg.items[0]?.semester ? `Sem ${sg.items[0].semester}` : ""}
                                                                </span>
                                                                <span className={s.cardTime}>{timeAgo(sg.items[0]?.createdAt)}</span>
                                                            </div>
                                                            {allLocked && (
                                                                <div className={s.lockedOverlay}>
                                                                    <Lock size={16} />
                                                                    <span>Subscribe to unlock</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* ── All other types: individual cards ── */
                                            <div className={s.grid}>
                                                {group.items.map((r, i) => (
                                                    <div
                                                        key={r._id}
                                                        className={`${s.card} ${!r.accessible ? s.cardLocked : ""}`}
                                                        style={{ animationDelay: `${i * 25}ms` }}
                                                        onClick={() => r.accessible && setSelected(r)}
                                                    >
                                                        <div className={s.cardTop}>
                                                            <span className={`${s.typeBadge} ${s["type_" + (TYPE_COLORS[r.type] || "default")]}`}>
                                                                {r.type}
                                                            </span>
                                                            {r.exam && (
                                                                <span className={`${s.typeBadge} ${r.exam === "midsem" ? s.type_amber : s.type_rose}`}>
                                                                    {r.exam}
                                                                </span>
                                                            )}
                                                            {r.year && <span className={s.yearBadge}>Yr {r.year}</span>}
                                                            {r.isFree && <span className={s.freeBadge}>free</span>}
                                                            {!r.accessible && <Lock size={13} className={s.lockIcon} />}
                                                        </div>
                                                        <h3 className={s.cardTitle}>{r.title}</h3>
                                                        <div className={s.cardMeta}>
                                                            <span>{r.subject}</span>
                                                            {r.faculty && (
                                                                <>
                                                                    <span className={s.metaDot}>·</span>
                                                                    <span>{r.faculty}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {r.branch && <div className={s.cardBranch}>{r.branch}</div>}
                                                        <div className={s.cardFooter}>
                                                            {r.type === "pyq" ? (
                                                                <span className={s.cardSemester}>
                                                                    {[r.pyqExamType, r.pyqYear, r.pyqSeason]
                                                                        .filter(Boolean)
                                                                        .map(v => String(v).charAt(0).toUpperCase() + String(v).slice(1))
                                                                        .join(" · ")}
                                                                </span>
                                                            ) : r.semester ? (
                                                                <span className={s.cardSemester}>Sem {r.semester}</span>
                                                            ) : null}
                                                            <span className={s.cardTime}>{timeAgo(r.createdAt)}</span>
                                                        </div>
                                                        {!r.accessible && (
                                                            <div className={s.lockedOverlay}>
                                                                <Lock size={16} />
                                                                <span>Subscribe to unlock</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* PPT Subject Modal — slider through multiple ppts */}
            {selectedPptGroup && (() => {
                const { subject, items, slideIdx } = selectedPptGroup;
                const cur = items[slideIdx];
                const total = items.length;
                const prev = () => setSelectedPptGroup(g => ({ ...g, slideIdx: Math.max(0, g.slideIdx - 1) }));
                const next = () => setSelectedPptGroup(g => ({ ...g, slideIdx: Math.min(g.items.length - 1, g.slideIdx + 1) }));
                const API = import.meta.env.VITE_API_URL || "/api";
                return (
                    <div className={s.modalOverlay} onClick={() => setSelectedPptGroup(null)}>
                        <div className={`${s.modal} ${s.pptModal}`} onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className={s.modalHeader}>
                                <div className={s.modalMeta}>
                                    <span className={`${s.typeBadge} ${s["type_" + (TYPE_COLORS["ppt"] || "default")]}`}>ppt</span>
                                    <span className={s.modalSem}>{total} file{total !== 1 ? "s" : ""}</span>
                                </div>
                                <button className={s.modalClose} onClick={() => setSelectedPptGroup(null)}><X size={18} /></button>
                            </div>
                            <h2 className={s.modalTitle}>{subject}</h2>

                            {/* Slide thumbnail */}
                            <div className={s.pptSlider}>
                                <button className={s.pptArrow} onClick={prev} disabled={slideIdx === 0}><ChevronLeft size={20} /></button>
                                <div className={s.pptSlide}>
                                    {cur.storageMode === "pages" && cur.pageCount > 0 ? (
                                        <img
                                            src={`${API}/resources/${cur._id}/preview-page/1`}
                                            alt={cur.title}
                                            className={s.pptThumb}
                                        />
                                    ) : (
                                        <div className={s.pptThumbPlaceholder}>
                                            <Presentation size={36} />
                                        </div>
                                    )}
                                    <div className={s.pptSlideInfo}>
                                        <p className={s.pptSlideTitle}>{cur.title}</p>
                                        {cur.faculty && <p className={s.pptSlideFaculty}>{cur.faculty}</p>}
                                        <p className={s.pptSlideCounter}>{slideIdx + 1} / {total}</p>
                                    </div>
                                </div>
                                <button className={s.pptArrow} onClick={next} disabled={slideIdx === total - 1}><ChevronRight size={20} /></button>
                            </div>

                            {/* Dot indicators */}
                            {total > 1 && (
                                <div className={s.pptDots}>
                                    {items.map((_, i) => (
                                        <button
                                            key={i}
                                            className={`${s.pptDot} ${i === slideIdx ? s.pptDotActive : ""}`}
                                            onClick={() => setSelectedPptGroup(g => ({ ...g, slideIdx: i }))}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Open button */}
                            <div className={s.modalBtns}>
                                {(cur.fileUrl || cur.storageMode === "pages") && (
                                    <button
                                        className={s.downloadBtn}
                                        onClick={() => {
                                            setSelectedPptGroup(null);
                                            window.open(`/view/${cur._id}`, "_blank", "noopener,noreferrer");
                                        }}
                                    >
                                        <BookOpen size={15} /> Open Presentation
                                    </button>
                                )}
                            </div>

                            <div className={s.modalStats}>
                                <span>{cur.views} views</span>
                                <span>·</span>
                                <span>Added {timeAgo(cur.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Detail modal */}
            {selected && (
                <div
                    className={s.modalOverlay}
                    onClick={() => setSelected(null)}
                >
                    <div
                        className={s.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.modalHeader}>
                            <div className={s.modalMeta}>
                                <span
                                    className={`${s.typeBadge} ${s["type_" + (TYPE_COLORS[selected.type] || "default")]}`}
                                >
                                    {selected.type}
                                </span>
                                {selected.exam && (
                                    <span
                                        className={`${s.typeBadge} ${selected.exam === "midsem" ? s.type_amber : s.type_rose}`}
                                    >
                                        {selected.exam}
                                    </span>
                                )}
                                {selected.isFree && (
                                    <span className={s.freeBadge}>free</span>
                                )}
                                {selected.type === "pyq" ? (
                                    <>
                                        {selected.pyqExamType && (
                                            <span className={s.modalSem} style={{ textTransform: "capitalize" }}>
                                                {selected.pyqExamType}
                                            </span>
                                        )}
                                        {selected.pyqYear && (
                                            <span className={s.modalSem}>{selected.pyqYear}</span>
                                        )}
                                        {selected.pyqSeason && (
                                            <span className={s.modalSem} style={{ textTransform: "capitalize" }}>
                                                {selected.pyqSeason}
                                            </span>
                                        )}
                                        {selected.pyqSemester != null && selected.pyqSemester !== "" && (
                                            <span className={s.modalSem}>Sem {selected.pyqSemester}</span>
                                        )}
                                    </>
                                ) : (
                                    selected.semester != null && selected.semester !== "" && (
                                        <span className={s.modalSem}>Sem {selected.semester}</span>
                                    )
                                )}
                            </div>
                            <button
                                className={s.modalClose}
                                onClick={() => setSelected(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <h2 className={s.modalTitle}>{selected.title}</h2>
                        <div className={s.modalDetails}>
                            {[
                                ["Subject", selected.subject],
                                ["Faculty", selected.faculty],
                                ["Branch", selected.branch],
                                ["Source", selected.source],
                                [
                                    "Programme",
                                    PROGRAMMES.find(
                                        (p) => p.id === selected.course,
                                    )?.label || selected.course?.toUpperCase(),
                                ],
                                [
                                    "Year",
                                    selected.year
                                        ? `Year ${selected.year}`
                                        : null,
                                ],
                                // PYQ-specific fields
                                selected.type === "pyq" && selected.pyqExamType
                                    ? ["Exam Type", selected.pyqExamType.charAt(0).toUpperCase() + selected.pyqExamType.slice(1)]
                                    : null,
                                selected.type === "pyq" && selected.pyqYear
                                    ? ["Paper Year", selected.pyqYear]
                                    : null,
                                selected.type === "pyq" && selected.pyqSeason
                                    ? ["Season", selected.pyqSeason.charAt(0).toUpperCase() + selected.pyqSeason.slice(1)]
                                    : null,
                            ].filter(Boolean)
                                .filter(([, v]) => v)
                                .map(([label, val]) => (
                                    <div key={label} className={s.detail}>
                                        <span className={s.detailLabel}>
                                            {label}
                                        </span>
                                        <span>{val}</span>
                                    </div>
                                ))}
                        </div>
                        {selected.description && (
                            <p className={s.modalDesc}>
                                {selected.description}
                            </p>
                        )}
                        <div className={s.modalBtns}>
                            {/* View Document button */}
                            {(selected.fileUrl || selected.storageMode === "pages") && (
                                <button
                                    className={s.downloadBtn}
                                    onClick={() => {
                                        setSelected(null);
                                        window.open(
                                            `/view/${selected._id}`,
                                            "_blank",
                                            "noopener,noreferrer",
                                        );
                                    }}
                                >
                                    <BookOpen size={15} /> View Document
                                </button>
                            )}

                            {/* Solution button — only for PYQ */}
                            {selected.type === "pyq" && (
                                selected.hasSolution ? (
                                    selected.solutionAccessible ? (
                                        <button
                                            className={s.solutionBtn}
                                            onClick={() => {
                                                setSelected(null);
                                                window.open(
                                                    `/view/${selected._id}?solution=1`,
                                                    "_blank",
                                                    "noopener,noreferrer",
                                                );
                                            }}
                                        >
                                            <BookOpen size={15} /> View Solution
                                        </button>
                                    ) : (
                                        <button className={s.solutionBtnLocked} disabled>
                                            🔒 Solution Locked
                                        </button>
                                    )
                                ) : (
                                    <button className={s.solutionBtnUnavailable} disabled>
                                        Solution Unavailable
                                    </button>
                                )
                            )}
                        </div>
                        <div className={s.modalStats}>
                            <span>{selected.views} views</span>
                            <span>·</span>
                            <span>Added {timeAgo(selected.createdAt)}</span>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}