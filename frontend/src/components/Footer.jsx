import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookMarked, Mail, FileText, Shield } from "lucide-react";
import WowNotesLogo from "./WowNotesLogo";
import s from "./Footer.module.css";

const YEAR = new Date().getFullYear();

const LINKS = {
    platform: [
        { label: "Dashboard", to: "/dashboard" },
        { label: "Resources", to: "/resources" },
        { label: "My Notebook", to: "/notes" },
        { label: "Pricing", to: "/pricing" },
    ],
    legal: [
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Content Policy", to: "/privacy#content-protection" },
        { label: "Terms of Use", to: "/privacy#terms" },
    ],
    support: [
        { label: "Contact Us", href: "mailto:support.wownotes@gmail.com" },
        { label: "Report a Bug", to: "/#contact" },
        { label: "Request a Feature", to: "/#contact" },
    ],
};

/** Full footer — used on Landing page */
export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer className={s.footer}>
            <div className={s.inner}>
                {/* Brand column */}
                <div className={s.brand}>
                    <div className={s.logo} onClick={() => navigate("/")}>
                        <WowNotesLogo variant="wordmark" />
                    </div>
                    <p className={s.tagline}>
                        Academic resources, curated for
                        <br />
                        KIIT University students.
                    </p>
                    <a
                        href="mailto:support.wownotes@gmail.com"
                        className={s.emailLink}
                    >
                        <Mail size={13} />
                        support.wownotes@gmail.com
                    </a>
                    <p className={s.kiit}>KIIT University · Bhubaneswar</p>
                </div>

                {/* Nav columns */}
                <div className={s.navGrid}>
                    <div className={s.navCol}>
                        <p className={s.colHead}>Platform</p>
                        {LINKS.platform.map((l) => (
                            <Link key={l.label} to={l.to} className={s.navLink}>
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    <div className={s.navCol}>
                        <p className={s.colHead}>Legal</p>
                        {LINKS.legal.map((l) => (
                            <Link key={l.label} to={l.to} className={s.navLink}>
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    <div className={s.navCol}>
                        <p className={s.colHead}>Support</p>
                        {LINKS.support.map((l) =>
                            l.href ? (
                                <a
                                    key={l.label}
                                    href={l.href}
                                    className={s.navLink}
                                >
                                    {l.label}
                                </a>
                            ) : (
                                <Link
                                    key={l.label}
                                    to={l.to}
                                    className={s.navLink}
                                >
                                    {l.label}
                                </Link>
                            ),
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className={s.bottom}>
                <p className={s.copy}>
                    © {YEAR} WowNotes · All rights reserved
                </p>
                <div className={s.bottomLinks}>
                    <Link to="/privacy" className={s.bottomLink}>
                        <FileText size={11} /> Privacy Policy
                    </Link>
                    <span className={s.sep}>·</span>
                    <Link
                        to="/privacy#content-protection"
                        className={s.bottomLink}
                    >
                        <Shield size={11} /> Content Policy
                    </Link>
                </div>
            </div>
        </footer>
    );
}

export function SlimFooter() {
    const YEAR = new Date().getFullYear();
    return (
        <div className={s.slimFooter}>
            <span className={s.slimCopy}>© {YEAR} WowNotes</span>
            <div className={s.slimLinks}>
                <Link to="/privacy" className={s.slimLink}>
                    Privacy Policy
                </Link>
                <span className={s.sep}>·</span>
                <Link to="/privacy#content-protection" className={s.slimLink}>
                    Content Policy
                </Link>
                <span className={s.sep}>·</span>
                <a
                    href="mailto:support.wownotes@gmail.com"
                    className={s.slimLink}
                >
                    Contact
                </a>
            </div>
        </div>
    );
}