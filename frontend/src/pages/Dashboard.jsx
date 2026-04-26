import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSecurity } from "../hooks/useSecurity";
import { resourcesApi } from "../services/api";
import AppShell from "../components/AppShell";
import ResourceCatalogue from "../components/ResourceCatalogue";
import s from "./Dashboard.module.css";

const COURSE_LABELS = { btech: "B.Tech", mba: "MBA", mca: "MCA" };

export default function Dashboard() {
    useSecurity(true);
    const { user, subs, hasAccess, forcedOut, setForcedOut } = useAuth();
    const navigate = useNavigate();
    const [freeResources, setFreeResources] = useState([]);
    const [loading, setLoading] = useState(true);

    const course = user?.course;
    const sem = user?.currentSemester;

    useEffect(() => {
        resourcesApi
            .getFree()
            .then(setFreeResources)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const subAccess = subs.filter(
        (s) => s.isActive && new Date() < new Date(s.expiresAt),
    );
    const isSubscribed = subAccess.length > 0;

    return (
        <AppShell>
            <div className={s.page}>
                <header className={s.header}>
                    <div>
                        <h1 className={s.title}>Dashboard</h1>
                        <p className={s.sub}>
                            {COURSE_LABELS[course]} · Semester {sem}
                        </p>
                    </div>
                    <img
                        src={user?.avatar}
                        alt={user?.name}
                        className={s.avatar}
                    />
                </header>

                {/* Subscription status */}
                <div
                    className={`${s.subBanner} ${isSubscribed ? s.subActive : s.subNone}`}
                >
                    {isSubscribed ? (
                        <>
                            <span className={s.subDot} />
                            <div>
                                <p className={s.subTitle}>Subscribed</p>
                                <p className={s.subMeta}>
                                    {subAccess
                                        .map((s) => {
                                            const exp = new Date(
                                                s.expiresAt,
                                            ).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            });
                                            if (s.pack === "full")
                                                return `Full ${COURSE_LABELS[s.course]} · expires ${exp}`;
                                            if (s.pack === "year")
                                                return `Year ${s.year} · expires ${exp}`;
                                            if (s.pack === "semester")
                                                return `Sem ${s.semester} · expires ${exp}`;
                                            return "";
                                        })
                                        .join(" | ")}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className={s.subDotNone} />
                            <div>
                                <p className={s.subTitle}>
                                    No active subscription
                                </p>
                                <p className={s.subMeta}>
                                    You can access free resources only.
                                    Subscribe for full access.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Quick actions */}
                <div className={s.actions}>
                    <button
                        className={s.actionCard}
                        onClick={() => navigate("/notes")}
                    >
                        <span className={s.actionIcon}>📝</span>
                        <span className={s.actionLabel}>My Notebook</span>
                        <span className={s.actionSub}>Personal notes</span>
                    </button>
                    <button
                        className={s.actionCard}
                        onClick={() => navigate("/resources")}
                    >
                        <span className={s.actionIcon}>📚</span>
                        <span className={s.actionLabel}>Resources</span>
                        <span className={s.actionSub}>
                            {isSubscribed ? "Full access" : "Free only"}
                        </span>
                    </button>
                    {!isSubscribed && (
                        <button
                            className={`${s.actionCard} ${s.actionCta}`}
                            onClick={() =>
                                alert("Payment integration coming soon!")
                            }
                        >
                            <span className={s.actionIcon}>⚡</span>
                            <span className={s.actionLabel}>Subscribe</span>
                            <span className={s.actionSub}>
                                Unlock all resources
                            </span>
                        </button>
                    )}
                </div>

                {/* Resource catalogue — teaser for unsubscribed users (always visible to admin for preview) */}
                {(!isSubscribed || user?.role === "admin") && (
                    <ResourceCatalogue />
                )}

                {/* Free resources preview */}
                <section className={s.section}>
                    <h2 className={s.sectionTitle}>Free Resources</h2>
                    {loading ? (
                        <div className={s.loader}>
                            <span className={s.spin} />
                        </div>
                    ) : freeResources.length === 0 ? (
                        <p className={s.empty}>No free resources yet.</p>
                    ) : (
                        <div className={s.resourceGrid}>
                            {freeResources.slice(0, 6).map((r) => (
                                <div
                                    key={r._id}
                                    className={s.resourceCard}
                                    onClick={() => navigate("/resources")}
                                >
                                    <span className={s.resType}>{r.type}</span>
                                    <p className={s.resTitle}>{r.title}</p>
                                    <p className={s.resMeta}>
                                        {r.subject}{" "}
                                        {r.faculty ? `· ${r.faculty}` : ""}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Forced logout overlay */}
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
            </div>
        </AppShell>
    );
}
