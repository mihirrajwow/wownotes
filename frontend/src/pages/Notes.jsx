import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSecurity } from "../hooks/useSecurity";
import { notesApi } from "../services/api";
import AppShell from "../components/AppShell";
import NoteCard from "../components/NoteCard";
import NoteEditor from "../components/NoteEditor";
import { Plus, Search, X } from "lucide-react";
import s from "./Notes.module.css";

const COURSES = [
    { id: "btech", label: "B.Tech", sems: 8 },
    { id: "mba", label: "MBA", sems: 4 },
    { id: "mca", label: "MCA", sems: 4 },
];

export default function Notes() {
    useSecurity(true);
    const { user, forcedOut, setForcedOut } = useAuth();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTag, setActiveTag] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [saving, setSaving] = useState(false);

    // Note filters
    const [filterCourse, setFilterCourse] = useState(user?.course || "");
    const [filterSem, setFilterSem] = useState("");
    const [filterSubject, setFilterSubject] = useState("");

    const semCount = COURSES.find((c) => c.id === filterCourse)?.sems || 8;

    const fetchNotes = useCallback(async () => {
        try {
            const params = {
                archived: showArchived,
                search: search || undefined,
                tag: activeTag || undefined,
            };
            const data = await notesApi.getAll(params);
            // Client-side filter by course/sem/subject if set
            let filtered = data;
            if (filterCourse)
                filtered = filtered.filter(
                    (n) => !n.course || n.course === filterCourse,
                );
            if (filterSem)
                filtered = filtered.filter(
                    (n) => !n.semester || n.semester == filterSem,
                );
            if (filterSubject)
                filtered = filtered.filter((n) =>
                    n.subject
                        ?.toLowerCase()
                        .includes(filterSubject.toLowerCase()),
                );
            setNotes(filtered);
        } catch {
        } finally {
            setLoading(false);
        }
    }, [
        showArchived,
        search,
        activeTag,
        filterCourse,
        filterSem,
        filterSubject,
    ]);

    useEffect(() => {
        const t = setTimeout(fetchNotes, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [fetchNotes, search]);

    const allTags = [...new Set(notes.flatMap((n) => n.tags || []))].filter(
        Boolean,
    );

    const handleSave = async (noteData) => {
        setSaving(true);
        try {
            if (editingNote?._id) {
                const updated = await notesApi.update(
                    editingNote._id,
                    noteData,
                );
                setNotes((prev) =>
                    prev.map((n) => (n._id === updated._id ? updated : n)),
                );
            } else {
                const created = await notesApi.create(noteData);
                setNotes((prev) => [created, ...prev]);
            }
            setEditingNote(null);
        } catch {
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this note permanently?")) return;
        await notesApi.delete(id);
        setNotes((prev) => prev.filter((n) => n._id !== id));
        setEditingNote(null);
    };

    const handleArchive = async (note) => {
        const updated = await notesApi.update(note._id, {
            ...note,
            isArchived: !note.isArchived,
        });
        setNotes((prev) => prev.filter((n) => n._id !== updated._id));
    };

    const handlePin = async (note) => {
        const updated = await notesApi.update(note._id, {
            ...note,
            isPinned: !note.isPinned,
        });
        setNotes((prev) =>
            prev.map((n) => (n._id === updated._id ? updated : n)),
        );
    };

    const pinned = notes.filter((n) => n.isPinned);
    const unpinned = notes.filter((n) => !n.isPinned);

    return (
        <AppShell>
            <div className={s.page}>
                {/* Header */}
                <div className={s.header}>
                    <h1 className={s.title}>
                        {showArchived
                            ? "Archive"
                            : activeTag
                              ? `#${activeTag}`
                              : "My Notebook"}
                    </h1>
                    <div className={s.headerRight}>
                        <div className={s.searchWrap}>
                            <Search size={14} className={s.searchIcon} />
                            <input
                                className={s.searchInput}
                                placeholder="Search notes…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    className={s.clearX}
                                    onClick={() => setSearch("")}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <button
                            className={s.newBtn}
                            onClick={() => setEditingNote({})}
                        >
                            <Plus size={15} /> New Note
                        </button>
                    </div>
                </div>

                {/* Filters row */}
                <div className={s.filters}>
                    {/* Course */}
                    <div className={s.filterGroup}>
                        <span className={s.filterLabel}>Course</span>
                        <div className={s.pills}>
                            <button
                                className={`${s.pill} ${filterCourse === "" ? s.pillOn : ""}`}
                                onClick={() => {
                                    setFilterCourse("");
                                    setFilterSem("");
                                }}
                            >
                                All
                            </button>
                            {COURSES.map((c) => (
                                <button
                                    key={c.id}
                                    className={`${s.pill} ${filterCourse === c.id ? s.pillOn : ""}`}
                                    onClick={() => {
                                        setFilterCourse(c.id);
                                        setFilterSem("");
                                    }}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Semester */}
                    {filterCourse && (
                        <div className={s.filterGroup}>
                            <span className={s.filterLabel}>Semester</span>
                            <div className={s.pills}>
                                <button
                                    className={`${s.pill} ${filterSem === "" ? s.pillOn : ""}`}
                                    onClick={() => setFilterSem("")}
                                >
                                    All
                                </button>
                                {Array.from(
                                    { length: semCount },
                                    (_, i) => i + 1,
                                ).map((n) => (
                                    <button
                                        key={n}
                                        className={`${s.pill} ${filterSem == n ? s.pillOn : ""}`}
                                        onClick={() => setFilterSem(n)}
                                    >
                                        Sem {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Subject */}
                    <div className={s.filterGroup}>
                        <span className={s.filterLabel}>Subject</span>
                        <input
                            className={s.filterInput}
                            placeholder="Any subject"
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                        />
                    </div>

                    {/* Tags */}
                    {allTags.length > 0 && (
                        <div className={s.filterGroup}>
                            <span className={s.filterLabel}>Tags</span>
                            <div className={s.pills}>
                                <button
                                    className={`${s.pill} ${activeTag === "" ? s.pillOn : ""}`}
                                    onClick={() => setActiveTag("")}
                                >
                                    All
                                </button>
                                {allTags.map((t) => (
                                    <button
                                        key={t}
                                        className={`${s.pill} ${activeTag === t ? s.pillOn : ""}`}
                                        onClick={() => setActiveTag(t)}
                                    >
                                        #{t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Archive toggle */}
                    <button
                        className={`${s.pill} ${showArchived ? s.pillOn : ""}`}
                        onClick={() => setShowArchived((a) => !a)}
                    >
                        {showArchived ? "← Active" : "📦 Archive"}
                    </button>
                </div>

                {/* Notes grid */}
                {loading ? (
                    <div className={s.loader}>
                        <span className={s.spin} />
                    </div>
                ) : notes.length === 0 ? (
                    <div className={s.empty}>
                        <p>
                            {search
                                ? "No notes match your search."
                                : showArchived
                                  ? "Archive is empty."
                                  : "No notes yet."}
                        </p>
                        {!search && !showArchived && (
                            <button
                                className={s.emptyBtn}
                                onClick={() => setEditingNote({})}
                            >
                                Create your first note
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={s.content}>
                        {pinned.length > 0 && !search && (
                            <>
                                <p className={s.sectionLabel}>Pinned</p>
                                <div className={s.grid}>
                                    {pinned.map((note, i) => (
                                        <NoteCard
                                            key={note._id}
                                            note={note}
                                            style={{
                                                animationDelay: `${i * 35}ms`,
                                            }}
                                            onOpen={() => setEditingNote(note)}
                                            onPin={() => handlePin(note)}
                                            onArchive={() =>
                                                handleArchive(note)
                                            }
                                        />
                                    ))}
                                </div>
                                {unpinned.length > 0 && (
                                    <p className={s.sectionLabel}>Others</p>
                                )}
                            </>
                        )}
                        <div className={s.grid}>
                            {unpinned.map((note, i) => (
                                <NoteCard
                                    key={note._id}
                                    note={note}
                                    style={{
                                        animationDelay: `${(pinned.length + i) * 35}ms`,
                                    }}
                                    onOpen={() => setEditingNote(note)}
                                    onPin={() => handlePin(note)}
                                    onArchive={() => handleArchive(note)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Editor modal */}
            {editingNote !== null && (
                <NoteEditor
                    note={editingNote}
                    saving={saving}
                    defaultCourse={user?.course}
                    defaultSemester={user?.currentSemester}
                    onSave={handleSave}
                    onDelete={
                        editingNote._id
                            ? () => handleDelete(editingNote._id)
                            : null
                    }
                    onClose={() => setEditingNote(null)}
                />
            )}

            {forcedOut && (
                <div className={s.forcedOverlay}>
                    <div className={s.forcedCard}>
                        <span>⚠️</span>
                        <h2>Session Ended</h2>
                        <p>{forcedOut}</p>
                        <button
                            onClick={() => {
                                setForcedOut(null);
                                window.location.href = "/login";
                            }}
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
