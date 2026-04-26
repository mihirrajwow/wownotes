import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import {
    Upload,
    X,
    FileText,
    CheckCircle,
    AlertCircle,
    Layers,
    Presentation,
    AlertTriangle,
    Eye,
} from "lucide-react";
import { curriculumApi, resourcesApi } from "../services/api";
import s from "./AdminUpload.module.css";

const COURSES = ["btech", "mba", "mca"];
const TYPES = ["notes", "assignment", "syllabus", "pyq", "ppt", "other"];
const EXAMS = ["midsem", "endsem"];
const PYQ_EXAM_TYPES = ["midsem", "endsem", "make-up midsem", "supplementary"];
const PYQ_YEARS = Array.from({ length: new Date().getFullYear() - 2010 + 1 }, (_, i) => new Date().getFullYear() - i);
const SOURCES = [
    "classroom",
    "library",
    "internet",
    "student",
    "faculty",
    "other",
];
const SEM_COUNT = { btech: 8, mba: 4, mca: 4 };
const BRANCHES = [
    "Civil Engineering",
    "Mechanical Engineering",
    "Electrical Engineering",
    "Electronics & Communication Engineering",
    "Computer Science & Engineering",
    "Information Technology",
    "Chemical Engineering",
    "Biotechnology",
    "Aerospace Engineering",
    "Electronics & Electrical Engineering",
    "CSE (Artificial Intelligence)",
    "CSE (Data Science)",
    "CSE (Cyber Security)",
    "CSE (Internet of Things)",
    "Electronics & Computer Engineering",
    "Other",
];

const DEFAULT_FORM = {
    title: "",
    description: "",
    course: "btech",
    semester: "1",
    year: "",
    subject: "",
    faculty: "",
    source: "classroom",
    type: "notes",
    exam: "",
    isFree: false,
    tags: "",
    branch: "",
    // PYQ-specific
    pyqExamType: "",
    pyqYear: "",
    pyqSeason: "",
    pyqSemester: "",
    isPyqFree: true,
    isSolutionFree: false,
    solutionFile: null,
};

const PAGED_THRESHOLD = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE = 80 * 1024 * 1024; // 80 MB

// ── Render one PDF page to a JPEG Blob in-browser ─────────────────────────────
async function renderPageToBlob(pdfDoc, pageNum, scale = 2.0) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error("Canvas toBlob failed")),
            "image/jpeg",
            0.82,
        );
    });
}

// ── Upload one JPEG Blob directly to Cloudinary (signed) ──────────────────────
async function uploadPageToCloudinary(blob, sigData) {
    const fd = new FormData();
    fd.append("file", blob);
    fd.append("public_id", sigData.public_id);
    fd.append("folder", sigData.folder);
    fd.append("timestamp", sigData.timestamp);
    fd.append("signature", sigData.signature);
    fd.append("api_key", sigData.api_key);

    const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`,
        { method: "POST", body: fd },
    );
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || "Cloudinary upload failed");
    }
    const data = await resp.json();
    return data.secure_url;
}

export default function AdminUpload() {
    const { user } = useAuth();

    if (user?.role !== "admin") {
        return (
            <AppShell>
                <div className={s.denied}>
                    <AlertCircle size={32} />
                    <p>Admin access required.</p>
                </div>
            </AppShell>
        );
    }

    const [form, setForm] = useState(DEFAULT_FORM);
    const [file, setFile] = useState(null);
    const [dragging, setDrag] = useState(false);

    // Curriculum subjects for the subject dropdown
    const [subjects, setSubjects] = useState([]);
    const [subjectsLoading, setSubjectsLoading] = useState(false);

    // status: idle | rendering | uploading | saving | success | error
    const [status, setStatus] = useState("idle");
    const [message, setMsg] = useState("");
    const [progress, setProgress] = useState({
        page: 0,
        total: 0,
        percent: 0,
        phase: "",
    });

    // PPT-specific: existing ppts for the selected course/branch/semester
    const [existingPpts, setExistingPpts] = useState([]);
    const [pptGroups, setPptGroups] = useState([]); // grouped by subject
    const [pptPanelLoading, setPptPanelLoading] = useState(false);

    const fileRef = useRef(null);
    const cancelRef = useRef(false); // lets us abort mid-upload

    const isLarge = file && file.size > PAGED_THRESHOLD;
    const isWorking = ["rendering", "uploading", "saving"].includes(status);

    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    // Fetch subjects from curriculum whenever course, semester, or branch changes
    useEffect(() => {
        const isPyq = form.type === "pyq";
        // For PYQ: fetch all subjects for course+branch across every semester.
        // For other types: require semester too, then fetch just that semester.
        if (!form.course || !form.branch) {
            setSubjects([]);
            return;
        }
        if (!isPyq && !form.semester) {
            setSubjects([]);
            return;
        }
        let cancelled = false;
        setSubjectsLoading(true);
        const fetcher = isPyq
            ? curriculumApi.getAllSubjects(form.course, form.branch)
            : curriculumApi.getSubjects(form.course, form.branch, form.semester);
        fetcher
            .then((data) => {
                if (!cancelled) setSubjects(data || []);
            })
            .catch(() => {
                if (!cancelled) setSubjects([]);
            })
            .finally(() => {
                if (!cancelled) setSubjectsLoading(false);
            });
        return () => { cancelled = true; };
    }, [form.course, form.semester, form.branch, form.type]);

    // Fetch existing PPTs for context panel when type=ppt
    useEffect(() => {
        if (form.type !== "ppt" || !form.course || !form.branch || !form.semester) {
            setExistingPpts([]);
            setPptGroups([]);
            return;
        }
        let cancelled = false;
        setPptPanelLoading(true);
        fetch(
            `${import.meta.env.VITE_API_URL}/admin/resources?type=ppt&course=${form.course}&limit=100`,
            { credentials: "include" }
        )
            .then(r => r.json())
            .then(data => {
                if (cancelled) return;
                const all = (data.resources || []).filter(
                    r => r.course === form.course &&
                         r.branch === form.branch &&
                         String(r.semester) === String(form.semester)
                );
                setExistingPpts(all);
                // group by subject
                const map = {};
                for (const r of all) {
                    const key = r.subject || "Unknown";
                    if (!map[key]) map[key] = [];
                    map[key].push(r);
                }
                setPptGroups(Object.entries(map).map(([subject, items]) => ({ subject, items })).sort((a,b) => a.subject.localeCompare(b.subject)));
            })
            .catch(() => { if (!cancelled) { setExistingPpts([]); setPptGroups([]); } })
            .finally(() => { if (!cancelled) setPptPanelLoading(false); });
        return () => { cancelled = true; };
    }, [form.type, form.course, form.branch, form.semester]);

    const handleFile = (f) => {
        if (!f) return;
        if (f.type !== "application/pdf") {
            setStatus("error");
            setMsg("Only PDF files are supported.");
            return;
        }
        if (f.size > MAX_FILE_SIZE) {
            setStatus("error");
            setMsg("File must be under 80 MB.");
            return;
        }
        setFile(f);
        setStatus("idle");
        setMsg("");
        setProgress({ page: 0, total: 0, percent: 0, phase: "" });
        if (!form.title)
            setF("title", f.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDrag(false);
        handleFile(e.dataTransfer.files[0]);
    };

    // ── Standard upload path (≤ 10 MB) ────────────────────────────────────────
    const uploadSmall = async (fd) => {
        setStatus("uploading");
        const resp = await fetch(
            `${import.meta.env.VITE_API_URL}/upload/resource`,
            {
                method: "POST",
                credentials: "include",
                body: fd,
            },
        );
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Upload failed");
        return data;
    };

    // ── Paged upload path (> 10 MB) ────────────────────────────────────────────
    const uploadLarge = async () => {
        cancelRef.current = false;

        // 1. Load PDF in browser with pdfjs
        setStatus("rendering");
        setProgress({ page: 0, total: 0, percent: 0, phase: "Loading PDF…" });

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer })
            .promise;
        const totalPages = pdfDoc.numPages;

        // Build folder + slug identical to what the backend would have used
        const slug =
            file.name
                .replace(/\.pdf$/i, "")
                .replace(/[^a-zA-Z0-9\-_. ]/g, "")
                .trim()
                .replace(/\s+/g, "-")
                .toLowerCase()
                .substring(0, 80) || `file-${Date.now()}`;
        const isPyq = form.type === "pyq";
        const sem = isPyq ? null : (parseInt(form.semester) || 1);
        const pageFolder = `wownotes/pages/${form.course || "btech"}/${isPyq ? "pyq" : `sem${sem}`}/${slug}`;

        setProgress({
            page: 0,
            total: totalPages,
            percent: 0,
            phase: "Rendering pages…",
        });

        const pageUrls = [];

        // 2. Render + upload each page
        for (let i = 1; i <= totalPages; i++) {
            if (cancelRef.current) throw new Error("Upload cancelled.");

            // 2a. Render page to JPEG blob in-browser
            setStatus("rendering");
            setProgress({
                page: i,
                total: totalPages,
                percent: Math.round(((i - 1) / totalPages) * 100),
                phase: `Rendering page ${i}…`,
            });

            const blob = await renderPageToBlob(pdfDoc, i);

            if (cancelRef.current) throw new Error("Upload cancelled.");

            // 2b. Get a signed upload ticket from our backend
            const publicId = `page_${String(i).padStart(4, "0")}`;
            const sigResp = await fetch(
                `${import.meta.env.VITE_API_URL}/upload/page-signature`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder: pageFolder, publicId }),
                },
            );
            if (!sigResp.ok) {
                const e = await sigResp.json().catch(() => ({}));
                throw new Error(e.error || "Failed to get upload signature");
            }
            const sigData = await sigResp.json();

            // 2c. Upload blob directly to Cloudinary
            setStatus("uploading");
            setProgress({
                page: i,
                total: totalPages,
                percent: Math.round(((i - 0.5) / totalPages) * 100),
                phase: `Uploading page ${i} of ${totalPages}…`,
            });

            const url = await uploadPageToCloudinary(blob, sigData);
            pageUrls.push(url);

            setProgress({
                page: i,
                total: totalPages,
                percent: Math.round((i / totalPages) * 100),
                phase: `Uploaded page ${i} of ${totalPages}`,
            });
        }

        // 3. Tell our backend to create the Resource document
        setStatus("saving");
        setProgress({
            page: totalPages,
            total: totalPages,
            percent: 100,
            phase: "Saving resource…",
        });

        const saveResp = await fetch(
            `${import.meta.env.VITE_API_URL}/upload/resource-pages`,
            {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    pageFolder,
                    pageImages: pageUrls,
                    pageCount: totalPages,
                }),
            },
        );
        const saved = await saveResp.json();
        if (!saveResp.ok)
            throw new Error(saved.error || "Failed to save resource");
        return saved;
    };

    const handleSubmit = async () => {
        if (!file) {
            setStatus("error");
            setMsg("Please select a PDF file.");
            return;
        }
        if (!form.title.trim()) {
            setStatus("error");
            setMsg("Title is required.");
            return;
        }
        if (!form.subject.trim()) {
            setStatus("error");
            setMsg("Subject is required.");
            return;
        }

        setMsg("");
        try {
            let resource;
            if (isLarge) {
                resource = await uploadLarge();
                setStatus("success");
                setMsg(
                    `"${resource.title}" uploaded — ${resource.pageCount} pages stored as images!`,
                );
            } else {
                const fd = new FormData();
                fd.append("file", file);
                Object.entries(form).forEach(([k, v]) => {
                    if (k === "solutionFile") return; // uploaded separately
                    fd.append(k, v);
                });
                resource = await uploadSmall(fd);
                setStatus("success");
                setMsg(`"${resource.title}" uploaded successfully!`);
            }

            // Upload solution file separately if provided
            if (form.solutionFile && resource?._id) {
                try {
                    const solFd = new FormData();
                    solFd.append("file", form.solutionFile);
                    const solResp = await fetch(
                        `${import.meta.env.VITE_API_URL}/upload/solution/${resource._id}`,
                        { method: "POST", credentials: "include", body: solFd },
                    );
                    if (!solResp.ok) {
                        const e = await solResp.json().catch(() => ({}));
                        setMsg((prev) => prev + ` (Solution upload failed: ${e.error || solResp.status})`);
                    } else {
                        setMsg((prev) => prev + " + solution attached.");
                    }
                } catch {
                    setMsg((prev) => prev + " (Solution upload failed — network error)");
                }
            }
            setFile(null);
            setForm(DEFAULT_FORM);
            setProgress({ page: 0, total: 0, percent: 0, phase: "" });
        } catch (err) {
            setStatus("error");
            setMsg(err.message || "Upload failed. Please try again.");
        }
    };

    const sems = SEM_COUNT[form.course] || 8;

    const uploadBtnLabel = () => {
        if (status === "rendering")
            return (
                <>
                    <span className={s.spin} />
                    {progress.phase || "Rendering pages…"}
                </>
            );
        if (status === "uploading")
            return (
                <>
                    <span className={s.spin} />
                    {progress.phase || "Uploading…"}
                </>
            );
        if (status === "saving")
            return (
                <>
                    <span className={s.spin} />
                    Saving resource…
                </>
            );
        return (
            <>
                <Upload size={15} /> Upload Resource
            </>
        );
    };

    return (
        <AppShell>
            <div className={s.page}>
                <div className={s.header}>
                    <h1 className={s.title}>Upload Resource</h1>
                    <p className={s.sub}>
                        Add a new PDF to the resource library
                    </p>
                </div>

                <div className={s.grid}>
                    <div className={s.left}>
                        {/* Drop zone */}
                        <div
                            className={`${s.dropZone} ${dragging ? s.dragging : ""} ${file ? s.hasFile : ""}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDrag(true);
                            }}
                            onDragLeave={() => setDrag(false)}
                            onDrop={handleDrop}
                            onClick={() => !file && fileRef.current?.click()}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept="application/pdf"
                                className={s.fileInput}
                                onChange={(e) => handleFile(e.target.files[0])}
                            />

                            {file ? (
                                <div className={s.filePreview}>
                                    {isLarge ? (
                                        <Layers
                                            size={36}
                                            className={s.fileIcon}
                                        />
                                    ) : (
                                        <FileText
                                            size={36}
                                            className={s.fileIcon}
                                        />
                                    )}
                                    <p className={s.fileName}>{file.name}</p>
                                    <p className={s.fileSize}>
                                        {(file.size / (1024 * 1024)).toFixed(2)}{" "}
                                        MB
                                        {isLarge && (
                                            <span className={s.pagedBadge}>
                                                ⚡ Page-by-page mode
                                            </span>
                                        )}
                                    </p>
                                    <button
                                        className={s.removeFile}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            cancelRef.current = true;
                                        }}
                                    >
                                        <X size={14} /> Remove
                                    </button>
                                </div>
                            ) : (
                                <div className={s.dropPrompt}>
                                    <Upload
                                        size={28}
                                        className={s.uploadIcon}
                                    />
                                    <p className={s.dropTitle}>Drop PDF here</p>
                                    <p className={s.dropSub}>
                                        or click to browse · max 80 MB
                                    </p>
                                    <p className={s.dropHint}>
                                        Files &gt; 10 MB are rendered &amp;
                                        streamed page-by-page
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Progress bar — shown during paged upload */}
                        {isLarge && isWorking && (
                            <div className={s.progressWrap}>
                                <div className={s.progressHeader}>
                                    <span className={s.progressLabel}>
                                        {progress.phase}
                                    </span>
                                    <span className={s.progressPct}>
                                        {progress.percent}%
                                    </span>
                                </div>
                                <div className={s.progressTrack}>
                                    <div
                                        className={s.progressFill}
                                        style={{
                                            width: `${progress.percent}%`,
                                        }}
                                    />
                                </div>
                                {progress.total > 0 && (
                                    <p className={s.progressSub}>
                                        Page {progress.page} of {progress.total}{" "}
                                        · each page rendered in your browser,
                                        uploaded directly to Cloudinary
                                    </p>
                                )}
                            </div>
                        )}

                        {status === "success" && (
                            <div className={s.successBox}>
                                <CheckCircle size={16} />
                                {message}
                            </div>
                        )}
                        {status === "error" && (
                            <div className={s.errorBox}>
                                <AlertCircle size={16} />
                                {message}
                            </div>
                        )}

                        <button
                            className={s.uploadBtn}
                            onClick={handleSubmit}
                            disabled={isWorking || !file}
                        >
                            {uploadBtnLabel()}
                        </button>
                    </div>

                    {/* Metadata form */}
                    <div className={s.right}>
                        <div className={s.formGroup}>
                            <label className={s.label}>Title *</label>
                            <input
                                className={s.input}
                                placeholder="e.g. DBMS Unit 3 Notes"
                                value={form.title}
                                onChange={(e) => setF("title", e.target.value)}
                            />
                        </div>
                        <div className={s.formRow}>
                            <div className={s.formGroup}>
                                <label className={s.label}>Course *</label>
                                <select
                                    className={s.select}
                                    value={form.course}
                                    onChange={(e) => {
                                        setF("course", e.target.value);
                                        setF("semester", "1");
                                    }}
                                >
                                    {COURSES.map((c) => (
                                        <option key={c} value={c}>
                                            {c.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {form.type !== "pyq" && (
                            <div className={s.formGroup}>
                                <label className={s.label}>Semester *</label>
                                <select
                                    className={s.select}
                                    value={form.semester}
                                    onChange={(e) =>
                                        setF("semester", e.target.value)
                                    }
                                >
                                    {Array.from(
                                        { length: sems },
                                        (_, i) => i + 1,
                                    ).map((n) => (
                                        <option key={n} value={n}>
                                            Sem {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            )}
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.label}>
                                Branch{" "}
                                <span className={s.optional}>(optional)</span>
                            </label>
                            <select
                                className={s.select}
                                value={form.branch}
                                onChange={(e) => setF("branch", e.target.value)}
                            >
                                <option value="">— All branches —</option>
                                {BRANCHES.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={s.formRow}>
                            <div className={s.formGroup}>
                                <label className={s.label}>Type *</label>
                                <select
                                    className={s.select}
                                    value={form.type}
                                    onChange={(e) =>
                                        setF("type", e.target.value)
                                    }
                                >
                                    {TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={s.formGroup}>
                                <label className={s.label}>Source</label>
                                <select
                                    className={s.select}
                                    value={form.source}
                                    onChange={(e) =>
                                        setF("source", e.target.value)
                                    }
                                >
                                    {SOURCES.map((src) => (
                                        <option key={src} value={src}>
                                            {src}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={s.formRow}>
                            <div className={s.formGroup}>
                                <label className={s.label}>
                                    Exam{" "}
                                    <span className={s.optional}>
                                        (if applicable)
                                    </span>
                                </label>
                                <select
                                    className={s.select}
                                    value={form.exam}
                                    onChange={(e) =>
                                        setF("exam", e.target.value)
                                    }
                                >
                                    <option value="">
                                        — Not an exam paper —
                                    </option>
                                    {EXAMS.map((e) => (
                                        <option key={e} value={e}>
                                            {e}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={s.formGroup}>
                                <label className={s.label}>
                                    Year{" "}
                                    <span className={s.optional}>
                                        (academic year)
                                    </span>
                                </label>
                                <select
                                    className={s.select}
                                    value={form.year}
                                    onChange={(e) =>
                                        setF("year", e.target.value)
                                    }
                                >
                                    <option value="">— Select year —</option>
                                    {Array.from(
                                        {
                                            length:
                                                form.course === "btech" ? 4 : 2,
                                        },
                                        (_, i) => i + 1,
                                    ).map((n) => (
                                        <option key={n} value={n}>
                                            Year {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ── PYQ-specific fields ── */}
                        {form.type === "pyq" && (
                            <div className={s.pyqSection}>
                                <div className={s.pyqSectionHeader}>
                                    📄 PYQ Details
                                </div>
                                <div className={s.formRow}>
                                    <div className={s.formGroup}>
                                        <label className={s.label}>
                                            Exam Type *
                                        </label>
                                        <select
                                            className={s.select}
                                            value={form.pyqExamType}
                                            onChange={(e) =>
                                                setF("pyqExamType", e.target.value)
                                            }
                                        >
                                            <option value="">— Select exam type —</option>
                                            {PYQ_EXAM_TYPES.map((t) => (
                                                <option key={t} value={t}>
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.label}>
                                            Paper Year *
                                        </label>
                                        <select
                                            className={s.select}
                                            value={form.pyqYear}
                                            onChange={(e) =>
                                                setF("pyqYear", e.target.value)
                                            }
                                        >
                                            <option value="">— Select year —</option>
                                            {PYQ_YEARS.map((y) => (
                                                <option key={y} value={y}>
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className={s.formRow}>
                                    <div className={s.formGroup}>
                                        <label className={s.label}>Season *</label>
                                        <select
                                            className={s.select}
                                            value={form.pyqSeason}
                                            onChange={(e) =>
                                                setF("pyqSeason", e.target.value)
                                            }
                                        >
                                            <option value="">— Select season —</option>
                                            <option value="autumn">Autumn</option>
                                            <option value="spring">Spring</option>
                                        </select>
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.label}>
                                            Semester{" "}
                                            <span className={s.optional}>(display only)</span>
                                        </label>
                                        <select
                                            className={s.select}
                                            value={form.pyqSemester}
                                            onChange={(e) =>
                                                setF("pyqSemester", e.target.value)
                                            }
                                        >
                                            <option value="">— Select semester —</option>
                                            {Array.from(
                                                { length: SEM_COUNT[form.course] || 8 },
                                                (_, i) => i + 1
                                            ).map((n) => (
                                                <option key={n} value={n}>
                                                    Semester {n}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Solution file upload */}
                                <div className={s.formGroup}>
                                    <label className={s.label}>
                                        Solution PDF{" "}
                                        <span className={s.optional}>(optional — can be added later)</span>
                                    </label>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className={s.input}
                                        onChange={(e) =>
                                            setF("solutionFile", e.target.files[0] || null)
                                        }
                                    />
                                    {form.solutionFile && (
                                        <p className={s.fileName}>
                                            ✓ {form.solutionFile.name}
                                        </p>
                                    )}
                                </div>

                                {/* Access toggles */}
                                <div className={s.pyqToggles}>
                                    <label className={s.checkRow}>
                                        <input
                                            type="checkbox"
                                            checked={form.isPyqFree}
                                            onChange={(e) =>
                                                setF("isPyqFree", e.target.checked)
                                            }
                                            className={s.checkbox}
                                        />
                                        <span>
                                            Question paper is <strong>free</strong>{" "}
                                            (visible without subscription)
                                        </span>
                                    </label>
                                    <label className={s.checkRow}>
                                        <input
                                            type="checkbox"
                                            checked={form.isSolutionFree}
                                            onChange={(e) =>
                                                setF("isSolutionFree", e.target.checked)
                                            }
                                            className={s.checkbox}
                                        />
                                        <span>
                                            Solution is <strong>free</strong>{" "}
                                            (visible without subscription)
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* ── PPT Context Panel ── */}
                        {form.type === "ppt" && form.course && form.branch && form.semester && (
                            <div className={s.pptContextPanel}>
                                <div className={s.pptContextHeader}>
                                    <Presentation size={14} />
                                    <span>
                                        Existing PPTs — {form.branch}, Sem {form.semester}
                                    </span>
                                    {pptPanelLoading && <span className={s.spin} style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
                                </div>
                                {!pptPanelLoading && pptGroups.length === 0 && (
                                    <p className={s.pptContextEmpty}>No PPTs uploaded yet for this semester.</p>
                                )}
                                {pptGroups.map(g => (
                                    <div
                                        key={g.subject}
                                        className={`${s.pptSubjectRow} ${form.subject === g.subject ? s.pptSubjectRowActive : ""}`}
                                        onClick={() => setF("subject", g.subject)}
                                        title="Click to use this subject"
                                    >
                                        <div className={s.pptSubjectName}>{g.subject}</div>
                                        <div className={s.pptSubjectMeta}>
                                            {g.items.length} file{g.items.length !== 1 ? "s" : ""} already uploaded
                                            {form.subject === g.subject && <span className={s.pptSubjectCheck}>✓ selected</span>}
                                        </div>
                                    </div>
                                ))}
                                {pptGroups.length > 0 && (
                                    <p className={s.pptContextHint}>
                                        Click a subject above to add to it, or type a new subject below.
                                    </p>
                                )}
                                {/* Subject mismatch warning */}
                                {form.subject && !pptGroups.find(g => g.subject === form.subject) && pptGroups.length > 0 && (() => {
                                    const similar = pptGroups.find(g =>
                                        g.subject.toLowerCase().includes(form.subject.toLowerCase()) ||
                                        form.subject.toLowerCase().includes(g.subject.toLowerCase())
                                    );
                                    return similar ? (
                                        <div className={s.pptMismatchWarn}>
                                            <AlertTriangle size={13} />
                                            <span>
                                                Similar subject exists: <strong>{similar.subject}</strong>.
                                                This will create a new group. Click above to merge.
                                            </span>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}

                        {/* ── PPT Student Preview ── */}
                        {form.type === "ppt" && form.subject && (
                            <div className={s.pptPreviewCard}>
                                <div className={s.pptPreviewLabel}>
                                    <Eye size={12} /> Student view preview
                                </div>
                                <div className={s.pptPreviewInner}>
                                    <div className={s.pptPreviewTop}>
                                        <span className={s.pptPreviewBadge}>ppt</span>
                                        <span className={s.pptPreviewCount}>
                                            {(pptGroups.find(g => g.subject === form.subject)?.items.length || 0) + 1} file{((pptGroups.find(g => g.subject === form.subject)?.items.length || 0) + 1) !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <p className={s.pptPreviewSubject}>{form.subject}</p>
                                    {form.faculty && <p className={s.pptPreviewFaculty}>{form.faculty}</p>}
                                    <p className={s.pptPreviewHint}>
                                        {form.isFree ? "Free · " : ""}Sem {form.semester}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className={s.formGroup}>
                            <label className={s.label}>
                                Subject *
                                {subjectsLoading && (
                                    <span className={s.subjectLoading}> fetching…</span>
                                )}
                            </label>
                            {subjects.length > 0 ? (
                                <>
                                    <select
                                        className={s.select}
                                        value={
                                            subjects.some(
                                                (sub) => sub.name === form.subject,
                                            )
                                                ? form.subject
                                                : "__manual__"
                                        }
                                        onChange={(e) => {
                                            if (e.target.value !== "__manual__")
                                                setF("subject", e.target.value);
                                            else setF("subject", "");
                                        }}
                                    >
                                        <option value="">— Select subject —</option>
                                        {subjects.map((sub) => (
                                            <option key={sub.name} value={sub.name}>
                                                {sub.shortName
                                                    ? `${sub.name} (${sub.shortName})`
                                                    : sub.name}
                                            </option>
                                        ))}
                                        <option value="__manual__">
                                            ✏️ Type manually…
                                        </option>
                                    </select>
                                    {(!subjects.some(
                                        (sub) => sub.name === form.subject,
                                    ) ||
                                        form.subject === "") && (
                                        <input
                                            className={`${s.input} ${s.subjectManual}`}
                                            placeholder="Type subject name…"
                                            value={form.subject}
                                            onChange={(e) =>
                                                setF("subject", e.target.value)
                                            }
                                        />
                                    )}
                                </>
                            ) : (
                                <input
                                    className={s.input}
                                    placeholder={
                                        form.course && (form.type === "pyq" || form.semester) && form.branch
                                            ? "No subjects found — type manually"
                                            : form.type === "pyq"
                                            ? "Select course & branch to load all subjects, or type manually"
                                            : "Select course, semester & branch first, or type manually"
                                    }
                                    value={form.subject}
                                    onChange={(e) =>
                                        setF("subject", e.target.value)
                                    }
                                />
                            )}
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.label}>Faculty</label>
                            <input
                                className={s.input}
                                placeholder="e.g. Dr. A. Sharma"
                                value={form.faculty}
                                onChange={(e) =>
                                    setF("faculty", e.target.value)
                                }
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.label}>
                                Tags{" "}
                                <span className={s.optional}>
                                    (comma separated)
                                </span>
                            </label>
                            <input
                                className={s.input}
                                placeholder="e.g. sql, normalization, transactions"
                                value={form.tags}
                                onChange={(e) => setF("tags", e.target.value)}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label className={s.label}>Description</label>
                            <textarea
                                className={s.textarea}
                                placeholder="Brief description…"
                                value={form.description}
                                onChange={(e) =>
                                    setF("description", e.target.value)
                                }
                                rows={3}
                            />
                        </div>
                        <label className={s.checkRow}>
                            <input
                                type="checkbox"
                                checked={form.isFree}
                                onChange={(e) =>
                                    setF("isFree", e.target.checked)
                                }
                                className={s.checkbox}
                            />
                            <span>
                                Make this resource <strong>free</strong> (no
                                subscription needed)
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}