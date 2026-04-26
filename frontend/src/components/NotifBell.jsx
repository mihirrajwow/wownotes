import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotifDrawer from "./NotifDrawer";
import s from "./NotifBell.module.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function NotifBell({ collapsed }) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const pollingRef = useRef(null);

    const fetchAll = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/notifications`, {
                credentials: "include",
            });
            if (!r.ok) return;
            const data = await r.json();
            setAnnouncements(data.announcements || []);
            setNotifications(data.notifications || []);
        } catch {}
    }, []);

    // Initial fetch + poll every 60s
    useEffect(() => {
        fetchAll();
        pollingRef.current = setInterval(fetchAll, 60000);
        return () => clearInterval(pollingRef.current);
    }, [fetchAll]);

    // Real-time push via Socket.IO (already connected in AuthContext or AppShell)
    useEffect(() => {
        const socket = window.__wownotes_socket;
        if (!socket) return;

        const onAnnouncement = (a) => {
            setAnnouncements((prev) => [a, ...prev]);
        };
        const onNotification = (n) => {
            setNotifications((prev) => [n, ...prev]);
        };

        socket.on("new_announcement", onAnnouncement);
        socket.on("new_notification", onNotification);
        return () => {
            socket.off("new_announcement", onAnnouncement);
            socket.off("new_notification", onNotification);
        };
    }, []);

    const handleDismiss = async (id) => {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        await fetch(`${API_URL}/notifications/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
    };

    const handleOpen = () => {
        setOpen(true);
        // Mark all as read
        fetch(`${API_URL}/notifications/read-all`, {
            method: "PATCH",
            credentials: "include",
        });
        setNotifications((prev) =>
            prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
        );
    };

    const unread =
        notifications.filter((n) => !n.readAt).length +
        announcements.length; // announcements are always "new-ish"

    return (
        <>
            <button
                className={`${s.bell} ${unread > 0 ? s.hasUnread : ""}`}
                onClick={handleOpen}
                title={collapsed ? "Notifications" : undefined}
            >
                <Bell size={17} />
                {!collapsed && <span>Notifications</span>}
                {unread > 0 && (
                    <span className={s.badge}>{unread > 9 ? "9+" : unread}</span>
                )}
            </button>

            {open && (
                <NotifDrawer
                    announcements={announcements}
                    notifications={notifications}
                    onClose={() => setOpen(false)}
                    onDismiss={handleDismiss}
                />
            )}
        </>
    );
}
