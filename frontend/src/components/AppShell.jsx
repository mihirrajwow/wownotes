import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import WowNotesLogo from "./WowNotesLogo";
import {
    LayoutDashboard,
    BookOpen,
    StickyNote,
    LayoutGrid,
    LogOut,
    ChevronLeft,
    ChevronRight,
    BookMarked,

    Upload,
    CreditCard,
    Settings,
    Sun,
    Moon,
    Monitor,
    X,
    MessageCircle,
} from "lucide-react";
import s from "./AppShell.module.css";
import ContactPane from "./ContactPane";
import NotifBell from "./NotifBell";
import { SlimFooter } from "./Footer";

const COURSE_LABELS = { btech: "B.Tech", mba: "MBA", mca: "MCA" };

const THEME_OPTIONS = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System default", icon: Monitor },
];

export default function AppShell({ children }) {
    const { user, subs, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
    const [showSettings, setShowSettings] = useState(false);
    const [showContact, setShowContact] = useState(false);

    const isAdmin = user?.role === "admin";
    const isSubscribed = subs.some(
        (s) => s.isActive && new Date() < new Date(s.expiresAt),
    );

    const NAV = [
        { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/resources", icon: BookOpen, label: "Resources" },
        { path: "/notes", icon: StickyNote, label: "My Notebook" },
        { path: "/pricing", icon: CreditCard, label: "Pricing" },
        ...(isAdmin
            ? [
                  { path: "/admin", icon: LayoutGrid, label: "Admin Panel" },
                  { path: "/admin/upload", icon: Upload, label: "Upload PDF" },
              ]
            : []),
    ];

    return (
        <div className={s.shell}>
            {showContact && (
                <ContactPane onClose={() => setShowContact(false)} />
            )}
            <aside className={`${s.sidebar} ${collapsed ? s.collapsed : ""}`}>
                <div className={s.logo} onClick={() => navigate("/dashboard")}>
                    {collapsed
                        ? <WowNotesLogo variant="icon" />
                        : <WowNotesLogo variant="wordmark" />
                    }
                </div>

                <nav className={s.nav}>
                    {NAV.map(({ path, icon: Icon, label }) => (
                        <button
                            key={path}
                            className={`${s.navItem} ${location.pathname === path ? s.navActive : ""}`}
                            onClick={() => navigate(path)}
                            title={collapsed ? label : undefined}
                        >
                            <Icon size={17} />
                            {!collapsed && <span>{label}</span>}
                        </button>
                    ))}
                </nav>

                <div className={s.bottom}>
                    {!collapsed && (
                        <div
                            className={`${s.subPill} ${isSubscribed ? s.subOn : s.subOff}`}
                            onClick={() =>
                                !isSubscribed && navigate("/pricing")
                            }
                            style={!isSubscribed ? { cursor: "pointer" } : {}}
                            title={!isSubscribed ? "Upgrade plan" : undefined}
                        >
                            <span
                                className={isSubscribed ? s.dotGreen : s.dotRed}
                            />
                            {isSubscribed
                                ? "Subscribed"
                                : "Free access · Upgrade"}
                        </div>
                    )}

                    {!collapsed && user && (
                        <div className={s.userInfo}>
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className={s.avatar}
                            />
                            <div className={s.userText}>
                                <p className={s.userName}>
                                    {user.name.split(" ")[0]}
                                </p>
                                <p className={s.userMeta}>
                                    {isAdmin
                                        ? "👑 Admin"
                                        : `${COURSE_LABELS[user.course]} · Sem ${user.currentSemester}`}
                                </p>
                            </div>
                        </div>
                    )}

                    <NotifBell collapsed={collapsed} />

                    <button
                        className={s.navItem}
                        onClick={() => setShowContact(true)}
                        title={collapsed ? "Contact Support" : undefined}
                    >
                        <MessageCircle size={17} />
                        {!collapsed && <span>Contact Us</span>}
                    </button>

                    <button
                        className={`${s.navItem} ${showSettings ? s.navActive : ""}`}
                        onClick={() => {
                            if (collapsed) {
                                setCollapsed(false);
                                setShowSettings(true); // explicit true, not toggle
                            } else {
                                setShowSettings((v) => !v);
                            }
                        }}
                        title={collapsed ? "Settings" : undefined}
                    >
                        <Settings size={17} />
                        {!collapsed && <span>Settings</span>}
                    </button>

                    {showSettings && (
                        <div className={s.settingsPanel}>
                            <div className={s.settingsHeader}>
                                <span>Appearance</span>
                                <button
                                    className={s.settingsClose}
                                    onClick={() => setShowSettings(false)}
                                >
                                    <X size={13} />
                                </button>
                            </div>
                            <div className={s.themeOptions}>
                                {THEME_OPTIONS.map(
                                    ({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            className={`${s.themeOption} ${theme === value ? s.themeOptionActive : ""}`}
                                            onClick={() => setTheme(value)}
                                        >
                                            <Icon size={14} />
                                            <span>{label}</span>
                                        </button>
                                    ),
                                )}
                            </div>
                            <button
                                className={s.navItem}
                                onClick={logout}
                                style={{ color: "#ef4444", marginTop: 4 }}
                            >
                                <LogOut size={17} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}

                    <button
                        className={s.collapseBtn}
                        onClick={() => {
                            setCollapsed((c) => !c);
                            setShowSettings(false);
                        }}
                    >
                        {collapsed ? (
                            <ChevronRight size={14} />
                        ) : (
                            <ChevronLeft size={14} />
                        )}
                    </button>
                </div>
            </aside>

            <main className={s.main}>
                <div className={s.content}>
                    {children}
                </div>
                <SlimFooter />
            </main>
        </div>
    );
}