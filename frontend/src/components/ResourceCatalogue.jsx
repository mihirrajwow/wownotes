import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resourcesApi } from "../services/api";
import s from "./ResourceCatalogue.module.css";

const TYPE_EMOJI = {
    notes: "📝",
    assignment: "📋",
    syllabus: "🗂️",
    pyq: "📄",
    other: "📎",
};

const COURSE_LABEL = { btech: "B.Tech", mba: "MBA", mca: "MCA" };
const API = import.meta.env.VITE_API_URL || "/api";

export default function ResourceCatalogue() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        resourcesApi
            .getCatalogue()
            .then(setItems)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Auto-rotate every 4 s
    useEffect(() => {
        if (items.length < 2) return;
        timerRef.current = setInterval(
            () => setActive((p) => (p + 1) % items.length),
            4000,
        );
        return () => clearInterval(timerRef.current);
    }, [items.length]);

    const go = (dir) => {
        clearInterval(timerRef.current);
        setActive((p) => (p + dir + items.length) % items.length);
    };

    if (loading)
        return (
            <section className={s.wrap}>
                <h2 className={s.heading}>📖 Peek Inside Our Resources</h2>
                <div className={s.skeleton} />
            </section>
        );

    if (!items.length) return null;

    const cur = items[active];

    return (
        <section className={s.wrap}>
            <div className={s.topRow}>
                <h2 className={s.heading}>📖 Peek Inside Our Resources</h2>
                <p className={s.tagline}>
                    Real pages, real quality — subscribe to unlock everything.
                </p>
            </div>

            <div className={s.card}>
                {/* Page image preview */}
                <div className={s.imageWrap}>
                    <img
                        key={`${cur._id}-${cur.previewPageIndex}`}
                        src={`${API}/resources/${cur._id}/preview-page/${cur.previewPageIndex}`}
                        alt={`Preview of ${cur.title}`}
                        className={s.pageImg}
                        loading="lazy"
                    />
                    {/* Gradient fade at bottom to tease content */}
                    <div className={s.fade} />
                    <div className={s.pageTag}>
                        Page {cur.previewPageIndex} of {cur.pageCount}
                    </div>
                </div>

                {/* Metadata */}
                <div className={s.meta}>
                    <span className={s.typeChip}>
                        {TYPE_EMOJI[cur.type] || "📎"} {cur.type}
                    </span>
                    <h3 className={s.title}>{cur.title}</h3>
                    <p className={s.subject}>{cur.subject}</p>
                    <p className={s.course}>
                        {COURSE_LABEL[cur.course]} · Sem {cur.semester}
                    </p>

                    <button
                        className={s.ctaBtn}
                        onClick={() => navigate("/pricing")}
                    >
                        🔓 Unlock Full Access
                    </button>
                </div>
            </div>

            {/* Dots + arrows */}
            {items.length > 1 && (
                <div className={s.controls}>
                    <button className={s.arrow} onClick={() => go(-1)}>
                        ‹
                    </button>
                    <div className={s.dots}>
                        {items.map((_, i) => (
                            <button
                                key={i}
                                className={`${s.dot} ${i === active ? s.dotActive : ""}`}
                                onClick={() => {
                                    clearInterval(timerRef.current);
                                    setActive(i);
                                }}
                            />
                        ))}
                    </div>
                    <button className={s.arrow} onClick={() => go(1)}>
                        ›
                    </button>
                </div>
            )}
        </section>
    );
}
