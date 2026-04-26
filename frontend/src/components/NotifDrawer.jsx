import React, { useState, useEffect, useRef } from "react";
import { X, Megaphone, Bell, Clock } from "lucide-react";
import s from "./NotifDrawer.module.css";

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
}

function timeUntil(dateStr) {
    const diff = new Date(dateStr).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d >= 1) return `Expires in ${d}d`;
    if (h >= 1) return `Expires in ${h}h`;
    return "Expiring soon";
}

export default function NotifDrawer({
    announcements,
    notifications,
    onClose,
    onDismiss,
}) {
    const [tab, setTab] = useState(
        announcements.length > 0 ? "announcements" : "notifications"
    );
    const drawerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target))
                onClose();
        };
        setTimeout(() => document.addEventListener("mousedown", handler), 10);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div className={s.overlay}>
            <div className={s.drawer} ref={drawerRef}>
                {/* Header */}
                <div className={s.header}>
                    <span className={s.headerTitle}>Inbox</span>
                    <button className={s.closeBtn} onClick={onClose}>
                        <X size={15} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={s.tabs}>
                    <button
                        className={`${s.tab} ${tab === "announcements" ? s.tabOn : ""}`}
                        onClick={() => setTab("announcements")}
                    >
                        <Megaphone size={13} />
                        Announcements
                        {announcements.length > 0 && (
                            <span className={s.tabBadge}>{announcements.length}</span>
                        )}
                    </button>
                    <button
                        className={`${s.tab} ${tab === "notifications" ? s.tabOn : ""}`}
                        onClick={() => setTab("notifications")}
                    >
                        <Bell size={13} />
                        Notifications
                        {notifications.filter((n) => !n.readAt).length > 0 && (
                            <span className={s.tabBadge}>
                                {notifications.filter((n) => !n.readAt).length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className={s.body}>
                    {tab === "announcements" && (
                        <>
                            {announcements.length === 0 ? (
                                <Empty label="No active announcements" />
                            ) : (
                                announcements.map((a) => (
                                    <div key={a._id} className={s.annoCard}>
                                        <div className={s.cardTop}>
                                            <span className={s.cardTitle}>{a.title}</span>
                                            <span className={s.expiry}>
                                                <Clock size={11} />
                                                {timeUntil(a.expiresAt)}
                                            </span>
                                        </div>
                                        <p className={s.cardBody}>{a.body}</p>
                                        <span className={s.cardAge}>
                                            {timeAgo(a.createdAt)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </>
                    )}

                    {tab === "notifications" && (
                        <>
                            {notifications.length === 0 ? (
                                <Empty label="No notifications yet" />
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n._id}
                                        className={`${s.notifCard} ${!n.readAt ? s.unread : ""}`}
                                    >
                                        <button
                                            className={s.dismiss}
                                            onClick={() => onDismiss(n._id)}
                                            title="Dismiss"
                                        >
                                            <X size={12} />
                                        </button>
                                        <span className={s.cardTitle}>{n.title}</span>
                                        <p className={s.cardBody}>{n.body}</p>
                                        <span className={s.cardAge}>
                                            {timeAgo(n.createdAt)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Empty({ label }) {
    return (
        <div className={s.empty}>
            <p>{label}</p>
        </div>
    );
}
