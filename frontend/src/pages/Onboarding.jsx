import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import s from "./Onboarding.module.css";

const COURSES = [
    { id: "btech", label: "B.Tech", sems: 8, years: 4 },
    { id: "mba", label: "MBA", sems: 4, years: 2 },
    { id: "mca", label: "MCA", sems: 4, years: 2 },
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
    "CSE (Artificial Intelligence)",
    "CSE (Data Science)",
    "CSE (Cyber Security)",
    "CSE (Internet of Things)",
    "Electronics & Computer Engineering",
    "Other",
];

export default function Onboarding() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const [course, setCourse] = useState("");
    const [sem, setSem] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [branch, setBranch] = useState(() => {
        // If auto-detected branch starts with "Unknown", clear it so user must pick
        if (!user?.branch || user.branch.startsWith("Unknown")) return "";
        return user.branch;
    });

    const selectedCourse = COURSES.find((c) => c.id === course);

    const handleSubmit = async () => {
        if (!course || !sem) {
            setError("Please select your course and semester.");
            return;
        }
        setSaving(true);
        try {
            const { user: updated } = await authApi.updateProfile({
                course,
                currentSemester: parseInt(sem),
                branch,
            });
            setUser(updated);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={s.root}>
            <div className={s.bgGlow} />
            <div className={s.card}>
                <div className={s.top}>
                    <img src={user?.avatar} alt="" className={s.avatar} />
                    <div>
                        <p className={s.welcome}>
                            Welcome, {user?.name?.split(" ")[0]}!
                        </p>
                        <p className={s.sub}>
                            Let's set up your academic profile.
                        </p>
                    </div>
                </div>

                <div className={s.section}>
                    <p className={s.label}>Your course</p>
                    <div className={s.courseGrid}>
                        {COURSES.map((c) => (
                            <button
                                key={c.id}
                                className={`${s.courseBtn} ${course === c.id ? s.courseBtnActive : ""}`}
                                onClick={() => {
                                    setCourse(c.id);
                                    setSem("");
                                }}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedCourse && (
                    <div className={s.section}>
                        <p className={s.label}>Current semester</p>
                        <div className={s.semGrid}>
                            {Array.from(
                                { length: selectedCourse.sems },
                                (_, i) => i + 1,
                            ).map((n) => (
                                <button
                                    key={n}
                                    className={`${s.semBtn} ${sem == n ? s.semBtnActive : ""}`}
                                    onClick={() => setSem(n)}
                                >
                                    Sem {n}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p className={s.error}>{error}</p>}

                <div className={s.section}>
                    <p className={s.label}>
                        Your branch
                        {user?.branch && user.branch !== "Unknown" && (
                            <span className={s.autoDetected}>
                                {" "}
                                · auto-detected from roll
                            </span>
                        )}
                    </p>
                    <select
                        className={s.branchSelect}
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                    >
                        <option value="">— Select your branch —</option>
                        {BRANCHES.map((b) => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className={s.submitBtn}
                    onClick={handleSubmit}
                    disabled={saving || !course || !sem}
                >
                    {saving ? "Saving…" : "Continue to Dashboard →"}
                </button>
            </div>
        </div>
    );
}
