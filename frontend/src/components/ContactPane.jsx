import React, { useState } from "react";
import {
    X,
    Send,
    MessageSquare,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { contactApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import s from "./ContactPane.module.css";

const SUGGESTED_TAGS = [
    "payment",
    "subscription",
    "bug",
    "feature-request",
    "resources",
    "billing",
    "account",
    "other",
];

export default function ContactPane({ onClose }) {
    const { user } = useAuth();
    const [message, setMessage] = useState("");
    const [tags, setTags] = useState([]);
    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const [errMsg, setErrMsg] = useState("");

    const toggleTag = (tag) =>
        setTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );

    const handleSubmit = async () => {
        if (!message.trim() || message.trim().length < 10) {
            setErrMsg("Please write at least 10 characters.");
            return;
        }
        setStatus("loading");
        setErrMsg("");
        try {
            await contactApi.send({
                message: message.trim(),
                tags,
                senderEmail: user?.email,
            });
            setStatus("success");
        } catch (err) {
            setStatus("error");
            setErrMsg(
                err?.response?.data?.error || "Failed to send. Try again.",
            );
        }
    };

    return (
        <div
            className={s.overlay}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className={s.pane}>
                {/* Header */}
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <MessageSquare size={16} className={s.headerIcon} />
                        <span className={s.headerTitle}>Contact Support</span>
                    </div>
                    <button
                        className={s.closeBtn}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {status === "success" ? (
                    <div className={s.successState}>
                        <CheckCircle2 size={40} className={s.successIcon} />
                        <h3 className={s.successTitle}>Message sent!</h3>
                        <p className={s.successText}>
                            We'll get back to you at{" "}
                            <strong>{user?.email || "your email"}</strong> as
                            soon as possible.
                        </p>
                        <button className={s.doneBtn} onClick={onClose}>
                            Done
                        </button>
                    </div>
                ) : (
                    <div className={s.body}>
                        {/* Sender info pill */}
                        {user?.email && (
                            <div className={s.senderPill}>
                                <span className={s.senderDot} />
                                Sending as <strong>{user.email}</strong>
                            </div>
                        )}

                        {/* Message textarea */}
                        <div className={s.field}>
                            <label className={s.label}>Your message</label>
                            <textarea
                                className={s.textarea}
                                placeholder="Describe your issue or question in detail…"
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    setErrMsg("");
                                }}
                                rows={5}
                                maxLength={2000}
                                disabled={status === "loading"}
                            />
                            <span className={s.charCount}>
                                {message.length}/2000
                            </span>
                        </div>

                        {/* Hashtags */}
                        <div className={s.field}>
                            <label className={s.label}>
                                Tags{" "}
                                <span className={s.optional}>(optional)</span>
                            </label>
                            <div className={s.tagGrid}>
                                {SUGGESTED_TAGS.map((tag) => (
                                    <button
                                        key={tag}
                                        className={`${s.tag} ${tags.includes(tag) ? s.tagOn : ""}`}
                                        onClick={() => toggleTag(tag)}
                                        disabled={status === "loading"}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {(errMsg || status === "error") && (
                            <div className={s.errorBanner}>
                                <AlertCircle size={13} />
                                {errMsg ||
                                    "Something went wrong. Please try again."}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            className={s.submitBtn}
                            onClick={handleSubmit}
                            disabled={status === "loading" || !message.trim()}
                        >
                            {status === "loading" ? (
                                <>
                                    <Loader2 size={14} className={s.spin} />{" "}
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <Send size={14} /> Send message
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
