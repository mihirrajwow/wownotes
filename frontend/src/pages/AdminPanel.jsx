import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import {
    Users,
    BookOpen,
    BookMarked,
    StickyNote,
    CreditCard,
    BarChart3,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Eye,
    ToggleLeft,
    ToggleRight,
    ShieldCheck,
    ShieldOff,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Banknote,
    AlertCircle,
    Tag,
    Plus,
    Edit2,
    ToggleLeft as ToggleOff,
    Calendar,
    Upload,
    Star,
    Megaphone,
    Bell,
    Send,
    Mail,
    Users as UsersIcon,
    Zap,
    GripVertical,
} from "lucide-react";
import s from "./AdminPanel.module.css";
import {
    promoApi,
    curriculumApi,
    broadcastApi,
    plansApi,
} from "../services/api";

const API = (path, opts = {}) =>
    fetch(`${import.meta.env.VITE_API_URL}/admin${path}`, {
        credentials: "include",
        ...opts,
    }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
    });

const PATCH = (path, body) =>
    API(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const DELETE = (path) => API(path, { method: "DELETE" });

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-IN").format(n ?? 0);
const fmtDate = (d) =>
    d
        ? new Date(d).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "—";
const fmtDateTime = (d) =>
    d
        ? new Date(d).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";
const isExpired = (d) => d && new Date(d) < new Date();

function Pagination({ pagination, onPage }) {
    if (!pagination || pagination.totalPages <= 1) return null;
    const { page, totalPages, total } = pagination;
    return (
        <div className={s.pagination}>
            <span className={s.pgInfo}>{total} total</span>
            <div className={s.pgBtns}>
                <button
                    className={s.pgBtn}
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                >
                    <ChevronLeft size={14} />
                </button>
                <span className={s.pgCurrent}>
                    {page} / {totalPages}
                </span>
                <button
                    className={s.pgBtn}
                    disabled={page >= totalPages}
                    onClick={() => onPage(page + 1)}
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

function Confirm({ msg, onConfirm, onCancel }) {
    return (
        <div className={s.confirmOverlay} onClick={onCancel}>
            <div className={s.confirmBox} onClick={(e) => e.stopPropagation()}>
                <AlertCircle size={24} className={s.confirmIcon} />
                <p className={s.confirmMsg}>{msg}</p>
                <div className={s.confirmBtns}>
                    <button className={s.confirmCancel} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={s.confirmDelete} onClick={onConfirm}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────
function StatsTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API("/stats")
            .then(setStats)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading)
        return (
            <div className={s.loader}>
                <span className={s.spin} />
            </div>
        );
    if (!stats) return <p className={s.empty}>Failed to load stats.</p>;

    const statCards = [
        {
            label: "Total Users",
            value: fmt(stats.totalUsers),
            icon: Users,
            color: "sky",
        },
        {
            label: "Total Resources",
            value: fmt(stats.totalResources),
            icon: BookOpen,
            color: "violet",
        },
        {
            label: "Total Notes",
            value: fmt(stats.totalNotes),
            icon: StickyNote,
            color: "amber",
        },
        {
            label: "Active Subs",
            value: fmt(stats.activeSubs),
            icon: CreditCard,
            color: "emerald",
        },
        {
            label: "Total Revenue",
            value: `₹${fmt(stats.totalRevenue)}`,
            icon: Banknote,
            color: "accent",
        },
        {
            label: "Revenue (30 days)",
            value: `₹${fmt(stats.recentRevenue)}`,
            icon: TrendingUp,
            color: "accent",
        },
    ];

    return (
        <div className={s.statsPage}>
            <div className={s.statsGrid}>
                {statCards.map((c) => {
                    const Icon = c.icon;
                    return (
                        <div
                            key={c.label}
                            className={`${s.statCard} ${s[`stat_${c.color}`]}`}
                        >
                            <Icon size={20} className={s.statIcon} />
                            <div>
                                <p className={s.statValue}>{c.value}</p>
                                <p className={s.statLabel}>{c.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={s.statsBreakdown}>
                <div className={s.breakdownCard}>
                    <h3 className={s.breakdownTitle}>Users by Course</h3>
                    {stats.usersByCourse.map((r) => (
                        <div key={r._id} className={s.breakdownRow}>
                            <span className={s.breakdownKey}>
                                {r._id?.toUpperCase() || "Unknown"}
                            </span>
                            <span className={s.breakdownVal}>
                                {fmt(r.count)}
                            </span>
                        </div>
                    ))}
                </div>
                <div className={s.breakdownCard}>
                    <h3 className={s.breakdownTitle}>Subscriptions by Plan</h3>
                    {stats.subsByPack.map((r) => (
                        <div key={r._id} className={s.breakdownRow}>
                            <span className={s.breakdownKey}>{r._id}</span>
                            <span className={s.breakdownVal}>
                                {fmt(r.count)} · ₹{fmt(r.revenue)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [dSearch, setDSearch] = useState("");
    const [detail, setDetail] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [toast, setToast] = useState(null);

    // Action panel state
    const [actionPanel, setActionPanel] = useState(null); // 'grant' | 'edit' | 'extend'
    const [actionUser, setActionUser] = useState(null);
    const [actionSub, setActionSub] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (dSearch) params.set("search", dSearch);
            setData(await API(`/users?${params}`));
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, dSearch]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDSearch(search);
            setPage(1);
        }, 320);
        return () => clearTimeout(t);
    }, [search]);

    const reloadDetail = async (id) => {
        try {
            const d = await API(`/users/${id}`);
            setDetail(d);
        } catch {}
    };

    const [roleModal, setRoleModal] = useState(null); // { user }

    const openRoleModal = (user) => setRoleModal({ user });
    const closeRoleModal = () => setRoleModal(null);

    const setRoleDirect = async (user, newRole) => {
        if (newRole === user.role) {
            closeRoleModal();
            return;
        }
        try {
            await PATCH(`/users/${user._id}`, { role: newRole });
            showToast(`${user.name} is now ${newRole}`);
            closeRoleModal();
            load();
            if (detail?.user?._id === user._id) reloadDetail(user._id);
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const deleteUser = async (id) => {
        try {
            await DELETE(`/users/${id}`);
            showToast("User deleted");
            setConfirm(null);
            setDetail(null);
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const openDetail = async (id) => {
        try {
            const d = await API(`/users/${id}`);
            setDetail(d);
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const openAction = (panel, user, sub = null) => {
        setActionPanel(panel);
        setActionUser(user);
        setActionSub(sub);
        const COURSES = ["btech", "mba", "mca"];
        if (panel === "grant") {
            setForm({
                pack: "semester",
                course: user.course || "btech",
                semester: "1",
                year: "1",
                days: "180",
                expiresAt: "",
                dateMode: "duration", // 'duration' | 'date'
                amountPaid: "",
                note: "",
            });
        } else if (panel === "edit") {
            setForm({
                name: user.name || "",
                course: user.course || "",
                currentSemester: user.currentSemester || "",
                branch: user.branch || "",
            });
        } else if (panel === "extend") {
            setForm({ days: "30" });
        }
    };

    const closeAction = () => {
        setActionPanel(null);
        setActionUser(null);
        setActionSub(null);
        setForm({});
    };

    const handleGrantSub = async () => {
        setSaving(true);
        try {
            const payload = {
                pack: form.pack,
                course: form.course,
                semester: form.semester,
                year: form.year,
                note: form.note,
                amountPaid: form.amountPaid,
                // Send either specific date or duration
                ...(form.dateMode === "date"
                    ? { expiresAt: form.expiresAt }
                    : { days: form.days }),
            };
            await API(`/users/${actionUser._id}/grant-sub`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            showToast(`Subscription granted to ${actionUser.name}`);
            closeAction();
            reloadDetail(actionUser._id);
            load();
        } catch (e) {
            showToast(e.message, false);
        } finally {
            setSaving(false);
        }
    };

    const handleEditUser = async () => {
        setSaving(true);
        try {
            await PATCH(`/users/${actionUser._id}`, form);
            showToast(`${actionUser.name} updated`);
            closeAction();
            reloadDetail(actionUser._id);
            load();
        } catch (e) {
            showToast(e.message, false);
        } finally {
            setSaving(false);
        }
    };

    const handleExtendSub = async () => {
        setSaving(true);
        try {
            await PATCH(
                `/users/${actionUser._id}/extend-sub/${actionSub._id}`,
                { days: parseInt(form.days) },
            );
            showToast(`Subscription extended by ${form.days} days`);
            closeAction();
            reloadDetail(actionUser._id);
        } catch (e) {
            showToast(e.message, false);
        } finally {
            setSaving(false);
        }
    };

    const handleRevokeSub = async (subId) => {
        try {
            await DELETE(`/subscriptions/${subId}`);
            showToast("Subscription revoked");
            reloadDetail(detail.user._id);
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const handleRevokeAllSubs = async (userId, userName) => {
        try {
            await API(`/users/${userId}/subs`, { method: "DELETE" });
            showToast(`All subscriptions revoked for ${userName}`);
            reloadDetail(userId);
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const courseObj = (course) =>
        ({
            btech: { sems: 8, years: 4 },
            mba: { sems: 4, years: 2 },
            mca: { sems: 4, years: 2 },
        })[course] || { sems: 8, years: 4 };

    return (
        <div className={s.tabContent}>
            {toast && (
                <div
                    className={`${s.toast} ${toast.ok ? s.toast_ok : s.toast_err}`}
                >
                    {toast.msg}
                </div>
            )}
            {confirm && (
                <Confirm
                    msg={`Delete "${confirm.name}" and all their data?`}
                    onConfirm={() => deleteUser(confirm.id)}
                    onCancel={() => setConfirm(null)}
                />
            )}

            {/* Role modal */}
            {roleModal && (
                <div className={s.drawerOverlay} onClick={closeRoleModal}>
                    <div
                        className={s.roleModalBox}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={s.drawerHead}
                            style={{ padding: "16px 20px 12px" }}
                        >
                            <div>
                                <p
                                    className={s.drawerName}
                                    style={{ fontSize: ".95rem" }}
                                >
                                    Change Role
                                </p>
                                <p className={s.cellSub}>
                                    {roleModal.user.name} · currently{" "}
                                    <strong>{roleModal.user.role}</strong>
                                </p>
                            </div>
                            <button
                                className={s.drawerClose}
                                onClick={closeRoleModal}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className={s.roleModalOptions}>
                            {[
                                {
                                    role: "student",
                                    icon: <Users size={16} />,
                                    desc: "Default — subscription-gated content",
                                },
                                {
                                    role: "contributor",
                                    icon: <Upload size={16} />,
                                    desc: "Student + can upload resources",
                                },
                                {
                                    role: "friend",
                                    icon: <Star size={16} />,
                                    desc: "Student + full access to all resources",
                                },
                                {
                                    role: "admin",
                                    icon: <ShieldCheck size={16} />,
                                    desc: "Full access + upload + admin panel",
                                },
                            ].map(({ role, icon, desc }) => (
                                <button
                                    key={role}
                                    className={`${s.roleOption} ${roleModal.user.role === role ? s.roleOptionActive : ""}`}
                                    onClick={() =>
                                        setRoleDirect(roleModal.user, role)
                                    }
                                >
                                    <span
                                        className={`${s.roleOptionIcon} ${s["role_" + role]}`}
                                    >
                                        {icon}
                                    </span>
                                    <div className={s.roleOptionText}>
                                        <span className={s.roleOptionName}>
                                            {role}
                                        </span>
                                        <span className={s.roleOptionDesc}>
                                            {desc}
                                        </span>
                                    </div>
                                    {roleModal.user.role === role && (
                                        <CheckCircle2
                                            size={14}
                                            className={s.subOk}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Action modal */}
            {actionPanel && (
                <div className={s.drawerOverlay} onClick={closeAction}>
                    <div
                        className={s.drawer}
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 440 }}
                    >
                        <div className={s.drawerHead}>
                            <div>
                                <p className={s.drawerName}>
                                    {actionPanel === "grant" &&
                                        "Grant Subscription"}
                                    {actionPanel === "edit" && "Edit User"}
                                    {actionPanel === "extend" &&
                                        "Extend Subscription"}
                                </p>
                                <p className={s.cellSub}>
                                    {actionUser?.name} · {actionUser?.email}
                                </p>
                            </div>
                            <button
                                className={s.drawerClose}
                                onClick={closeAction}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className={s.actionModalBody}>
                            {/* GRANT SUB FORM */}
                            {actionPanel === "grant" && (
                                <>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Plan
                                        </label>
                                        <div className={s.chipGroup}>
                                            {["semester", "year", "full"].map(
                                                (p) => (
                                                    <button
                                                        key={p}
                                                        className={`${s.chip} ${form.pack === p ? s.chipOn : ""}`}
                                                        onClick={() =>
                                                            setForm((f) => ({
                                                                ...f,
                                                                pack: p,
                                                            }))
                                                        }
                                                    >
                                                        {p}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Course
                                        </label>
                                        <div className={s.chipGroup}>
                                            {["btech", "mba", "mca"].map(
                                                (c) => (
                                                    <button
                                                        key={c}
                                                        className={`${s.chip} ${form.course === c ? s.chipOn : ""}`}
                                                        onClick={() =>
                                                            setForm((f) => ({
                                                                ...f,
                                                                course: c,
                                                            }))
                                                        }
                                                    >
                                                        {c.toUpperCase()}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                    {form.pack === "semester" && (
                                        <div className={s.formGroup}>
                                            <label className={s.formLabel}>
                                                Semester
                                            </label>
                                            <div className={s.chipGroup}>
                                                {Array.from(
                                                    {
                                                        length: courseObj(
                                                            form.course,
                                                        ).sems,
                                                    },
                                                    (_, i) => i + 1,
                                                ).map((n) => (
                                                    <button
                                                        key={n}
                                                        className={`${s.chip} ${form.semester == n ? s.chipOn : ""}`}
                                                        onClick={() =>
                                                            setForm((f) => ({
                                                                ...f,
                                                                semester: n,
                                                            }))
                                                        }
                                                    >
                                                        Sem {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {form.pack === "year" && (
                                        <div className={s.formGroup}>
                                            <label className={s.formLabel}>
                                                Year
                                            </label>
                                            <div className={s.chipGroup}>
                                                {Array.from(
                                                    {
                                                        length: courseObj(
                                                            form.course,
                                                        ).years,
                                                    },
                                                    (_, i) => i + 1,
                                                ).map((n) => (
                                                    <button
                                                        key={n}
                                                        className={`${s.chip} ${form.year == n ? s.chipOn : ""}`}
                                                        onClick={() =>
                                                            setForm((f) => ({
                                                                ...f,
                                                                year: n,
                                                            }))
                                                        }
                                                    >
                                                        Year {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Duration
                                        </label>
                                        {/* Mode toggle */}
                                        <div
                                            className={s.chipGroup}
                                            style={{ marginBottom: 8 }}
                                        >
                                            {["duration", "date"].map((m) => (
                                                <button
                                                    key={m}
                                                    className={`${s.chip} ${form.dateMode === m ? s.chipOn : ""}`}
                                                    onClick={() =>
                                                        setForm((f) => ({
                                                            ...f,
                                                            dateMode: m,
                                                        }))
                                                    }
                                                >
                                                    {m === "duration"
                                                        ? "⏱ Days"
                                                        : "📅 Until date"}
                                                </button>
                                            ))}
                                        </div>
                                        {form.dateMode === "duration" ? (
                                            <div className={s.chipGroup}>
                                                {[30, 90, 180, 365].map((d) => (
                                                    <button
                                                        key={d}
                                                        className={`${s.chip} ${form.days == d ? s.chipOn : ""}`}
                                                        onClick={() =>
                                                            setForm((f) => ({
                                                                ...f,
                                                                days: d,
                                                            }))
                                                        }
                                                    >
                                                        {d}d
                                                    </button>
                                                ))}
                                                <input
                                                    className={s.inlineInput}
                                                    type="number"
                                                    min="1"
                                                    max="36500"
                                                    value={form.days}
                                                    onChange={(e) =>
                                                        setForm((f) => ({
                                                            ...f,
                                                            days: e.target
                                                                .value,
                                                        }))
                                                    }
                                                    style={{ width: 64 }}
                                                    placeholder="days"
                                                />
                                            </div>
                                        ) : (
                                            <input
                                                className={s.inlineInput}
                                                type="date"
                                                min={
                                                    new Date(
                                                        Date.now() + 86400000,
                                                    )
                                                        .toISOString()
                                                        .split("T")[0]
                                                }
                                                value={form.expiresAt}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        expiresAt:
                                                            e.target.value,
                                                    }))
                                                }
                                                style={{ width: "100%" }}
                                            />
                                        )}
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Amount paid (₹){" "}
                                            <span
                                                style={{
                                                    fontWeight: 400,
                                                    textTransform: "none",
                                                }}
                                            >
                                                — optional, for revenue tracking
                                            </span>
                                        </label>
                                        <input
                                            className={s.inlineInput}
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="0 = free grant"
                                            value={form.amountPaid}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    amountPaid: e.target.value,
                                                }))
                                            }
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Note (optional)
                                        </label>
                                        <input
                                            className={s.inlineInput}
                                            placeholder="e.g. Scholarship grant"
                                            value={form.note}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    note: e.target.value,
                                                }))
                                            }
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                    <button
                                        className={s.actionBtn}
                                        onClick={handleGrantSub}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className={s.spin} />{" "}
                                                Granting…
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={14} /> Grant
                                                Subscription
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            {/* EDIT USER FORM */}
                            {actionPanel === "edit" && (
                                <>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Name
                                        </label>
                                        <input
                                            className={s.inlineInput}
                                            style={{ width: "100%" }}
                                            value={form.name}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    name: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Course
                                        </label>
                                        <div className={s.chipGroup}>
                                            {["btech", "mba", "mca"].map(
                                                (c) => (
                                                    <button
                                                        key={c}
                                                        className={`${s.chip} ${form.course === c ? s.chipOn : ""}`}
                                                        onClick={() =>
                                                            setForm((f) => ({
                                                                ...f,
                                                                course: c,
                                                            }))
                                                        }
                                                    >
                                                        {c.toUpperCase()}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Current Semester
                                        </label>
                                        <div className={s.chipGroup}>
                                            {Array.from(
                                                {
                                                    length: courseObj(
                                                        form.course,
                                                    ).sems,
                                                },
                                                (_, i) => i + 1,
                                            ).map((n) => (
                                                <button
                                                    key={n}
                                                    className={`${s.chip} ${form.currentSemester == n ? s.chipOn : ""}`}
                                                    onClick={() =>
                                                        setForm((f) => ({
                                                            ...f,
                                                            currentSemester: n,
                                                        }))
                                                    }
                                                >
                                                    Sem {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Branch
                                        </label>
                                        <select
                                            className={s.inlineInput}
                                            style={{ width: "100%" }}
                                            value={form.branch}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    branch: e.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">
                                                — Select branch —
                                            </option>
                                            {BRANCHES.map((b) => (
                                                <option key={b} value={b}>
                                                    {b}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        className={s.actionBtn}
                                        onClick={handleEditUser}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className={s.spin} />{" "}
                                                Saving…
                                            </>
                                        ) : (
                                            <>
                                                <Edit2 size={14} /> Save Changes
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            {/* EXTEND SUB FORM */}
                            {actionPanel === "extend" && (
                                <>
                                    <div
                                        className={s.drawerSub}
                                        style={{ marginBottom: 4 }}
                                    >
                                        <div>
                                            <p className={s.drawerSubLabel}>
                                                {actionSub?.planLabel}
                                            </p>
                                            <p className={s.cellSub}>
                                                Currently expires:{" "}
                                                {fmtDate(actionSub?.expiresAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={s.formGroup}>
                                        <label className={s.formLabel}>
                                            Extend by (days)
                                        </label>
                                        <div className={s.chipGroup}>
                                            {[7, 30, 90, 180, 365].map((d) => (
                                                <button
                                                    key={d}
                                                    className={`${s.chip} ${form.days == d ? s.chipOn : ""}`}
                                                    onClick={() =>
                                                        setForm((f) => ({
                                                            ...f,
                                                            days: d,
                                                        }))
                                                    }
                                                >
                                                    {d}d
                                                </button>
                                            ))}
                                            <input
                                                className={s.inlineInput}
                                                type="number"
                                                min="1"
                                                value={form.days}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        days: e.target.value,
                                                    }))
                                                }
                                                style={{ width: 64 }}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        className={s.actionBtn}
                                        onClick={handleExtendSub}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className={s.spin} />{" "}
                                                Extending…
                                            </>
                                        ) : (
                                            <>
                                                <Calendar size={14} /> Extend
                                                Subscription
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={s.toolbar}>
                <div className={s.searchWrap}>
                    <Search size={13} className={s.searchIcon} />
                    <input
                        className={s.searchInput}
                        placeholder="Search name, email, roll…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className={s.clearX}
                            onClick={() => setSearch("")}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
                <button className={s.refreshBtn} onClick={load}>
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <div className={s.loader}>
                    <span className={s.spin} />
                </div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Roll</th>
                                <th>Course</th>
                                <th>Sem</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.users?.map((u) => (
                                <tr key={u._id}>
                                    <td>
                                        <div className={s.userCell}>
                                            <img
                                                src={u.avatar}
                                                alt=""
                                                className={s.cellAvatar}
                                            />
                                            <div>
                                                <p className={s.cellName}>
                                                    {u.name}
                                                </p>
                                                <p className={s.cellSub}>
                                                    {u.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={s.mono}>
                                            {u.roll || "—"}
                                        </span>
                                    </td>
                                    <td>{u.course?.toUpperCase() || "—"}</td>
                                    <td>{u.currentSemester || "—"}</td>
                                    <td>
                                        <span
                                            className={`${s.roleBadge} ${s["role_" + u.role]}`}
                                        >
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className={s.dateCell}>
                                        {fmtDate(u.createdAt)}
                                    </td>
                                    <td>
                                        <div className={s.actions}>
                                            <button
                                                className={s.iconBtn}
                                                title="View details"
                                                onClick={() =>
                                                    openDetail(u._id)
                                                }
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                className={s.iconBtn}
                                                title="Edit profile"
                                                onClick={() =>
                                                    openAction("edit", u)
                                                }
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className={s.iconBtn}
                                                title="Grant subscription"
                                                onClick={() =>
                                                    openAction("grant", u)
                                                }
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button
                                                className={`${s.iconBtn} ${s["roleBtn_" + u.role]}`}
                                                title={`Role: ${u.role} — click to change`}
                                                onClick={() => openRoleModal(u)}
                                            >
                                                {u.role === "admin" ? (
                                                    <ShieldCheck size={14} />
                                                ) : u.role === "friend" ? (
                                                    <Star size={14} />
                                                ) : u.role === "contributor" ? (
                                                    <Upload size={14} />
                                                ) : (
                                                    <Users size={14} />
                                                )}
                                            </button>
                                            <button
                                                className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                                title="Delete user"
                                                onClick={() =>
                                                    setConfirm({
                                                        id: u._id,
                                                        name: u.name,
                                                    })
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pagination pagination={data?.pagination} onPage={setPage} />

            {/* User detail drawer */}
            {detail && (
                <div
                    className={s.drawerOverlay}
                    onClick={() => setDetail(null)}
                >
                    <div
                        className={s.drawer}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.drawerHead}>
                            <div className={s.userCell}>
                                <img
                                    src={detail.user.avatar}
                                    alt=""
                                    className={s.drawerAvatar}
                                />
                                <div>
                                    <p className={s.drawerName}>
                                        {detail.user.name}
                                    </p>
                                    <p className={s.cellSub}>
                                        {detail.user.email}
                                    </p>
                                </div>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 6,
                                    alignItems: "center",
                                }}
                            >
                                <button
                                    className={s.iconBtn}
                                    title="Edit profile"
                                    onClick={() => {
                                        setDetail(null);
                                        openAction("edit", detail.user);
                                    }}
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    className={s.iconBtn}
                                    title="Grant subscription"
                                    onClick={() => {
                                        setDetail(null);
                                        openAction("grant", detail.user);
                                    }}
                                >
                                    <Plus size={14} />
                                </button>
                                <button
                                    className={s.drawerClose}
                                    onClick={() => setDetail(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className={s.drawerGrid}>
                            {[
                                ["Roll", detail.user.roll],
                                ["Course", detail.user.course?.toUpperCase()],
                                ["Semester", detail.user.currentSemester],
                                ["Branch", detail.user.branch],
                                ["Notes", detail.noteCount],
                                ["Resources uploaded", detail.resourceCount],
                                ["Joined", fmtDate(detail.user.createdAt)],
                            ]
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                    <div key={k} className={s.drawerField}>
                                        <span className={s.drawerFieldKey}>
                                            {k}
                                        </span>
                                        <span className={s.drawerFieldVal}>
                                            {v}
                                        </span>
                                    </div>
                                ))}
                        </div>

                        <div className={s.drawerRoleRow}>
                            <span className={s.drawerFieldKey}>Role</span>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <span
                                    className={`${s.roleBadge} ${s["role_" + detail.user.role]}`}
                                    style={{ textTransform: "capitalize" }}
                                >
                                    {detail.user.role}
                                </span>
                                <button
                                    className={s.changeRoleBtn}
                                    onClick={() => openRoleModal(detail.user)}
                                >
                                    Change
                                </button>
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                margin: "0 0 8px",
                            }}
                        >
                            <h4
                                className={s.drawerSection}
                                style={{ margin: 0 }}
                            >
                                Subscriptions ({detail.subscriptions.length})
                            </h4>
                            {detail.subscriptions.length > 0 && (
                                <button
                                    style={{
                                        fontSize: 11,
                                        color: "var(--color-danger, #ef4444)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                    onClick={() =>
                                        handleRevokeAllSubs(
                                            detail.user._id,
                                            detail.user.name,
                                        )
                                    }
                                    title="Revoke all subscriptions"
                                >
                                    <Trash2 size={11} /> Revoke all
                                </button>
                            )}
                        </div>

                        {detail.subscriptions.length === 0 ? (
                            <p className={s.empty}>No subscriptions</p>
                        ) : (
                            <div className={s.drawerSubs}>
                                {detail.subscriptions.map((sub) => (
                                    <div
                                        key={sub._id}
                                        className={`${s.drawerSub} ${sub.isActive && !isExpired(sub.expiresAt) ? s.drawerSubActive : s.drawerSubExp}`}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <p className={s.drawerSubLabel}>
                                                {sub.planLabel ||
                                                    `${sub.pack} · ${sub.course}`}
                                            </p>
                                            <p className={s.cellSub}>
                                                {sub.grantedBy === "payment"
                                                    ? `₹${sub.amountPaid} · ${sub.paymentRef || "—"}`
                                                    : sub.grantedBy}
                                                {" · "}
                                                {isExpired(sub.expiresAt)
                                                    ? "Expired"
                                                    : `Expires ${fmtDate(sub.expiresAt)}`}
                                            </p>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 4,
                                                alignItems: "center",
                                            }}
                                        >
                                            <button
                                                className={s.iconBtn}
                                                title="Extend subscription"
                                                onClick={() => {
                                                    setDetail(null);
                                                    openAction(
                                                        "extend",
                                                        detail.user,
                                                        sub,
                                                    );
                                                }}
                                            >
                                                <Calendar size={12} />
                                            </button>
                                            <button
                                                className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                                title="Revoke this subscription"
                                                onClick={() =>
                                                    handleRevokeSub(sub._id)
                                                }
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        {sub.isActive &&
                                        !isExpired(sub.expiresAt) ? (
                                            <CheckCircle2
                                                size={14}
                                                className={s.subOk}
                                            />
                                        ) : (
                                            <XCircle
                                                size={14}
                                                className={s.subExp}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Subscriptions tab ─────────────────────────────────────────────────────────
function SubscriptionsTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [dSearch, setDSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [pack, setPack] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20, status });
            if (dSearch) params.set("search", dSearch);
            if (pack) params.set("pack", pack);
            setData(await API(`/subscriptions?${params}`));
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, dSearch, status, pack]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDSearch(search);
            setPage(1);
        }, 320);
        return () => clearTimeout(t);
    }, [search]);

    const toggleActive = async (sub) => {
        try {
            await PATCH(`/subscriptions/${sub._id}`, {
                isActive: !sub.isActive,
            });
            showToast(
                `Subscription ${sub.isActive ? "deactivated" : "activated"}`,
            );
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const deleteSub = async (id) => {
        try {
            await DELETE(`/subscriptions/${id}`);
            showToast("Subscription deleted");
            setConfirm(null);
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    return (
        <div className={s.tabContent}>
            {toast && (
                <div
                    className={`${s.toast} ${toast.ok ? s.toast_ok : s.toast_err}`}
                >
                    {toast.msg}
                </div>
            )}
            {confirm && (
                <Confirm
                    msg="Delete this subscription permanently?"
                    onConfirm={() => deleteSub(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}

            <div className={s.toolbar}>
                <div className={s.searchWrap}>
                    <Search size={13} className={s.searchIcon} />
                    <input
                        className={s.searchInput}
                        placeholder="Search user email, name…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className={s.clearX}
                            onClick={() => setSearch("")}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
                <div className={s.filterGroup}>
                    {["all", "active", "expired"].map((v) => (
                        <button
                            key={v}
                            className={`${s.filterPill} ${status === v ? s.filterPillOn : ""}`}
                            onClick={() => {
                                setStatus(v);
                                setPage(1);
                            }}
                        >
                            {v}
                        </button>
                    ))}
                </div>
                <div className={s.filterGroup}>
                    {["", "semester", "year", "full"].map((v) => (
                        <button
                            key={v}
                            className={`${s.filterPill} ${pack === v ? s.filterPillOn : ""}`}
                            onClick={() => {
                                setPack(v);
                                setPage(1);
                            }}
                        >
                            {v || "all plans"}
                        </button>
                    ))}
                </div>
                <button className={s.refreshBtn} onClick={load}>
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <div className={s.loader}>
                    <span className={s.spin} />
                </div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Plan</th>
                                <th>Amount</th>
                                <th>Payment ID</th>
                                <th>Order ID</th>
                                <th>Paid At</th>
                                <th>Expires</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.subscriptions?.map((sub) => {
                                const active =
                                    sub.isActive && !isExpired(sub.expiresAt);
                                return (
                                    <tr key={sub._id}>
                                        <td>
                                            <div className={s.userCell}>
                                                {sub.user?.avatar && (
                                                    <img
                                                        src={sub.user.avatar}
                                                        alt=""
                                                        className={s.cellAvatar}
                                                    />
                                                )}
                                                <div>
                                                    <p className={s.cellName}>
                                                        {sub.user?.name || "—"}
                                                    </p>
                                                    <p className={s.cellSub}>
                                                        {sub.user?.email || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={`${s.packBadge} ${s[`pack_${sub.pack}`]}`}
                                            >
                                                {sub.pack}
                                            </span>
                                            <p className={s.cellSub}>
                                                {sub.planLabel ||
                                                    `${sub.course?.toUpperCase()}`}
                                            </p>
                                        </td>
                                        <td>
                                            {sub.amountPaid != null
                                                ? `₹${sub.amountPaid}`
                                                : "—"}
                                        </td>
                                        <td>
                                            <span className={s.mono}>
                                                {sub.paymentRef || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={s.mono}>
                                                {sub.orderId || "—"}
                                            </span>
                                        </td>
                                        <td className={s.dateCell}>
                                            {fmtDateTime(sub.paidAt)}
                                        </td>
                                        <td
                                            className={`${s.dateCell} ${isExpired(sub.expiresAt) ? s.expired : ""}`}
                                        >
                                            {fmtDate(sub.expiresAt)}
                                        </td>
                                        <td>
                                            <span className={s.sourceBadge}>
                                                {sub.grantedBy}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`${s.statusDot} ${active ? s.dotGreen : s.dotRed}`}
                                            />
                                            {active ? "Active" : "Expired"}
                                        </td>
                                        <td>
                                            <div className={s.actions}>
                                                <button
                                                    className={s.iconBtn}
                                                    title={
                                                        sub.isActive
                                                            ? "Deactivate"
                                                            : "Activate"
                                                    }
                                                    onClick={() =>
                                                        toggleActive(sub)
                                                    }
                                                >
                                                    {sub.isActive ? (
                                                        <ToggleRight
                                                            size={16}
                                                            className={
                                                                s.toggleOn
                                                            }
                                                        />
                                                    ) : (
                                                        <ToggleLeft size={16} />
                                                    )}
                                                </button>
                                                <button
                                                    className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                                    title="Delete"
                                                    onClick={() =>
                                                        setConfirm(sub._id)
                                                    }
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <Pagination pagination={data?.pagination} onPage={setPage} />
        </div>
    );
}

// ── CataloguePagePicker ────────────────────────────────────────────────────────
function CataloguePagePicker({ resource, onSave, onClose }) {
    const API_BASE = import.meta.env.VITE_API_URL || "/api";
    const [pageIndex, setPageIndex] = useState(
        resource.cataloguePageIndex || 1,
    );
    const [saving, setSaving] = useState(false);
    const total = resource.pageCount || 1;

    const prev = () => setPageIndex((p) => Math.max(1, p - 1));
    const next = () => setPageIndex((p) => Math.min(total, p + 1));

    const handleSave = async () => {
        setSaving(true);
        await onSave(pageIndex);
        setSaving(false);
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                backdropFilter: "blur(4px)",
            }}
        >
            <div
                style={{
                    background: "var(--white)",
                    borderRadius: 18,
                    padding: "28px 24px",
                    width: "min(520px, 95vw)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    boxShadow: "var(--shadow-lg)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}
                >
                    <div>
                        <p
                            style={{
                                fontSize: ".7rem",
                                textTransform: "uppercase",
                                letterSpacing: ".08em",
                                color: "var(--accent)",
                                fontWeight: 600,
                            }}
                        >
                            Catalogue Preview
                        </p>
                        <h3
                            style={{
                                fontFamily: "'DM Serif Display', serif",
                                fontSize: "1.1rem",
                                color: "var(--ink)",
                                marginTop: 2,
                            }}
                        >
                            {resource.title}
                        </h3>
                        <p
                            style={{
                                fontSize: ".75rem",
                                color: "var(--muted)",
                                marginTop: 2,
                            }}
                        >
                            {resource.subject} · {resource.pageCount} pages
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--muted)",
                            fontSize: "1.2rem",
                            padding: 4,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Page preview */}
                <div
                    style={{
                        position: "relative",
                        borderRadius: 10,
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        background: "#f5f5f5",
                        minHeight: 320,
                    }}
                >
                    <img
                        key={pageIndex}
                        src={`${API_BASE}/resources/${resource._id}/preview-page/${pageIndex}`}
                        alt={`Page ${pageIndex}`}
                        style={{
                            width: "100%",
                            display: "block",
                            objectFit: "contain",
                            maxHeight: 380,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: "40%",
                            background:
                                "linear-gradient(to bottom, transparent, rgba(255,255,255,.95))",
                            pointerEvents: "none",
                        }}
                    />
                    <span
                        style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            background: "rgba(0,0,0,.5)",
                            color: "#fff",
                            fontSize: ".65rem",
                            padding: "3px 8px",
                            borderRadius: 20,
                            backdropFilter: "blur(4px)",
                        }}
                    >
                        Page {pageIndex} / {total}
                    </span>
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        onClick={prev}
                        disabled={pageIndex === 1}
                        style={{
                            flex: 1,
                            padding: "8px 0",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "none",
                            cursor: pageIndex === 1 ? "not-allowed" : "pointer",
                            opacity: pageIndex === 1 ? 0.4 : 1,
                        }}
                    >
                        ‹ Prev
                    </button>
                    <input
                        type="number"
                        min={1}
                        max={total}
                        value={pageIndex}
                        onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v))
                                setPageIndex(Math.min(total, Math.max(1, v)));
                        }}
                        style={{
                            width: 64,
                            textAlign: "center",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "8px 4px",
                            fontFamily: "var(--font-body)",
                            fontSize: ".88rem",
                        }}
                    />
                    <button
                        onClick={next}
                        disabled={pageIndex === total}
                        style={{
                            flex: 1,
                            padding: "8px 0",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "none",
                            cursor:
                                pageIndex === total ? "not-allowed" : "pointer",
                            opacity: pageIndex === total ? 0.4 : 1,
                        }}
                    >
                        Next ›
                    </button>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "none",
                            cursor: "pointer",
                            fontFamily: "var(--font-body)",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            flex: 2,
                            padding: "10px 0",
                            border: "none",
                            borderRadius: 8,
                            background: "var(--ink)",
                            color: "var(--paper)",
                            cursor: saving ? "not-allowed" : "pointer",
                            fontFamily: "var(--font-body)",
                            fontWeight: 500,
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? "Saving…" : `Use Page ${pageIndex}`}
                    </button>
                </div>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// Shared constants re-used in the edit drawer
// ─────────────────────────────────────────────────────────────────────────────
const R_COURSES  = ['btech', 'mba', 'mca'];
const R_TYPES    = ['notes', 'assignment', 'syllabus', 'pyq', 'ppt', 'other'];
const R_SOURCES  = ['classroom', 'library', 'internet', 'student', 'faculty', 'other'];
const R_BRANCHES = [
    'Civil Engineering','Mechanical Engineering','Electrical Engineering',
    'Electronics & Communication Engineering','Computer Science & Engineering',
    'Information Technology','Chemical Engineering','Biotechnology',
    'Aerospace Engineering','Electronics & Electrical Engineering',
    'CSE (Artificial Intelligence)','CSE (Data Science)','CSE (Cyber Security)',
    'CSE (Internet of Things)','Electronics & Computer Engineering','Other',
];
const R_SEM_COUNT = { btech: 8, mba: 4, mca: 4 };
const PYQ_EXAM_TYPES = ['midsem', 'endsem', 'make-up midsem', 'supplementary'];
const PYQ_YEARS = Array.from({ length: new Date().getFullYear() - 2010 + 1 }, (_, i) => new Date().getFullYear() - i);
const API_BASE = () => import.meta.env.VITE_API_URL || '/api';

// ── Helper: render a PDF page to JPEG blob (reused from AdminUpload) ─────────
async function renderPdfPageToBlob(pdfDoc, pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.82));
}

// ── Helper: upload one JPEG blob to Cloudinary via signed upload ─────────────
async function uploadPageBlob(blob, resourceId, pageIndex) {
    const folder = 'wownotes/pages/appended/' + resourceId;
    const publicId = 'page_' + String(pageIndex).padStart(4, '0') + '_' + Date.now();
    const sigResp = await fetch(API_BASE() + '/upload/page-signature', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, publicId }),
    });
    if (!sigResp.ok) throw new Error('Signature failed');
    const sig = await sigResp.json();
    const fd = new FormData();
    fd.append('file', blob);
    fd.append('public_id', sig.public_id);
    fd.append('folder', sig.folder);
    fd.append('timestamp', sig.timestamp);
    fd.append('signature', sig.signature);
    fd.append('api_key', sig.api_key);
    const up = await fetch('https://api.cloudinary.com/v1_1/' + sig.cloud_name + '/image/upload', { method: 'POST', body: fd });
    if (!up.ok) throw new Error('Cloudinary upload failed');
    const d = await up.json();
    return d.secure_url;
}

// ── SolutionUploadSection ─────────────────────────────────────────────────────
// Lets admin attach or replace the solution PDF on an existing PYQ resource.
function SolutionUploadSection({ resource, onSaved }) {
    const [file,    setFile]    = React.useState(null);
    const [status,  setStatus]  = React.useState('idle'); // idle|uploading|done|error
    const [msg,     setMsg]     = React.useState('');
    const inputRef = React.useRef(null);

    const hasSolution = !!(resource.solutionFileUrl || (resource.solutionPageImages && resource.solutionPageImages.length));

    const handleUpload = async () => {
        if (!file) return;
        setStatus('uploading');
        setMsg('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            const resp = await fetch(
                (import.meta.env.VITE_API_URL || '/api') + '/upload/solution/' + resource._id,
                { method: 'POST', credentials: 'include', body: fd },
            );
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Upload failed');
            setStatus('done');
            setMsg('Solution uploaded successfully!');
            setFile(null);
            onSaved(data);
        } catch (e) {
            setStatus('error');
            setMsg(e.message || 'Upload failed.');
        }
    };

    return (
        <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', margin: 0 }}>
                Solution PDF
                {hasSolution && <span style={{ color: '#16a34a', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>✓ already attached</span>}
            </p>
            {hasSolution && (
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', margin: 0 }}>
                    Uploading a new file will replace the existing solution.
                </p>
            )}
            <input
                ref={inputRef}
                type='file'
                accept='application/pdf'
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0] || null)}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className={s.outlineBtn} style={{ alignSelf: 'flex-start' }} onClick={() => inputRef.current?.click()}>
                    <Upload size={13} /> {file ? 'Change file…' : hasSolution ? 'Replace solution…' : 'Choose solution PDF…'}
                </button>
                {file && (
                    <button
                        className={s.actionBtn}
                        onClick={handleUpload}
                        disabled={status === 'uploading'}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        {status === 'uploading' ? <><span className={s.spin} /> Uploading…</> : <><CheckCircle2 size={13} /> Upload Solution</>}
                    </button>
                )}
            </div>
            {file && status !== 'uploading' && (
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', margin: 0 }}>
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
            )}
            {msg && (
                <p style={{ fontSize: '.8rem', color: status === 'done' ? '#16a34a' : '#ef4444', margin: 0 }}>{msg}</p>
            )}
        </>
    );
}

// ── PptGroupManager ───────────────────────────────────────────────────────────
// Shows all PPT files in the same subject group and lets admin upload new ones
// or replace/delete existing ones.
function PptGroupManager({ resource, onSaved }) {
    const [siblings, setSiblings]   = React.useState(null); // null = loading
    const [msg, setMsg]             = React.useState(null);
    const [uploading, setUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState('');
    const newFileRef  = React.useRef(null);
    const replFileRef = React.useRef(null);
    const [replaceTarget, setReplaceTarget] = React.useState(null); // resource id to replace

    const API = API_BASE();

    const load = React.useCallback(async () => {
        try {
            const r = await fetch(`${API}/admin/resources/${resource._id}/ppt-siblings`, { credentials: 'include' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setSiblings(d.siblings || []);
        } catch (e) {
            setSiblings([]);
            setMsg({ ok: false, text: e.message });
        }
    }, [resource._id, API]);

    React.useEffect(() => { load(); }, [load]);

    const allFiles = siblings !== null
        ? [{ ...resource, _isCurrent: true }, ...siblings]
        : [];

    // Upload a new PPT file to the group
    const handleNewFile = async (file) => {
        if (!file) return;
        setUploading(true);
        setUploadProgress('Uploading…');
        setMsg(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('title', file.name.replace(/\.[^.]+$/, ''));
            const r = await fetch(`${API}/upload/ppt-file/${resource._id}`, {
                method: 'POST', credentials: 'include', body: fd,
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setMsg({ ok: true, text: `"${d.title}" added to group.` });
            load();
            onSaved(resource); // refresh parent list
        } catch (e) {
            setMsg({ ok: false, text: e.message });
        } finally {
            setUploading(false);
            setUploadProgress('');
            if (newFileRef.current) newFileRef.current.value = '';
        }
    };

    // Replace file on an existing resource in the group
    const handleReplaceFile = async (file, targetId) => {
        if (!file) return;
        setUploading(true);
        setUploadProgress('Replacing file…');
        setMsg(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const r = await fetch(`${API}/upload/ppt-file/${targetId}?replace=true`, {
                method: 'POST', credentials: 'include', body: fd,
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setMsg({ ok: true, text: 'File replaced successfully.' });
            setReplaceTarget(null);
            load();
            onSaved(d);
        } catch (e) {
            setMsg({ ok: false, text: e.message });
        } finally {
            setUploading(false);
            setUploadProgress('');
            if (replFileRef.current) replFileRef.current.value = '';
        }
    };

    // Delete a sibling resource from the group
    const handleDelete = async (id, title) => {
        if (!window.confirm(`Remove "${title}" from this PPT group? This also deletes it from Cloudinary.`)) return;
        try {
            const r = await fetch(`${API}/admin/resources/${id}`, { method: 'DELETE', credentials: 'include' });
            if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
            setMsg({ ok: true, text: `"${title}" deleted.` });
            load();
            onSaved(resource);
        } catch (e) {
            setMsg({ ok: false, text: e.message });
        }
    };

    return (
        <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#db2777', margin: 0 }}>
                PPT Group Manager
                <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                    {siblings === null ? 'loading…' : `${allFiles.length} file${allFiles.length !== 1 ? 's' : ''} in this subject group`}
                </span>
            </p>
            <p style={{ fontSize: '.75rem', color: 'var(--muted)', margin: 0 }}>
                Files grouped by: <strong>{resource.subject}</strong> · {resource.course?.toUpperCase()} · Sem {resource.semester}
            </p>

            {/* File list */}
            {siblings !== null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {allFiles.map((f) => (
                        <div key={f._id} style={{
                            border: f._isCurrent ? '1.5px solid #db2777' : '1px solid var(--border)',
                            borderRadius: 10, padding: '10px 14px',
                            background: f._isCurrent ? 'var(--note-pink, #fdf2f8)' : 'var(--paper)',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 600, color: 'var(--ink)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {f.title}
                                    {f._isCurrent && <span style={{ marginLeft: 6, fontSize: '.65rem', background: '#db2777',
                                        color: '#fff', padding: '1px 6px', borderRadius: 100 }}>current</span>}
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: '.73rem', color: 'var(--muted)' }}>
                                    {f.storageMode === 'pages' ? `${f.pageCount} pages (paged)` : f.fileUrl ? 'direct file' : 'no file'}
                                    {f.faculty ? ` · ${f.faculty}` : ''}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {f.fileUrl && (
                                    <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                                        style={{ fontSize: '.72rem', color: 'var(--accent)', textDecoration: 'none',
                                            border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                                        <ExternalLink size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />View
                                    </a>
                                )}
                                <button
                                    className={s.outlineBtn}
                                    style={{ fontSize: '.72rem', padding: '3px 8px' }}
                                    onClick={() => { setReplaceTarget(f._id); replFileRef.current?.click(); }}
                                    disabled={uploading}
                                    title="Replace file"
                                >
                                    <Upload size={11} /> Replace
                                </button>
                                {!f._isCurrent && (
                                    <button
                                        className={s.outlineBtn}
                                        style={{ fontSize: '.72rem', padding: '3px 8px', color: '#ef4444', borderColor: '#fca5a5' }}
                                        onClick={() => handleDelete(f._id, f.title)}
                                        disabled={uploading}
                                        title="Delete from group"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Hidden file inputs */}
            <input ref={newFileRef} type="file" accept=".ppt,.pptx,.pdf" style={{ display: 'none' }}
                onChange={e => handleNewFile(e.target.files[0])} />
            <input ref={replFileRef} type="file" accept=".ppt,.pptx,.pdf" style={{ display: 'none' }}
                onChange={e => replaceTarget && handleReplaceFile(e.target.files[0], replaceTarget)} />

            {/* Upload progress */}
            {uploading && (
                <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={s.spin} /> {uploadProgress}
                </p>
            )}

            {/* Status message */}
            {msg && (
                <p style={{ fontSize: '.8rem', color: msg.ok ? '#16a34a' : '#ef4444', margin: 0 }}>{msg.text}</p>
            )}

            {/* Add new file button */}
            <button className={s.outlineBtn} style={{ alignSelf: 'flex-start' }}
                onClick={() => newFileRef.current?.click()} disabled={uploading}>
                <Upload size={13} /> Add new PPT file to group…
            </button>
        </>
    );
}

// ── ResourceEditDrawer ────────────────────────────────────────────────────────
function ResourceEditDrawer({ resource, onClose, onSaved }) {
    const isPaged = resource.storageMode === 'pages';

    // ── Metadata form state ──────────────────────────────────────────────────
    const [form, setForm] = React.useState({
        title:       resource.title || '',
        description: resource.description || '',
        subject:     resource.subject || '',
        faculty:     resource.faculty || '',
        course:      resource.course || 'btech',
        semester:    resource.semester != null ? String(resource.semester) : '',
        branch:      resource.branch || '',
        year:        resource.year != null ? String(resource.year) : '',
        exam:        resource.exam || '',
        type:        resource.type || 'notes',
        source:      resource.source || 'other',
        tags:        (resource.tags || []).join(', '),
        isFree:      !!resource.isFree,
        priority:    String(resource.priority ?? 0),
        pyqExamType: resource.pyqExamType || '',
        pyqYear:     resource.pyqYear ? String(resource.pyqYear) : '',
        pyqSeason:   resource.pyqSeason || '',
        pyqSemester: resource.pyqSemester != null ? String(resource.pyqSemester) : '',
        isPyqFree:   resource.isPyqFree !== false,
        isSolutionFree: !!resource.isSolutionFree,
    });
    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const [metaSaving, setMetaSaving] = React.useState(false);
    const [metaMsg,    setMetaMsg]    = React.useState(null);

    // ── Page manager state ───────────────────────────────────────────────────
    const [pages,       setPages]       = React.useState(resource.pageImages || []);
    const [dragIdx,     setDragIdx]     = React.useState(null);
    const [dragOver,    setDragOver]    = React.useState(null);
    const [pagesSaving, setPagesSaving] = React.useState(false);
    const [pagesMsg,    setPagesMsg]    = React.useState(null);

    // Append from PDF
    const [appendFile,     setAppendFile]     = React.useState(null);
    const [appendStatus,   setAppendStatus]   = React.useState('idle'); // idle|rendering|uploading|done|error
    const [appendProgress, setAppendProgress] = React.useState('');
    const appendRef = React.useRef(null);

    // ── Save metadata ────────────────────────────────────────────────────────
    const saveMetadata = async () => {
        setMetaSaving(true);
        setMetaMsg(null);
        try {
            const payload = {
                ...form,
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                semester: form.type === 'pyq' ? null : (parseInt(form.semester) || null),
                year:     form.year     ? parseInt(form.year)     : null,
                priority: parseInt(form.priority) || 0,
                pyqYear:  form.pyqYear  ? parseInt(form.pyqYear)  : null,
                exam:     form.exam     || null,
                branch:   form.branch   || null,
                pyqExamType: form.pyqExamType || null,
                pyqSeason:   form.pyqSeason   || null,
                pyqSemester: form.pyqSemester  ? parseInt(form.pyqSemester) : null,
            };
            const resp = await fetch(API_BASE() + '/admin/resources/' + resource._id, {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Save failed');
            setMetaMsg({ ok: true, text: 'Saved!' });
            onSaved(data);
        } catch (e) {
            setMetaMsg({ ok: false, text: e.message });
        } finally {
            setMetaSaving(false);
        }
    };

    // ── Page drag-and-drop ───────────────────────────────────────────────────
    const onDragStart = (idx) => setDragIdx(idx);
    const onDragEnter = (idx) => setDragOver(idx);
    const onDragEnd   = () => {
        if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
            const next = [...pages];
            const [moved] = next.splice(dragIdx, 1);
            next.splice(dragOver, 0, moved);
            setPages(next);
        }
        setDragIdx(null);
        setDragOver(null);
    };

    // ── Delete a page ────────────────────────────────────────────────────────
    const deletePage = (idx) => {
        if (!window.confirm('Remove page ' + (idx + 1) + ' from this resource?')) return;
        setPages(p => p.filter((_, i) => i !== idx));
    };

    // ── Save page order / deletions ──────────────────────────────────────────
    const savePages = async () => {
        setPagesSaving(true);
        setPagesMsg(null);
        try {
            const resp = await fetch(API_BASE() + '/admin/resources/' + resource._id + '/pages', {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageImages: pages }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Failed');
            setPagesMsg({ ok: true, text: 'Pages saved! (' + pages.length + ' pages)' });
            onSaved(data);
        } catch (e) {
            setPagesMsg({ ok: false, text: e.message });
        } finally {
            setPagesSaving(false);
        }
    };

    // ── Append pages from a PDF ──────────────────────────────────────────────
    const handleAppendFile = async (file) => {
        if (!file || file.type !== 'application/pdf') return;
        setAppendFile(file);
        setAppendStatus('rendering');
        setAppendProgress('Loading PDF…');
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const buf = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            const total = pdf.numPages;
            const newUrls = [];
            for (let i = 1; i <= total; i++) {
                setAppendStatus('rendering');
                setAppendProgress('Rendering page ' + i + ' of ' + total + '…');
                const blob = await renderPdfPageToBlob(pdf, i);
                setAppendStatus('uploading');
                setAppendProgress('Uploading page ' + i + ' of ' + total + '…');
                const url = await uploadPageBlob(blob, resource._id, pages.length + i);
                newUrls.push(url);
            }
            setPages(p => [...p, ...newUrls]);
            setAppendStatus('done');
            setAppendProgress(total + ' page' + (total !== 1 ? 's' : '') + ' appended — click \'Save pages\' to confirm.');
            setAppendFile(null);
        } catch (e) {
            setAppendStatus('error');
            setAppendProgress(e.message || 'Append failed.');
        }
    };

    const sems = R_SEM_COUNT[form.course] || 8;

    return (
        <div className={s.modalOverlay} onClick={onClose}>
            <div className={s.modal} style={{ maxWidth: 760, width: '95vw' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={s.modalHeader}>
                    <h3 className={s.modalTitle}>Edit Resource</h3>
                    <button className={s.modalClose} onClick={onClose}><X size={15} /></button>
                </div>

                <div className={s.modalBody} style={{ gap: 18 }}>

                    {/* ── Metadata section ── */}
                    <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', margin: 0 }}>Metadata</p>

                    <div className={s.formField}>
                        <label className={s.fieldLabel}>Title</label>
                        <input className={s.input} value={form.title} onChange={e => setF('title', e.target.value)} />
                    </div>

                    <div className={s.formRow}>
                        <div className={s.formField}>
                            <label className={s.fieldLabel}>Course</label>
                            <select className={s.select} value={form.course} onChange={e => { setF('course', e.target.value); setF('semester', '1'); }}>
                                {R_COURSES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                            </select>
                        </div>
                        {form.type !== 'pyq' && (
                            <div className={s.formField}>
                                <label className={s.fieldLabel}>Semester</label>
                                <select className={s.select} value={form.semester} onChange={e => setF('semester', e.target.value)}>
                                    <option value=''>— none —</option>
                                    {Array.from({ length: sems }, (_, i) => i + 1).map(n => (
                                        <option key={n} value={n}>Sem {n}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className={s.formField}>
                            <label className={s.fieldLabel}>Type</label>
                            <select className={s.select} value={form.type} onChange={e => setF('type', e.target.value)}>
                                {R_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={s.formRow}>
                        <div className={s.formField}>
                            <label className={s.fieldLabel}>Branch <span className={s.optional}>(optional)</span></label>
                            <select className={s.select} value={form.branch} onChange={e => setF('branch', e.target.value)}>
                                <option value=''>— All branches —</option>
                                {R_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className={s.formField}>
                            <label className={s.fieldLabel}>Source</label>
                            <select className={s.select} value={form.source} onChange={e => setF('source', e.target.value)}>
                                {R_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={s.formField}>
                        <label className={s.fieldLabel}>Subject</label>
                        <input className={s.input} value={form.subject} onChange={e => setF('subject', e.target.value)} />
                    </div>

                    <div className={s.formRow}>
                        <div className={s.formField}>
                            <label className={s.fieldLabel}>Faculty</label>
                            <input className={s.input} value={form.faculty} onChange={e => setF('faculty', e.target.value)} />
                        </div>
                        <div className={s.formField}>
                            <label className={s.fieldLabel}>Priority <span className={s.optional}>(higher = first)</span></label>
                            <input className={s.input} type='number' value={form.priority} onChange={e => setF('priority', e.target.value)} />
                        </div>
                    </div>

                    <div className={s.formField}>
                        <label className={s.fieldLabel}>Tags <span className={s.optional}>(comma separated)</span></label>
                        <input className={s.input} value={form.tags} onChange={e => setF('tags', e.target.value)} />
                    </div>

                    <div className={s.formField}>
                        <label className={s.fieldLabel}>Description</label>
                        <textarea className={s.textarea} rows={2} value={form.description} onChange={e => setF('description', e.target.value)} />
                    </div>

                    <label className={s.checkRow}>
                        <input type='checkbox' checked={form.isFree} onChange={e => setF('isFree', e.target.checked)} />
                        <span>Free (no subscription needed)</span>
                    </label>

                    {/* PYQ fields */}
                    {form.type === 'pyq' && (
                        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', margin: 0 }}>📄 PYQ Details</p>
                            <div className={s.formRow}>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>Exam Type</label>
                                    <select className={s.select} value={form.pyqExamType} onChange={e => setF('pyqExamType', e.target.value)}>
                                        <option value=''>— Select —</option>
                                        {PYQ_EXAM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>Paper Year</label>
                                    <select className={s.select} value={form.pyqYear} onChange={e => setF('pyqYear', e.target.value)}>
                                        <option value=''>— Select —</option>
                                        {PYQ_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>Season</label>
                                    <select className={s.select} value={form.pyqSeason} onChange={e => setF('pyqSeason', e.target.value)}>
                                        <option value=''>— Select —</option>
                                        <option value='autumn'>Autumn</option>
                                        <option value='spring'>Spring</option>
                                    </select>
                                </div>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>Semester <span style={{ fontWeight: 400, opacity: 0.6 }}>(display)</span></label>
                                    <select className={s.select} value={form.pyqSemester} onChange={e => setF('pyqSemester', e.target.value)}>
                                        <option value=''>— Select —</option>
                                        {Array.from({ length: R_SEM_COUNT[form.course] || 8 }, (_, i) => i + 1).map(n => (
                                            <option key={n} value={n}>Semester {n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label className={s.checkRow}>
                                    <input type='checkbox' checked={form.isPyqFree} onChange={e => setF('isPyqFree', e.target.checked)} />
                                    <span>Question paper is free</span>
                                </label>
                                <label className={s.checkRow}>
                                    <input type='checkbox' checked={form.isSolutionFree} onChange={e => setF('isSolutionFree', e.target.checked)} />
                                    <span>Solution is free</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Save metadata */}
                    {metaMsg && (
                        <p style={{ fontSize: '.8rem', color: metaMsg.ok ? 'var(--color-success, #16a34a)' : '#ef4444', margin: 0 }}>{metaMsg.text}</p>
                    )}
                    <button className={s.actionBtn} onClick={saveMetadata} disabled={metaSaving}>
                        {metaSaving ? <><span className={s.spin} /> Saving…</> : <><Edit2 size={13} /> Save Metadata</>}
                    </button>

                    {/* ── Solution Upload (PYQ only) ── */}
                    {resource.type === 'pyq' && <SolutionUploadSection resource={resource} onSaved={onSaved} />}

                    {/* ── PPT Group Manager (PPT only) ── */}
                    {form.type === 'ppt' && <PptGroupManager resource={resource} onSaved={onSaved} />}

                    {/* ── Page Manager ── */}
                    {isPaged && (
                        <>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                            <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', margin: 0 }}>
                                Page Manager <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({pages.length} pages)</span>
                            </p>
                            <p style={{ fontSize: '.75rem', color: 'var(--muted)', margin: 0 }}>
                                Drag to reorder · click ✕ to delete a page · add pages from a PDF below
                            </p>

                            {/* Page grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                                {pages.map((url, idx) => (
                                    <div
                                        key={url + idx}
                                        draggable
                                        onDragStart={() => onDragStart(idx)}
                                        onDragEnter={() => onDragEnter(idx)}
                                        onDragEnd={onDragEnd}
                                        onDragOver={e => e.preventDefault()}
                                        style={{
                                            position: 'relative',
                                            border: dragOver === idx ? '2px solid var(--accent)' : '1px solid var(--border)',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            cursor: 'grab',
                                            background: 'var(--paper)',
                                            opacity: dragIdx === idx ? 0.4 : 1,
                                        }}
                                    >
                                        <img
                                            src={url}
                                            alt={'p' + (idx + 1)}
                                            style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                                            loading='lazy'
                                        />
                                        {/* page number badge */}
                                        <span style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: '.6rem', padding: '2px 5px', borderRadius: 4 }}>
                                            {idx + 1}
                                        </span>
                                        {/* drag handle */}
                                        <span style={{ position: 'absolute', top: 3, left: 3, color: 'rgba(255,255,255,.7)' }}>
                                            <GripVertical size={12} />
                                        </span>
                                        {/* delete button */}
                                        <button
                                            onClick={() => deletePage(idx)}
                                            style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(239,68,68,.85)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', padding: '2px 4px', display: 'flex', lineHeight: 1 }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Append from PDF */}
                            <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <p style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Append pages from PDF</p>
                                <input
                                    ref={appendRef}
                                    type='file'
                                    accept='application/pdf'
                                    style={{ display: 'none' }}
                                    onChange={e => handleAppendFile(e.target.files[0])}
                                />
                                {appendStatus === 'idle' || appendStatus === 'done' || appendStatus === 'error' ? (
                                    <button
                                        className={s.outlineBtn}
                                        style={{ alignSelf: 'flex-start' }}
                                        onClick={() => appendRef.current?.click()}
                                        disabled={appendStatus === 'rendering' || appendStatus === 'uploading'}
                                    >
                                        <Upload size={13} /> Choose PDF to append…
                                    </button>
                                ) : null}
                                {appendProgress && (
                                    <p style={{ fontSize: '.75rem', color: appendStatus === 'error' ? '#ef4444' : 'var(--muted)', margin: 0 }}>
                                        {(appendStatus === 'rendering' || appendStatus === 'uploading') && <span className={s.spin} style={{ marginRight: 6 }} />}
                                        {appendProgress}
                                    </p>
                                )}
                            </div>

                            {/* Save pages */}
                            {pagesMsg && (
                                <p style={{ fontSize: '.8rem', color: pagesMsg.ok ? 'var(--color-success, #16a34a)' : '#ef4444', margin: 0 }}>{pagesMsg.text}</p>
                            )}
                            <button className={s.actionBtn} onClick={savePages} disabled={pagesSaving}>
                                {pagesSaving ? <><span className={s.spin} /> Saving pages…</> : <><CheckCircle2 size={13} /> Save pages ({pages.length})</>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Resources tab ─────────────────────────────────────────────────────────────
function ResourcesTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [dSearch, setDSearch] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [toast, setToast] = useState(null);
    const [cataloguePicker, setCataloguePicker] = useState(null); // { resource }
    const [editResource, setEditResource] = useState(null);

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (dSearch) params.set("search", dSearch);
            setData(await API(`/resources?${params}`));
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, dSearch]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDSearch(search);
            setPage(1);
        }, 320);
        return () => clearTimeout(t);
    }, [search]);

    const togglePublished = async (r) => {
        try {
            await PATCH(`/resources/${r._id}`, { isPublished: !r.isPublished });
            showToast(
                `"${r.title}" ${r.isPublished ? "unpublished" : "published"}`,
            );
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const toggleFree = async (r) => {
        try {
            await PATCH(`/resources/${r._id}`, { isFree: !r.isFree });
            showToast(`"${r.title}" marked ${r.isFree ? "paid" : "free"}`);
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const deleteResource = async (id) => {
        try {
            await DELETE(`/resources/${id}`);
            showToast("Resource deleted");
            setConfirm(null);
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    const toggleCatalogue = async (r) => {
        // If enabling and it's a pages-mode resource, open picker to choose the page
        if (
            !r.catalogueEnabled &&
            r.storageMode === "pages" &&
            r.pageCount > 0
        ) {
            setCataloguePicker(r);
            return;
        }
        // Otherwise just toggle
        try {
            await PATCH(`/resources/${r._id}`, {
                catalogueEnabled: !r.catalogueEnabled,
            });
            showToast(
                `"${r.title}" ${r.catalogueEnabled ? "removed from" : "added to"} catalogue`,
            );
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    return (
        <div className={s.tabContent}>
            {toast && (
                <div
                    className={`${s.toast} ${toast.ok ? s.toast_ok : s.toast_err}`}
                >
                    {toast.msg}
                </div>
            )}
            {confirm && (
                <Confirm
                    msg={`Delete "${confirm.title}"? This also removes it from Cloudinary.`}
                    onConfirm={() => deleteResource(confirm.id)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            {cataloguePicker && (
                <CataloguePagePicker
                    resource={cataloguePicker}
                    onSave={async (pageIndex) => {
                        try {
                            await PATCH(`/resources/${cataloguePicker._id}`, {
                                catalogueEnabled: true,
                                cataloguePageIndex: pageIndex,
                            });
                            showToast(
                                `"${cataloguePicker.title}" added to catalogue (page ${pageIndex})`,
                            );
                            load();
                        } catch (e) {
                            showToast(e.message, false);
                        } finally {
                            setCataloguePicker(null);
                        }
                    }}
                    onClose={() => setCataloguePicker(null)}
                />
            )}
            {editResource && (
                <ResourceEditDrawer
                    resource={editResource}
                    onClose={() => setEditResource(null)}
                    onSaved={(updated) => {
                        setEditResource(null);
                        showToast('Resource updated');
                        load();
                    }}
                />
            )}

            <div className={s.toolbar}>
                <div className={s.searchWrap}>
                    <Search size={13} className={s.searchIcon} />
                    <input
                        className={s.searchInput}
                        placeholder="Search title, subject…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className={s.clearX}
                            onClick={() => setSearch("")}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
                <button className={s.refreshBtn} onClick={load}>
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <div className={s.loader}>
                    <span className={s.spin} />
                </div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Subject</th>
                                <th>Course</th>
                                <th>Sem</th>
                                <th>Type</th>
                                <th>Uploaded by</th>
                                <th>Views</th>
                                <th>Published</th>
                                <th>Free</th>
                                <th>Catalogue</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.resources?.map((r) => (
                                <tr key={r._id}>
                                    <td>
                                        <p className={s.cellName}>{r.title}</p>
                                    </td>
                                    <td className={s.cellSub}>{r.subject}</td>
                                    <td>{r.course?.toUpperCase()}</td>
                                    <td>{r.semester}</td>
                                    <td>
                                        <span className={s.typeBadge}>
                                            {r.type}
                                        </span>
                                    </td>
                                    <td className={s.cellSub}>
                                        {r.uploadedBy?.name || "—"}
                                    </td>
                                    <td>{r.views}</td>
                                    <td>
                                        <button
                                            className={s.iconBtn}
                                            onClick={() => togglePublished(r)}
                                        >
                                            {r.isPublished ? (
                                                <ToggleRight
                                                    size={16}
                                                    className={s.toggleOn}
                                                />
                                            ) : (
                                                <ToggleLeft size={16} />
                                            )}
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className={s.iconBtn}
                                            onClick={() => toggleFree(r)}
                                        >
                                            {r.isFree ? (
                                                <ToggleRight
                                                    size={16}
                                                    className={s.toggleGreen}
                                                />
                                            ) : (
                                                <ToggleLeft size={16} />
                                            )}
                                        </button>
                                    </td>
                                    <td>
                                        <div className={s.catalogueCell}>
                                            <button
                                                className={s.iconBtn}
                                                title={
                                                    r.storageMode !== "pages"
                                                        ? "Only available for page-mode resources"
                                                        : r.catalogueEnabled
                                                          ? `Page ${r.cataloguePageIndex} — click to disable`
                                                          : "Add to catalogue"
                                                }
                                                disabled={
                                                    r.storageMode !== "pages"
                                                }
                                                onClick={() =>
                                                    toggleCatalogue(r)
                                                }
                                            >
                                                {r.catalogueEnabled ? (
                                                    <ToggleRight
                                                        size={16}
                                                        className={s.toggleOn}
                                                    />
                                                ) : (
                                                    <ToggleLeft
                                                        size={16}
                                                        style={{
                                                            opacity:
                                                                r.storageMode !==
                                                                "pages"
                                                                    ? 0.3
                                                                    : 1,
                                                        }}
                                                    />
                                                )}
                                            </button>
                                            {r.catalogueEnabled && (
                                                <button
                                                    className={s.pagePickBtn}
                                                    title="Change preview page"
                                                    onClick={() =>
                                                        setCataloguePicker(r)
                                                    }
                                                >
                                                    p{r.cataloguePageIndex}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={s.actions}>
                                            {r.fileUrl && (
                                                <a
                                                    href={`/api/resources/${r._id}/view`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={s.iconBtn}
                                                    title="Open file"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                            <button
                                                className={s.iconBtn}
                                                title="Edit resource"
                                                onClick={() => setEditResource(r)}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                                title="Delete"
                                                onClick={() =>
                                                    setConfirm({
                                                        id: r._id,
                                                        title: r.title,
                                                    })
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pagination pagination={data?.pagination} onPage={setPage} />
        </div>
    );
}

// ── Notes tab ─────────────────────────────────────────────────────────────────
function NotesTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [dSearch, setDSearch] = useState("");
    const [preview, setPreview] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (dSearch) params.set("search", dSearch);
            setData(await API(`/notes?${params}`));
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, dSearch]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDSearch(search);
            setPage(1);
        }, 320);
        return () => clearTimeout(t);
    }, [search]);

    const deleteNote = async (id) => {
        try {
            await DELETE(`/notes/${id}`);
            showToast("Note deleted");
            setConfirm(null);
            load();
        } catch (e) {
            showToast(e.message, false);
        }
    };

    return (
        <div className={s.tabContent}>
            {toast && (
                <div
                    className={`${s.toast} ${toast.ok ? s.toast_ok : s.toast_err}`}
                >
                    {toast.msg}
                </div>
            )}
            {confirm && (
                <Confirm
                    msg="Delete this note permanently?"
                    onConfirm={() => deleteNote(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}

            <div className={s.toolbar}>
                <div className={s.searchWrap}>
                    <Search size={13} className={s.searchIcon} />
                    <input
                        className={s.searchInput}
                        placeholder="Search title, content…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className={s.clearX}
                            onClick={() => setSearch("")}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
                <button className={s.refreshBtn} onClick={load}>
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <div className={s.loader}>
                    <span className={s.spin} />
                </div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Owner</th>
                                <th>Subject</th>
                                <th>Tags</th>
                                <th>Pinned</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.notes?.map((n) => (
                                <tr key={n._id}>
                                    <td>
                                        <p className={s.cellName}>{n.title}</p>
                                    </td>
                                    <td>
                                        <div>
                                            <p className={s.cellName}>
                                                {n.user?.name || "—"}
                                            </p>
                                            <p className={s.cellSub}>
                                                {n.user?.email || ""}
                                            </p>
                                        </div>
                                    </td>
                                    <td className={s.cellSub}>
                                        {n.subject || "—"}
                                    </td>
                                    <td className={s.cellSub}>
                                        {n.tags?.join(", ") || "—"}
                                    </td>
                                    <td>{n.isPinned ? "📌" : "—"}</td>
                                    <td className={s.dateCell}>
                                        {fmtDate(n.createdAt)}
                                    </td>
                                    <td>
                                        <div className={s.actions}>
                                            <button
                                                className={s.iconBtn}
                                                title="Preview"
                                                onClick={() => setPreview(n)}
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                                title="Delete"
                                                onClick={() =>
                                                    setConfirm(n._id)
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pagination pagination={data?.pagination} onPage={setPage} />

            {preview && (
                <div
                    className={s.drawerOverlay}
                    onClick={() => setPreview(null)}
                >
                    <div
                        className={s.drawer}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.drawerHead}>
                            <p className={s.drawerName}>{preview.title}</p>
                            <button
                                className={s.drawerClose}
                                onClick={() => setPreview(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className={s.cellSub}>
                            {preview.user?.name} · {preview.user?.email}
                        </p>
                        <div className={s.notePreview}>
                            {preview.content || <em>Empty note</em>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Promo Codes tab ───────────────────────────────────────────────────────────
function PromoCodesTab() {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // promo being edited
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const EMPTY_FORM = {
        code: "",
        description: "",
        applicablePlan: "any",
        discountType: "fixed",
        discountValue: "",
        maxUses: "",
        expiresAt: "",
        isActive: true,
    };
    const [form, setForm] = useState(EMPTY_FORM);

    const load = async () => {
        setLoading(true);
        try {
            setPromos(await promoApi.getAll());
        } catch {
            setError("Failed to load promo codes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setEditTarget(null);
        setShowForm(true);
    };
    const openEdit = (p) => {
        setForm({
            code: p.code,
            description: p.description || "",
            applicablePlan: p.applicablePlan,
            discountType: p.discountType,
            discountValue: p.discountValue,
            maxUses: p.maxUses ?? "",
            expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : "",
            isActive: p.isActive,
        });
        setEditTarget(p);
        setShowForm(true);
    };
    const closeForm = () => {
        setShowForm(false);
        setEditTarget(null);
        setError("");
    };

    const handleSave = async () => {
        if (!form.code.trim()) {
            setError("Code is required.");
            return;
        }
        if (form.discountValue === "" || isNaN(Number(form.discountValue))) {
            setError("Discount value is required.");
            return;
        }
        setSaving(true);
        setError("");
        const payload = {
            ...form,
            code: form.code.trim().toUpperCase(),
            discountValue: Number(form.discountValue),
            maxUses: form.maxUses !== "" ? Number(form.maxUses) : null,
            expiresAt: form.expiresAt || null,
        };
        try {
            if (editTarget) {
                const { code: _c, ...rest } = payload; // code is immutable
                await promoApi.update(editTarget._id, rest);
            } else {
                await promoApi.create(payload);
            }
            await load();
            closeForm();
        } catch (err) {
            setError(err?.response?.data?.error || "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (p) => {
        try {
            await promoApi.toggle(p._id);
            await load();
        } catch {
            setError("Toggle failed.");
        }
    };

    const handleDelete = async (p) => {
        if (!window.confirm(`Delete promo "${p.code}"?`)) return;
        try {
            await promoApi.delete(p._id);
            await load();
        } catch {
            setError("Delete failed.");
        }
    };

    const PLAN_LABELS = {
        any: "Any plan",
        semester: "Semester only",
        year: "Year only",
    };

    return (
        <div className={s.tabContent}>
            <div className={s.tabToolbar}>
                <p className={s.tabCount}>
                    {promos.length} promo code{promos.length !== 1 ? "s" : ""}
                </p>
                <button className={s.addBtn} onClick={openCreate}>
                    <Plus size={14} /> New promo code
                </button>
            </div>

            {error && <p className={s.errorBanner}>{error}</p>}

            {/* Create / Edit form */}
            {showForm && (
                <div className={s.promoFormCard}>
                    <h3 className={s.promoFormTitle}>
                        {editTarget
                            ? `Edit — ${editTarget.code}`
                            : "Create promo code"}
                    </h3>

                    <div className={s.promoFormGrid}>
                        {/* Code */}
                        {!editTarget && (
                            <div className={s.promoField}>
                                <label className={s.promoLabel}>Code *</label>
                                <input
                                    className={s.promoInput}
                                    value={form.code}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            code: e.target.value.toUpperCase(),
                                        }))
                                    }
                                    placeholder="e.g. MIHIR19"
                                    maxLength={24}
                                    style={{
                                        fontFamily: "monospace",
                                        letterSpacing: ".06em",
                                    }}
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div
                            className={s.promoField}
                            style={{ gridColumn: editTarget ? "1 / -1" : "" }}
                        >
                            <label className={s.promoLabel}>Description</label>
                            <input
                                className={s.promoInput}
                                value={form.description}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        description: e.target.value,
                                    }))
                                }
                                placeholder="Internal note"
                            />
                        </div>

                        {/* Applicable plan */}
                        <div className={s.promoField}>
                            <label className={s.promoLabel}>
                                Applicable plan
                            </label>
                            <select
                                className={s.promoSelect}
                                value={form.applicablePlan}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        applicablePlan: e.target.value,
                                    }))
                                }
                            >
                                <option value="any">Any plan</option>
                                <option value="semester">Semester only</option>
                                <option value="year">Year only</option>
                            </select>
                        </div>

                        {/* Discount type */}
                        <div className={s.promoField}>
                            <label className={s.promoLabel}>
                                Discount type
                            </label>
                            <select
                                className={s.promoSelect}
                                value={form.discountType}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        discountType: e.target.value,
                                    }))
                                }
                            >
                                <option value="fixed">Fixed price (₹)</option>
                                <option value="percent">Percent off (%)</option>
                            </select>
                        </div>

                        {/* Discount value */}
                        <div className={s.promoField}>
                            <label className={s.promoLabel}>
                                {form.discountType === "fixed"
                                    ? "Final price (₹) *"
                                    : "Discount % *"}
                            </label>
                            <input
                                className={s.promoInput}
                                type="number"
                                min="0"
                                value={form.discountValue}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        discountValue: e.target.value,
                                    }))
                                }
                                placeholder={
                                    form.discountType === "fixed"
                                        ? "e.g. 19"
                                        : "e.g. 20"
                                }
                            />
                        </div>

                        {/* Max uses */}
                        <div className={s.promoField}>
                            <label className={s.promoLabel}>
                                Max uses (blank = unlimited)
                            </label>
                            <input
                                className={s.promoInput}
                                type="number"
                                min="1"
                                value={form.maxUses}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        maxUses: e.target.value,
                                    }))
                                }
                                placeholder="Unlimited"
                            />
                        </div>

                        {/* Expiry date */}
                        <div className={s.promoField}>
                            <label className={s.promoLabel}>
                                Expiry date (optional)
                            </label>
                            <input
                                className={s.promoInput}
                                type="date"
                                value={form.expiresAt}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        expiresAt: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        {/* Active toggle */}
                        <div className={s.promoField}>
                            <label className={s.promoLabel}>Status</label>
                            <div className={s.promoToggleRow}>
                                <button
                                    className={`${s.promoToggleBtn} ${form.isActive ? s.promoToggleOn : ""}`}
                                    onClick={() =>
                                        setForm((f) => ({
                                            ...f,
                                            isActive: true,
                                        }))
                                    }
                                    type="button"
                                >
                                    <CheckCircle2 size={13} /> Active
                                </button>
                                <button
                                    className={`${s.promoToggleBtn} ${!form.isActive ? s.promoToggleOn : ""}`}
                                    onClick={() =>
                                        setForm((f) => ({
                                            ...f,
                                            isActive: false,
                                        }))
                                    }
                                    type="button"
                                    style={
                                        !form.isActive
                                            ? {
                                                  background: "#fff1f2",
                                                  borderColor: "#fca5a5",
                                                  color: "#dc2626",
                                              }
                                            : {}
                                    }
                                >
                                    <X size={13} /> Inactive
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && <p className={s.promoFormError}>{error}</p>}

                    <div className={s.promoFormActions}>
                        <button
                            className={s.promoSaveBtn}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? "Saving…"
                                : editTarget
                                  ? "Save changes"
                                  : "Create"}
                        </button>
                        <button
                            className={s.promoCancelBtn}
                            onClick={closeForm}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <p className={s.loadingText}>Loading…</p>
            ) : promos.length === 0 ? (
                <div className={s.emptyState}>
                    <Tag size={28} />
                    <p>No promo codes yet. Create one above.</p>
                </div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Plan</th>
                                <th>Discount</th>
                                <th>Uses</th>
                                <th>Expires</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promos.map((p) => (
                                <tr key={p._id}>
                                    <td>
                                        <span
                                            className={`${s.promoCodeCell} ${!p.isActive ? s.promoCodeInactive : ""}`}
                                        >
                                            {p.code}
                                        </span>
                                        {p.description && (
                                            <span className={s.promoDescCell}>
                                                {p.description}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={s.promoPlanBadge}>
                                            {PLAN_LABELS[p.applicablePlan]}
                                        </span>
                                    </td>
                                    <td>
                                        {p.discountType === "fixed" ? (
                                            <>
                                                <span
                                                    className={s.promoDiscount}
                                                >
                                                    ₹{p.discountValue} fixed
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    className={s.promoDiscount}
                                                >
                                                    {p.discountValue}% off
                                                </span>
                                            </>
                                        )}
                                    </td>
                                    <td>
                                        {p.maxUses ? (
                                            <div className={s.promoUsesWrap}>
                                                <span
                                                    className={s.promoUsesText}
                                                >
                                                    {p.usedCount} / {p.maxUses}
                                                </span>
                                                <div className={s.promoUsesBar}>
                                                    <div
                                                        className={
                                                            s.promoUsesBarFill
                                                        }
                                                        style={{
                                                            width: `${Math.min(100, (p.usedCount / p.maxUses) * 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span
                                                style={{
                                                    fontSize: ".78rem",
                                                    color: "var(--muted)",
                                                }}
                                            >
                                                {p.usedCount} · ∞
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {p.expiresAt
                                            ? new Date(
                                                  p.expiresAt,
                                              ).toLocaleDateString("en-IN")
                                            : "—"}
                                    </td>
                                    <td>
                                        <span
                                            className={`${s.badge} ${p.isActive ? s.badgeGreen : s.badgeRed}`}
                                        >
                                            {p.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className={s.actionCell}>
                                        <button
                                            className={s.iconBtn}
                                            title="Edit"
                                            onClick={() => openEdit(p)}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className={s.iconBtn}
                                            title={
                                                p.isActive
                                                    ? "Deactivate"
                                                    : "Activate"
                                            }
                                            onClick={() => handleToggle(p)}
                                        >
                                            {p.isActive ? (
                                                <ToggleRight size={14} />
                                            ) : (
                                                <ToggleOff size={14} />
                                            )}
                                        </button>
                                        <button
                                            className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                            title="Delete"
                                            onClick={() => handleDelete(p)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Curriculum tab ────────────────────────────────────────────────────────────
function CurriculumTab() {
    const [curricula, setCurricula] = useState([]);
    const [selected, setSelected] = useState(null); // full curriculum doc
    const [activeSem, setActiveSem] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filterProgram, setFilterProgram] = useState("btech");
    const [search, setSearch] = useState("");

    // Add subject form
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({
        name: "",
        code: "",
        shortName: "",
        isCommon: false,
    });
    const [addErr, setAddErr] = useState("");

    // Edit subject form
    const [editSubject, setEditSubject] = useState(null);
    const [editForm, setEditForm] = useState({});

    const PROGRAMS = [
        { id: "btech", label: "B.Tech" },
        { id: "btech_lateral", label: "B.Tech Lateral" },
        { id: "mba", label: "MBA" },
        { id: "mca", label: "MCA" },
    ];

    useEffect(() => {
        setLoading(true);
        curriculumApi
            .getAll(filterProgram)
            .then(setCurricula)
            .catch(() => setCurricula([]))
            .finally(() => setLoading(false));
        setSelected(null);
    }, [filterProgram]);

    const openBranch = async (cur) => {
        try {
            const full = await curriculumApi.getOne(cur._id);
            setSelected(full);
            setActiveSem(1);
            setShowAdd(false);
            setEditSubject(null);
        } catch {
            alert("Failed to load branch details.");
        }
    };

    const currentSemSubjects = selected
        ? selected.semesters.find((s) => s.sem === activeSem)?.subjects || []
        : [];

    const handleAddSubject = async () => {
        if (!addForm.name.trim()) {
            setAddErr("Name is required.");
            return;
        }
        setSaving(true);
        setAddErr("");
        try {
            const updated = await curriculumApi.addSubject(selected._id, {
                sem: activeSem,
                ...addForm,
            });
            setSelected(updated);
            setAddForm({ name: "", code: "", shortName: "", isCommon: false });
            setShowAdd(false);
        } catch (e) {
            setAddErr(e?.response?.data?.error || "Failed to add subject.");
        } finally {
            setSaving(false);
        }
    };

    const handleEditSubject = async () => {
        setSaving(true);
        try {
            const updated = await curriculumApi.editSubject(selected._id, {
                sem: activeSem,
                oldName: editSubject.name,
                ...editForm,
            });
            setSelected(updated);
            setEditSubject(null);
        } catch (e) {
            alert(e?.response?.data?.error || "Failed to update subject.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSubject = async (subj) => {
        if (!confirm(`Delete "${subj.name}" from Sem ${activeSem}?`)) return;
        try {
            const updated = await curriculumApi.deleteSubject(selected._id, {
                sem: activeSem,
                name: subj.name,
            });
            setSelected(updated);
        } catch (e) {
            alert(e?.response?.data?.error || "Failed to delete.");
        }
    };

    const filteredCurricula = curricula.filter((c) =>
        c.branch.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className={s.tabContent}>
            {/* Left panel: branch list */}
            <div className={s.curriculumLayout}>
                <div className={s.curriculumSidebar}>
                    <div className={s.curriculumSidebarHead}>
                        <div
                            className={s.chipGroup}
                            style={{ flexWrap: "wrap" }}
                        >
                            {PROGRAMS.map((p) => (
                                <button
                                    key={p.id}
                                    className={`${s.chip} ${filterProgram === p.id ? s.chipOn : ""}`}
                                    onClick={() => {
                                        setFilterProgram(p.id);
                                        setSearch("");
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <input
                            className={s.inlineInput}
                            placeholder="Search branch…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: "100%", marginTop: 8 }}
                        />
                    </div>
                    {loading ? (
                        <div className={s.loader}>
                            <span className={s.spin} />
                        </div>
                    ) : (
                        <div className={s.curriculumBranchList}>
                            {filteredCurricula.map((cur) => (
                                <button
                                    key={cur._id}
                                    className={`${s.curriculumBranchItem} ${selected?._id === cur._id ? s.curriculumBranchItemOn : ""}`}
                                    onClick={() => openBranch(cur)}
                                >
                                    <span className={s.curriculumBranchName}>
                                        {cur.branch}
                                    </span>
                                    <span className={s.curriculumBranchMeta}>
                                        {cur.totalSems} sems
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right panel: semester + subjects */}
                {selected ? (
                    <div className={s.curriculumMain}>
                        <div className={s.curriculumMainHead}>
                            <div>
                                <p className={s.cellMain}>{selected.branch}</p>
                                <p className={s.cellSub}>
                                    {selected.program} · {selected.totalSems}{" "}
                                    semesters
                                </p>
                            </div>
                            <button
                                className={s.addBtn}
                                onClick={() => {
                                    setShowAdd(true);
                                    setEditSubject(null);
                                }}
                            >
                                + Add Subject
                            </button>
                        </div>

                        {/* Sem tabs */}
                        <div className={s.semTabs}>
                            {Array.from(
                                { length: selected.totalSems },
                                (_, i) => i + 1,
                            ).map((n) => {
                                const count =
                                    selected.semesters.find((s) => s.sem === n)
                                        ?.subjects.length || 0;
                                return (
                                    <button
                                        key={n}
                                        className={`${s.semTab} ${activeSem === n ? s.semTabOn : ""}`}
                                        onClick={() => {
                                            setActiveSem(n);
                                            setShowAdd(false);
                                            setEditSubject(null);
                                        }}
                                    >
                                        Sem {n}
                                        {count > 0 && (
                                            <span className={s.semTabCount}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Add subject form */}
                        {showAdd && (
                            <div className={s.curriculumAddForm}>
                                <p className={s.formLabel}>
                                    Add subject to Sem {activeSem}
                                </p>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <input
                                        className={s.inlineInput}
                                        placeholder="Subject name *"
                                        value={addForm.name}
                                        onChange={(e) =>
                                            setAddForm((f) => ({
                                                ...f,
                                                name: e.target.value,
                                            }))
                                        }
                                        style={{ flex: 2, minWidth: 160 }}
                                    />
                                    <input
                                        className={s.inlineInput}
                                        placeholder="Short name (e.g. ML)"
                                        value={addForm.shortName}
                                        onChange={(e) =>
                                            setAddForm((f) => ({
                                                ...f,
                                                shortName: e.target.value,
                                            }))
                                        }
                                        style={{ flex: 1, minWidth: 100 }}
                                    />
                                    <input
                                        className={s.inlineInput}
                                        placeholder="Code (e.g. CS6001)"
                                        value={addForm.code}
                                        onChange={(e) =>
                                            setAddForm((f) => ({
                                                ...f,
                                                code: e.target.value,
                                            }))
                                        }
                                        style={{ flex: 1, minWidth: 110 }}
                                    />
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginTop: 6,
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="isCommon"
                                        checked={addForm.isCommon}
                                        onChange={(e) =>
                                            setAddForm((f) => ({
                                                ...f,
                                                isCommon: e.target.checked,
                                            }))
                                        }
                                    />
                                    <label
                                        htmlFor="isCommon"
                                        className={s.cellSub}
                                    >
                                        Common subject (shared across branches)
                                    </label>
                                </div>
                                {addErr && (
                                    <p
                                        style={{
                                            color: "#ef4444",
                                            fontSize: ".8rem",
                                            marginTop: 4,
                                        }}
                                    >
                                        {addErr}
                                    </p>
                                )}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        marginTop: 8,
                                    }}
                                >
                                    <button
                                        className={s.actionBtn}
                                        onClick={handleAddSubject}
                                        disabled={saving}
                                    >
                                        {saving ? "Adding…" : "Add"}
                                    </button>
                                    <button
                                        className={s.outlineBtn}
                                        onClick={() => {
                                            setShowAdd(false);
                                            setAddErr("");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Edit subject form */}
                        {editSubject && (
                            <div className={s.curriculumAddForm}>
                                <p className={s.formLabel}>
                                    Edit "{editSubject.name}"
                                </p>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <input
                                        className={s.inlineInput}
                                        placeholder="Subject name *"
                                        value={editForm.name}
                                        onChange={(e) =>
                                            setEditForm((f) => ({
                                                ...f,
                                                name: e.target.value,
                                            }))
                                        }
                                        style={{ flex: 2, minWidth: 160 }}
                                    />
                                    <input
                                        className={s.inlineInput}
                                        placeholder="Short name"
                                        value={editForm.shortName}
                                        onChange={(e) =>
                                            setEditForm((f) => ({
                                                ...f,
                                                shortName: e.target.value,
                                            }))
                                        }
                                        style={{ flex: 1, minWidth: 100 }}
                                    />
                                    <input
                                        className={s.inlineInput}
                                        placeholder="Code"
                                        value={editForm.code}
                                        onChange={(e) =>
                                            setEditForm((f) => ({
                                                ...f,
                                                code: e.target.value,
                                            }))
                                        }
                                        style={{ flex: 1, minWidth: 110 }}
                                    />
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginTop: 6,
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="isCommonEdit"
                                        checked={editForm.isCommon}
                                        onChange={(e) =>
                                            setEditForm((f) => ({
                                                ...f,
                                                isCommon: e.target.checked,
                                            }))
                                        }
                                    />
                                    <label
                                        htmlFor="isCommonEdit"
                                        className={s.cellSub}
                                    >
                                        Common subject
                                    </label>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        marginTop: 8,
                                    }}
                                >
                                    <button
                                        className={s.actionBtn}
                                        onClick={handleEditSubject}
                                        disabled={saving}
                                    >
                                        {saving ? "Saving…" : "Save"}
                                    </button>
                                    <button
                                        className={s.outlineBtn}
                                        onClick={() => setEditSubject(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Subject list */}
                        {currentSemSubjects.length === 0 ? (
                            <div
                                className={s.empty}
                                style={{ padding: "32px 0" }}
                            >
                                <p>No subjects yet for Sem {activeSem}.</p>
                                <button
                                    className={s.emptyBtn}
                                    onClick={() => setShowAdd(true)}
                                >
                                    Add first subject
                                </button>
                            </div>
                        ) : (
                            <div className={s.tableWrap}>
                                <table className={s.table}>
                                    <thead>
                                        <tr>
                                            <th>Subject Name</th>
                                            <th>Short</th>
                                            <th>Code</th>
                                            <th>Common</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentSemSubjects.map((subj, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <span
                                                        className={s.cellMain}
                                                    >
                                                        {subj.name}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={s.cellSub}>
                                                        {subj.shortName || "—"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={s.cellSub}>
                                                        {subj.code || "—"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {subj.isCommon && (
                                                        <span
                                                            className={s.badge}
                                                            style={{
                                                                background:
                                                                    "var(--note-sky)",
                                                                color: "#0369a1",
                                                            }}
                                                        >
                                                            common
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className={s.actions}>
                                                        <button
                                                            className={
                                                                s.iconBtn
                                                            }
                                                            title="Edit"
                                                            onClick={() => {
                                                                setEditSubject(
                                                                    subj,
                                                                );
                                                                setEditForm({
                                                                    name: subj.name,
                                                                    code: subj.code,
                                                                    shortName:
                                                                        subj.shortName,
                                                                    isCommon:
                                                                        subj.isCommon,
                                                                });
                                                                setShowAdd(
                                                                    false,
                                                                );
                                                            }}
                                                        >
                                                            ✎
                                                        </button>
                                                        <button
                                                            className={`${s.iconBtn} ${s.iconBtnDanger}`}
                                                            title="Delete"
                                                            onClick={() =>
                                                                handleDeleteSubject(
                                                                    subj,
                                                                )
                                                            }
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={s.curriculumEmpty}>
                        <p>Select a branch to manage its subjects</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────
const PACK_OPTIONS = [
    { value: "semester", label: "Semester" },
    { value: "year", label: "Year" },
];
const COLOR_OPTIONS = [
    { value: "accent", label: "Accent (orange)" },
    { value: "gold", label: "Gold" },
    { value: "default", label: "Default (grey)" },
];

const emptyPlanForm = {
    pack: "semester",
    name: "",
    headline: "",
    period: "",
    priceINR: "",
    durationMode: "days", // 'days' | 'date'
    durationDays: "",
    fixedExpiryDate: "",
    perks: "", // newline-separated in the textarea
    color: "accent",
    popular: false,
    cta: "",
    isActive: true,
    sortOrder: "0",
};

function PlansTab() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // plan._id being edited, or "new"
    const [form, setForm] = useState(emptyPlanForm);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState(null);

    const loadPlans = useCallback(async () => {
        setLoading(true);
        try {
            const data = await plansApi.adminGetAll();
            setPlans(data);
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const openNew = () => {
        setForm(emptyPlanForm);
        setEditing("new");
        setErr(null);
    };

    const openEdit = (plan) => {
        setForm({
            pack: plan.pack,
            name: plan.name,
            headline: plan.headline || "",
            period: plan.period || "",
            priceINR: String(plan.priceINR),
            durationMode: plan.fixedExpiryDate ? "date" : "days",
            durationDays: plan.durationDays ? String(plan.durationDays) : "",
            fixedExpiryDate: plan.fixedExpiryDate
                ? new Date(plan.fixedExpiryDate).toISOString().split("T")[0]
                : "",
            perks: (plan.perks || []).join("\n"),
            color: plan.color || "accent",
            popular: plan.popular || false,
            cta: plan.cta || "",
            isActive: plan.isActive !== false,
            sortOrder: String(plan.sortOrder || 0),
        });
        setEditing(plan._id);
        setErr(null);
    };

    const handleSave = async () => {
        setErr(null);
        if (!form.name.trim() || !form.priceINR) {
            setErr("Name and price are required.");
            return;
        }
        if (form.durationMode === "days" && !form.durationDays) {
            setErr("Duration (days) is required.");
            return;
        }
        if (form.durationMode === "date" && !form.fixedExpiryDate) {
            setErr("Fixed expiry date is required.");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                priceINR: Number(form.priceINR),
                durationDays:
                    form.durationMode === "days"
                        ? Number(form.durationDays)
                        : null,
                fixedExpiryDate:
                    form.durationMode === "date" ? form.fixedExpiryDate : null,
                sortOrder: Number(form.sortOrder) || 0,
                perks: form.perks
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean),
                cta: form.cta.trim() || `Pay ₹${form.priceINR}`,
            };
            if (editing === "new") {
                await plansApi.create(payload);
            } else {
                await plansApi.update(editing, payload);
            }
            setEditing(null);
            loadPlans();
        } catch (e) {
            setErr(e.message || "Save failed.");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (
            !confirm(
                "Delete this plan? This won't affect existing subscriptions.",
            )
        )
            return;
        try {
            await plansApi.delete(id);
            loadPlans();
        } catch (e) {
            alert(e.message || "Delete failed.");
        }
    };

    const toggleActive = async (plan) => {
        await plansApi.update(plan._id, { isActive: !plan.isActive });
        loadPlans();
    };

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <div className={s.plansTabWrap}>
            {/* Header */}
            <div className={s.plansTabHeader}>
                <div>
                    <h3 className={s.sectionTitle}>Subscription Plans</h3>
                    <p className={s.plansTabSub}>
                        These appear on the Pricing page. Changes are live
                        immediately.
                    </p>
                </div>
                <button className={s.addBtn} onClick={openNew}>
                    <Plus size={14} /> New Plan
                </button>
            </div>

            {loading && <p className={s.histLoading}>Loading…</p>}

            {/* Plan list */}
            {!loading && (
                <div className={s.plansList}>
                    {plans.length === 0 && (
                        <div className={s.plansEmpty}>
                            <p>
                                No plans yet. Create one to show it on the
                                Pricing page.
                            </p>
                        </div>
                    )}
                    {plans.map((plan) => (
                        <div
                            key={plan._id}
                            className={`${s.planRow} ${!plan.isActive ? s.planRowInactive : ""}`}
                        >
                            <div className={s.planRowLeft}>
                                <span
                                    className={`${s.packBadge} ${s[`pack_${plan.pack}`]}`}
                                >
                                    {plan.pack}
                                </span>
                                <div>
                                    <span className={s.planRowName}>
                                        {plan.name}
                                    </span>
                                    {plan.popular && (
                                        <span className={s.popularChip}>
                                            ⭐ Popular
                                        </span>
                                    )}
                                    <p className={s.planRowMeta}>
                                        ₹{plan.priceINR} · {plan.durationDays}d
                                        · {plan.period}
                                    </p>
                                </div>
                            </div>
                            <div className={s.planRowActions}>
                                <button
                                    className={`${s.toggleActiveBtn} ${plan.isActive ? s.toggleActiveOn : s.toggleActiveOff}`}
                                    onClick={() => toggleActive(plan)}
                                    title={
                                        plan.isActive
                                            ? "Hide from pricing page"
                                            : "Show on pricing page"
                                    }
                                >
                                    {plan.isActive ? (
                                        <ToggleRight size={18} />
                                    ) : (
                                        <ToggleLeft size={18} />
                                    )}
                                </button>
                                <button
                                    className={s.iconBtn}
                                    onClick={() => openEdit(plan)}
                                    title="Edit"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    className={s.iconBtnDanger}
                                    onClick={() => handleDelete(plan._id)}
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit modal */}
            {editing && (
                <div
                    className={s.modalOverlay}
                    onClick={() => setEditing(null)}
                >
                    <div
                        className={s.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={s.modalHeader}>
                            <h3 className={s.modalTitle}>
                                {editing === "new" ? "New Plan" : "Edit Plan"}
                            </h3>
                            <button
                                className={s.modalClose}
                                onClick={() => setEditing(null)}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className={s.modalBody}>
                            {/* Pack + Color row */}
                            <div className={s.formRow}>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        Pack type
                                    </label>
                                    <select
                                        className={s.select}
                                        value={form.pack}
                                        onChange={(e) =>
                                            set("pack", e.target.value)
                                        }
                                    >
                                        {PACK_OPTIONS.map((o) => (
                                            <option
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        Color theme
                                    </label>
                                    <select
                                        className={s.select}
                                        value={form.color}
                                        onChange={(e) =>
                                            set("color", e.target.value)
                                        }
                                    >
                                        {COLOR_OPTIONS.map((o) => (
                                            <option
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Name + Period */}
                            <div className={s.formRow}>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        Plan name{" "}
                                        <span className={s.req}>*</span>
                                    </label>
                                    <input
                                        className={s.input}
                                        placeholder="e.g. Semester"
                                        value={form.name}
                                        onChange={(e) =>
                                            set("name", e.target.value)
                                        }
                                    />
                                </div>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        Period label
                                    </label>
                                    <input
                                        className={s.input}
                                        placeholder="e.g. per semester"
                                        value={form.period}
                                        onChange={(e) =>
                                            set("period", e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            {/* Price + Duration */}
                            <div className={s.formRow}>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        Price (₹){" "}
                                        <span className={s.req}>*</span>
                                    </label>
                                    <input
                                        className={s.input}
                                        type="number"
                                        min={1}
                                        placeholder="52"
                                        value={form.priceINR}
                                        onChange={(e) =>
                                            set("priceINR", e.target.value)
                                        }
                                    />
                                </div>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        Duration{" "}
                                        <span className={s.req}>*</span>
                                    </label>
                                    {/* Mode toggle */}
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 6,
                                            marginBottom: 8,
                                        }}
                                    >
                                        {[
                                            {
                                                id: "days",
                                                label: "⏱ No. of days",
                                            },
                                            {
                                                id: "date",
                                                label: "📅 Fixed expiry",
                                            },
                                        ].map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                className={`${s.chip} ${form.durationMode === m.id ? s.chipOn : ""}`}
                                                onClick={() =>
                                                    set("durationMode", m.id)
                                                }
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                    {form.durationMode === "days" ? (
                                        <input
                                            className={s.input}
                                            type="number"
                                            min={1}
                                            placeholder="180"
                                            value={form.durationDays}
                                            onChange={(e) =>
                                                set(
                                                    "durationDays",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    ) : (
                                        <>
                                            <input
                                                className={s.input}
                                                type="date"
                                                min={
                                                    new Date(
                                                        Date.now() + 86400000,
                                                    )
                                                        .toISOString()
                                                        .split("T")[0]
                                                }
                                                value={form.fixedExpiryDate}
                                                onChange={(e) =>
                                                    set(
                                                        "fixedExpiryDate",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {form.fixedExpiryDate && (
                                                <p
                                                    style={{
                                                        fontSize: "0.72rem",
                                                        color: "var(--muted)",
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    All subscribers will expire
                                                    on{" "}
                                                    <strong>
                                                        {new Date(
                                                            form.fixedExpiryDate,
                                                        ).toLocaleDateString(
                                                            "en-IN",
                                                            {
                                                                day: "numeric",
                                                                month: "long",
                                                                year: "numeric",
                                                            },
                                                        )}
                                                    </strong>{" "}
                                                    regardless of when they
                                                    subscribed.{" "}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            set(
                                                                "fixedExpiryDate",
                                                                "",
                                                            )
                                                        }
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            color: "var(--accent)",
                                                            cursor: "pointer",
                                                            padding: 0,
                                                            fontSize: "inherit",
                                                        }}
                                                    >
                                                        Clear
                                                    </button>
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Headline */}
                            <div className={s.formField}>
                                <label className={s.fieldLabel}>Headline</label>
                                <input
                                    className={s.input}
                                    placeholder="e.g. Unlock one full semester"
                                    value={form.headline}
                                    onChange={(e) =>
                                        set("headline", e.target.value)
                                    }
                                />
                            </div>

                            {/* CTA + Sort */}
                            <div className={s.formRow}>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        CTA button text{" "}
                                        <span className={s.optional}>
                                            (defaults to "Pay ₹
                                            {form.priceINR || "?"}")
                                        </span>
                                    </label>
                                    <input
                                        className={s.input}
                                        placeholder={`Pay ₹${form.priceINR || "?"}`}
                                        value={form.cta}
                                        onChange={(e) =>
                                            set("cta", e.target.value)
                                        }
                                    />
                                </div>
                                <div className={s.formField}>
                                    <label className={s.fieldLabel}>
                                        Sort order
                                    </label>
                                    <input
                                        className={s.input}
                                        type="number"
                                        min={0}
                                        value={form.sortOrder}
                                        onChange={(e) =>
                                            set("sortOrder", e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            {/* Perks */}
                            <div className={s.formField}>
                                <label className={s.fieldLabel}>
                                    Perks{" "}
                                    <span className={s.optional}>
                                        (one per line)
                                    </span>
                                </label>
                                <textarea
                                    className={s.textarea}
                                    rows={5}
                                    placeholder={
                                        "All resources for your semester\nNotes, PYQs, assignments\nValid for 6 months"
                                    }
                                    value={form.perks}
                                    onChange={(e) =>
                                        set("perks", e.target.value)
                                    }
                                />
                            </div>

                            {/* Toggles */}
                            <div className={s.formToggles}>
                                <label className={s.checkRow}>
                                    <input
                                        type="checkbox"
                                        checked={form.popular}
                                        onChange={(e) =>
                                            set("popular", e.target.checked)
                                        }
                                    />
                                    ⭐ Mark as popular / best value
                                </label>
                                <label className={s.checkRow}>
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) =>
                                            set("isActive", e.target.checked)
                                        }
                                    />
                                    Active (visible on Pricing page)
                                </label>
                            </div>

                            {err && (
                                <div
                                    className={`${s.resultBanner} ${s.resultErr}`}
                                >
                                    <AlertCircle size={13} /> {err}
                                </div>
                            )}
                        </div>

                        <div className={s.modalFooter}>
                            <button
                                className={s.outlineBtn}
                                onClick={() => setEditing(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={s.sendBtn}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <RefreshCw size={13} className={s.spin} />
                                ) : (
                                    <CheckCircle2 size={13} />
                                )}
                                {saving
                                    ? "Saving…"
                                    : editing === "new"
                                      ? "Create Plan"
                                      : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Broadcast Tab ─────────────────────────────────────────────────────────────
const PROGRAMMES = [
    { value: "btech", label: "B.Tech" },
    { value: "mba", label: "MBA" },
    { value: "mca", label: "MCA" },
];
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
    "Industrial Engineering",
    "Computer Science & System Engineering",
    "CSE (Artificial Intelligence)",
    "CSE (Data Science)",
    "CSE (Cyber Security)",
    "CSE (Internet of Things)",
    "Electronics & Computer Engineering",
];

// ── Multi-select chip group ───────────────────────────────────────────────────
function ChipGroup({
    options,
    selected,
    onToggle,
    labelKey = "label",
    valueKey = "value",
}) {
    return (
        <div className={s.chipGroup}>
            {options.map((opt) => {
                const val = typeof opt === "string" ? opt : opt[valueKey];
                const lbl = typeof opt === "string" ? opt : opt[labelKey];
                const on = selected.includes(val);
                return (
                    <button
                        key={val}
                        type="button"
                        className={`${s.chip} ${on ? s.chipOn : ""}`}
                        onClick={() => onToggle(val)}
                    >
                        {lbl}
                        {on && <X size={10} />}
                    </button>
                );
            })}
        </div>
    );
}

// ── Individual user picker with search ───────────────────────────────────────
function UserPicker({ selected, onAdd, onRemove }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const timerRef = React.useRef(null);

    const search = (val) => {
        setQ(val);
        clearTimeout(timerRef.current);
        if (!val.trim()) {
            setResults([]);
            return;
        }
        timerRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await broadcastApi.searchUsers(val.trim());
                setResults(
                    res.filter((u) => !selected.find((s) => s._id === u._id)),
                );
            } catch {}
            setSearching(false);
        }, 300);
    };

    return (
        <div className={s.userPicker}>
            {selected.length > 0 && (
                <div className={s.selectedUsers}>
                    {selected.map((u) => (
                        <span key={u._id} className={s.userTag}>
                            <img
                                src={u.avatar}
                                alt=""
                                className={s.userTagAvatar}
                            />
                            {u.name || u.email}
                            <button onClick={() => onRemove(u._id)}>
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className={s.userSearchWrap}>
                <input
                    className={s.input}
                    placeholder="Search by name, email or roll…"
                    value={q}
                    onChange={(e) => search(e.target.value)}
                />
                {searching && (
                    <span className={s.userSearchSpinner}>
                        <RefreshCw size={12} className={s.spin} />
                    </span>
                )}
            </div>
            {results.length > 0 && (
                <div className={s.userDropdown}>
                    {results.map((u) => (
                        <button
                            key={u._id}
                            type="button"
                            className={s.userDropRow}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onAdd(u);
                                setQ("");
                                setResults([]);
                            }}
                        >
                            <img
                                src={u.avatar}
                                alt=""
                                className={s.userTagAvatar}
                            />
                            <span className={s.userDropName}>{u.name}</span>
                            <span className={s.userDropMeta}>
                                {u.roll || u.email}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function BroadcastTab() {
    const emptyForm = {
        kind: "announcement",
        title: "",
        body: "",
        targetType: "all",
        // multi-select values for sem/year/programme/branch
        targetValues: [],
        // individual users
        targetUsers: [],
        expiryMode: "days",
        expiryDays: "7",
        expiresAt: "",
        sendEmail: false,
        emailSubject: "",
        emailBody: "",
    };
    const [form, setForm] = useState(emptyForm);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    // History
    const [histTab, setHistTab] = useState("announcements");
    const [announcements, setAnnouncements] = useState([]);
    const [sentNotifs, setSentNotifs] = useState([]);
    const [histLoading, setHistLoading] = useState(false);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const toggleValue = (val) =>
        setForm((f) => ({
            ...f,
            targetValues: f.targetValues.includes(val)
                ? f.targetValues.filter((v) => v !== val)
                : [...f.targetValues, val],
        }));

    const addUser = (u) =>
        setForm((f) => ({ ...f, targetUsers: [...f.targetUsers, u] }));
    const removeUser = (id) =>
        setForm((f) => ({
            ...f,
            targetUsers: f.targetUsers.filter((u) => u._id !== id),
        }));

    const loadHistory = useCallback(async () => {
        setHistLoading(true);
        try {
            const [ann, notifs] = await Promise.all([
                broadcastApi.getAnnouncements(),
                broadcastApi.getSentNotifications({ limit: 50 }),
            ]);
            setAnnouncements(ann);
            setSentNotifs(notifs.notifications || []);
        } catch {}
        setHistLoading(false);
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const canSend =
        form.title.trim() &&
        form.body.trim() &&
        (form.targetType === "all" ||
            (form.targetType === "individual" && form.targetUsers.length > 0) ||
            (form.targetType !== "individual" && form.targetValues.length > 0));

    const handleSubmit = async () => {
        if (!canSend) return;
        setBusy(true);
        setResult(null);
        try {
            let target;
            if (form.targetType === "all") {
                target = { type: "all", value: null };
            } else if (form.targetType === "individual") {
                target = {
                    type: "individual",
                    value: form.targetUsers.map((u) => u._id),
                };
            } else {
                // sem / year values are numbers; others are strings
                const vals =
                    form.targetType === "sem" || form.targetType === "year"
                        ? form.targetValues.map(Number)
                        : form.targetValues;
                target = { type: form.targetType, value: vals };
            }

            const payload = {
                kind: form.kind,
                title: form.title,
                body: form.body,
                target,
            };

            if (form.kind === "announcement") {
                payload[
                    form.expiryMode === "days" ? "expiryDays" : "expiresAt"
                ] =
                    form.expiryMode === "days"
                        ? form.expiryDays
                        : form.expiresAt;
            } else {
                payload.sendEmail = form.sendEmail;
                if (form.sendEmail) {
                    payload.emailSubject = form.emailSubject || form.title;
                    payload.emailBody = form.emailBody || form.body;
                }
            }

            const res = await broadcastApi.send(payload);
            const msg =
                form.kind === "announcement"
                    ? "Announcement published!"
                    : `Notification sent to ${res.sent} user${res.sent !== 1 ? "s" : ""}${res.emailQueued ? " + emails queued" : ""}.`;
            setResult({ ok: true, msg });
            setForm(emptyForm);
            loadHistory();
        } catch (err) {
            setResult({ ok: false, msg: err.message || "Failed to send." });
        }
        setBusy(false);
    };

    const deleteAnnouncement = async (id) => {
        if (!confirm("Delete this announcement?")) return;
        await broadcastApi.deleteAnnouncement(id);
        setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    };

    const fmtDate = (d) =>
        new Date(d).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        });

    const fmtTarget = (t) => {
        if (!t || t.type === "all") return "Everyone";
        const vals = Array.isArray(t.value) ? t.value.join(", ") : t.value;
        return `${t.type}: ${vals}`;
    };

    return (
        <div className={s.broadcastWrap}>
            {/* ── Compose ── */}
            <div className={s.broadcastCompose}>
                <h3 className={s.sectionTitle}>Compose</h3>

                {/* Kind */}
                <div className={s.kindToggle}>
                    <button
                        className={`${s.kindBtn} ${form.kind === "announcement" ? s.kindOn : ""}`}
                        onClick={() => set("kind", "announcement")}
                    >
                        <Megaphone size={14} /> Announcement
                    </button>
                    <button
                        className={`${s.kindBtn} ${form.kind === "notification" ? s.kindOn : ""}`}
                        onClick={() => set("kind", "notification")}
                    >
                        <Bell size={14} /> Notification
                    </button>
                </div>

                {/* Target type selector */}
                <label className={s.fieldLabel}>Target audience</label>
                <div className={s.targetTypeRow}>
                    {[
                        { id: "all", label: "Everyone" },
                        { id: "sem", label: "Semester" },
                        { id: "year", label: "Batch Year" },
                        { id: "programme", label: "Programme" },
                        { id: "branch", label: "Branch" },
                        { id: "individual", label: "Individual" },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            className={`${s.targetTypeBtn} ${form.targetType === id ? s.targetTypeBtnOn : ""}`}
                            onClick={() => {
                                setForm((f) => ({
                                    ...f,
                                    targetType: id,
                                    targetValues: [],
                                    targetUsers: [],
                                }));
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Multi-select chips */}
                {form.targetType === "sem" && (
                    <ChipGroup
                        options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
                            value: String(n),
                            label: `Sem ${n}`,
                        }))}
                        selected={form.targetValues}
                        onToggle={toggleValue}
                    />
                )}
                {form.targetType === "year" && (
                    <ChipGroup
                        options={[2021, 2022, 2023, 2024, 2025].map((y) => ({
                            value: String(y),
                            label: String(y),
                        }))}
                        selected={form.targetValues}
                        onToggle={toggleValue}
                    />
                )}
                {form.targetType === "programme" && (
                    <ChipGroup
                        options={PROGRAMMES}
                        selected={form.targetValues}
                        onToggle={toggleValue}
                    />
                )}
                {form.targetType === "branch" && (
                    <ChipGroup
                        options={BRANCHES}
                        selected={form.targetValues}
                        onToggle={toggleValue}
                    />
                )}
                {form.targetType === "individual" && (
                    <UserPicker
                        selected={form.targetUsers}
                        onAdd={addUser}
                        onRemove={removeUser}
                    />
                )}

                {/* Selection summary */}
                {form.targetType !== "all" &&
                    form.targetType !== "individual" &&
                    form.targetValues.length === 0 && (
                        <p className={s.targetHint}>
                            Select at least one option above
                        </p>
                    )}
                {form.targetType === "individual" &&
                    form.targetUsers.length === 0 && (
                        <p className={s.targetHint}>
                            Search and add at least one user above
                        </p>
                    )}

                {/* Title */}
                <label className={s.fieldLabel}>Title</label>
                <input
                    className={s.input}
                    placeholder="Title…"
                    value={form.title}
                    maxLength={120}
                    onChange={(e) => set("title", e.target.value)}
                />

                {/* Body */}
                <label className={s.fieldLabel}>Body</label>
                <textarea
                    className={s.textarea}
                    placeholder="Write your message…"
                    value={form.body}
                    maxLength={2000}
                    rows={5}
                    onChange={(e) => set("body", e.target.value)}
                />
                <span className={s.charCount}>{form.body.length}/2000</span>

                {/* Announcement expiry */}
                {form.kind === "announcement" && (
                    <div className={s.expiryBlock}>
                        <label className={s.fieldLabel}>Expires</label>
                        <div className={s.expiryRow}>
                            <button
                                className={`${s.expiryMode} ${form.expiryMode === "days" ? s.expiryModeOn : ""}`}
                                onClick={() => set("expiryMode", "days")}
                            >
                                After N days
                            </button>
                            <button
                                className={`${s.expiryMode} ${form.expiryMode === "date" ? s.expiryModeOn : ""}`}
                                onClick={() => set("expiryMode", "date")}
                            >
                                Fixed date
                            </button>
                        </div>
                        {form.expiryMode === "days" ? (
                            <div className={s.expiryDaysRow}>
                                {[1, 3, 7, 14, 30].map((d) => (
                                    <button
                                        key={d}
                                        className={`${s.dayChip} ${form.expiryDays === String(d) ? s.dayChipOn : ""}`}
                                        onClick={() =>
                                            set("expiryDays", String(d))
                                        }
                                    >
                                        {d}d
                                    </button>
                                ))}
                                <input
                                    className={s.dayInput}
                                    type="number"
                                    min={1}
                                    max={365}
                                    placeholder="custom"
                                    value={
                                        ![1, 3, 7, 14, 30].includes(
                                            Number(form.expiryDays),
                                        )
                                            ? form.expiryDays
                                            : ""
                                    }
                                    onChange={(e) =>
                                        set("expiryDays", e.target.value)
                                    }
                                />
                            </div>
                        ) : (
                            <input
                                className={s.input}
                                type="datetime-local"
                                value={form.expiresAt}
                                onChange={(e) =>
                                    set("expiresAt", e.target.value)
                                }
                            />
                        )}
                    </div>
                )}

                {/* Email option */}
                {form.kind === "notification" && (
                    <div className={s.emailBlock}>
                        <label className={s.checkRow}>
                            <input
                                type="checkbox"
                                checked={form.sendEmail}
                                onChange={(e) =>
                                    set("sendEmail", e.target.checked)
                                }
                            />
                            <Mail size={13} /> Also send via email
                        </label>
                        {form.sendEmail && (
                            <>
                                <label className={s.fieldLabel}>
                                    Email subject{" "}
                                    <span className={s.optional}>
                                        (defaults to title)
                                    </span>
                                </label>
                                <input
                                    className={s.input}
                                    placeholder={form.title || "Subject…"}
                                    value={form.emailSubject}
                                    onChange={(e) =>
                                        set("emailSubject", e.target.value)
                                    }
                                />
                                <label className={s.fieldLabel}>
                                    Email body{" "}
                                    <span className={s.optional}>
                                        (defaults to body)
                                    </span>
                                </label>
                                <textarea
                                    className={s.textarea}
                                    placeholder={form.body || "Email body…"}
                                    value={form.emailBody}
                                    rows={4}
                                    onChange={(e) =>
                                        set("emailBody", e.target.value)
                                    }
                                />
                            </>
                        )}
                    </div>
                )}

                {result && (
                    <div
                        className={`${s.resultBanner} ${result.ok ? s.resultOk : s.resultErr}`}
                    >
                        {result.ok ? (
                            <CheckCircle2 size={14} />
                        ) : (
                            <AlertCircle size={14} />
                        )}
                        {result.msg}
                    </div>
                )}

                <button
                    className={s.sendBtn}
                    onClick={handleSubmit}
                    disabled={busy || !canSend}
                >
                    {busy ? (
                        <RefreshCw size={14} className={s.spin} />
                    ) : (
                        <Send size={14} />
                    )}
                    {busy
                        ? "Sending…"
                        : form.kind === "announcement"
                          ? "Publish Announcement"
                          : "Send Notification"}
                </button>
            </div>

            {/* ── History ── */}
            <div className={s.broadcastHistory}>
                <div className={s.histHeader}>
                    <h3 className={s.sectionTitle}>History</h3>
                    <button
                        className={s.refreshBtn}
                        onClick={loadHistory}
                        disabled={histLoading}
                    >
                        <RefreshCw
                            size={13}
                            className={histLoading ? s.spin : ""}
                        />
                    </button>
                </div>
                <div className={s.histTabs}>
                    <button
                        className={`${s.histTab} ${histTab === "announcements" ? s.histTabOn : ""}`}
                        onClick={() => setHistTab("announcements")}
                    >
                        <Megaphone size={12} /> Announcements (
                        {announcements.length})
                    </button>
                    <button
                        className={`${s.histTab} ${histTab === "notifications" ? s.histTabOn : ""}`}
                        onClick={() => setHistTab("notifications")}
                    >
                        <Bell size={12} /> Sent ({sentNotifs.length})
                    </button>
                </div>
                <div className={s.histList}>
                    {histLoading && <p className={s.histLoading}>Loading…</p>}

                    {histTab === "announcements" &&
                        !histLoading &&
                        (announcements.length === 0 ? (
                            <p className={s.histEmpty}>No announcements yet.</p>
                        ) : (
                            announcements.map((a) => (
                                <div key={a._id} className={s.histCard}>
                                    <div className={s.histCardTop}>
                                        <span className={s.histCardTitle}>
                                            {a.title}
                                        </span>
                                        <button
                                            className={s.histDel}
                                            onClick={() =>
                                                deleteAnnouncement(a._id)
                                            }
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <p className={s.histCardBody}>{a.body}</p>
                                    <div className={s.histMeta}>
                                        <span className={s.histTarget}>
                                            {fmtTarget(a.target)}
                                        </span>
                                        <span>
                                            Expires {fmtDate(a.expiresAt)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ))}

                    {histTab === "notifications" &&
                        !histLoading &&
                        (sentNotifs.length === 0 ? (
                            <p className={s.histEmpty}>
                                No notifications sent yet.
                            </p>
                        ) : (
                            sentNotifs.map((n) => (
                                <div key={n._id} className={s.histCard}>
                                    <div className={s.histCardTop}>
                                        <span className={s.histCardTitle}>
                                            {n.title}
                                        </span>
                                        <span className={s.histCardUser}>
                                            →{" "}
                                            {n.userId?.name ||
                                                n.userId?.email ||
                                                "unknown"}
                                        </span>
                                    </div>
                                    <p className={s.histCardBody}>{n.body}</p>
                                    <div className={s.histMeta}>
                                        <span>
                                            {n.deletedAt
                                                ? "Dismissed"
                                                : n.readAt
                                                  ? "Read"
                                                  : "Unread"}
                                        </span>
                                        <span>{fmtDate(n.createdAt)}</span>
                                    </div>
                                </div>
                            ))
                        ))}
                </div>
            </div>
        </div>
    );
}

// ── Main AdminPanel component ─────────────────────────────────────────────────
const TABS = [
    { id: "stats", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "promos", label: "Promo Codes", icon: Tag },
    { id: "plans", label: "Plans", icon: Zap },
    { id: "resources", label: "Resources", icon: BookOpen },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "curriculum", label: "Curriculum", icon: BookMarked },
    { id: "broadcast", label: "Broadcast", icon: Megaphone },
];

export default function AdminPanel() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState("stats");

    if (user?.role !== "admin") {
        return (
            <AppShell>
                <div className={s.denied}>
                    <ShieldOff size={32} />
                    <p>Admin access required.</p>
                    <button onClick={() => navigate("/dashboard")}>
                        Go to Dashboard
                    </button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className={s.page}>
                <div className={s.pageHead}>
                    <h1 className={s.title}>Admin Panel</h1>
                    <p className={s.sub}>Full access to all collections</p>
                </div>

                <div className={s.tabs}>
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.id}
                                className={`${s.tab} ${tab === t.id ? s.tabOn : ""}`}
                                onClick={() => setTab(t.id)}
                            >
                                <Icon size={14} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {tab === "stats" && <StatsTab />}
                {tab === "users" && <UsersTab />}
                {tab === "subscriptions" && <SubscriptionsTab />}
                {tab === "promos" && <PromoCodesTab />}
                {tab === "plans" && <PlansTab />}
                {tab === "resources" && <ResourcesTab />}
                {tab === "notes" && <NotesTab />}
                {tab === "curriculum" && <CurriculumTab />}
                {tab === "broadcast" && <BroadcastTab />}
            </div>
        </AppShell>
    );
}