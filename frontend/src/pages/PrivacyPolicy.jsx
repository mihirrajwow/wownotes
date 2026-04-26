import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookMarked, Shield, ChevronRight, Mail } from "lucide-react";
import s from "./PrivacyPolicy.module.css";

const YEAR = new Date().getFullYear();

function Section({ id, title, number, children }) {
    return (
        <section id={id} className={s.section}>
            <div className={s.sectionHeader}>
                <span className={s.sectionNumber}>{number}</span>
                <h2 className={s.sectionTitle}>{title}</h2>
            </div>
            <div className={s.sectionBody}>{children}</div>
        </section>
    );
}

function P({ children }) {
    return <p className={s.p}>{children}</p>;
}

function Ul({ children }) {
    return <ul className={s.ul}>{children}</ul>;
}

function Li({ children }) {
    return <li className={s.li}>{children}</li>;
}

function Sub({ title, children }) {
    return (
        <div className={s.sub}>
            <h3 className={s.subTitle}>{title}</h3>
            {children}
        </div>
    );
}

function Disclaimer({ children }) {
    return (
        <div className={s.disclaimer}>
            <div className={s.disclaimerBar} />
            <div className={s.disclaimerContent}>
                <div className={s.disclaimerHead}>
                    <Shield size={14} className={s.disclaimerIcon} />
                    <span className={s.disclaimerLabel}>Please note</span>
                </div>
                <p className={s.disclaimerText}>{children}</p>
            </div>
        </div>
    );
}

const TOC = [
    { id: "who-we-are", label: "Who We Are" },
    { id: "information-collected", label: "Information We Collect" },
    { id: "how-we-use", label: "How We Use Your Information" },
    { id: "content-protection", label: "Resource Access & Content Protection" },
    { id: "cookies", label: "Cookies & Session Data" },
    { id: "data-sharing", label: "Data Sharing & Third Parties" },
    { id: "data-retention", label: "Data Retention" },
    { id: "security", label: "Security" },
    { id: "contributors", label: "Uploaded Content & Contributors" },
    { id: "childrens-privacy", label: "Children's Privacy" },
    { id: "your-rights", label: "Your Rights" },
    { id: "changes", label: "Changes to This Policy" },
];

export default function PrivacyPolicy() {
    const { hash } = useLocation();

    // Scroll to hash on load / hash change
    useEffect(() => {
        if (hash) {
            const el = document.querySelector(hash);
            if (el)
                setTimeout(
                    () =>
                        el.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        }),
                    80,
                );
        } else {
            window.scrollTo(0, 0);
        }
    }, [hash]);

    const [activeId, setActiveId] = useState("");

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveId(entry.target.id);
                });
            },
            { rootMargin: "-20% 0px -70% 0px" },
        );
        TOC.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, []);

    return (
        <div className={s.page}>
            {/* ── Top nav bar ─────────────────────────────────────────────── */}
            <header className={s.navbar}>
                <Link to="/" className={s.navBrand}>
                    <BookMarked size={18} className={s.navIcon} />
                    <span className={s.navBrandText}>WowNotes</span>
                </Link>
                <div className={s.breadcrumb}>
                    <Link to="/" className={s.breadcrumbHome}>
                        Home
                    </Link>
                    <ChevronRight size={12} className={s.breadcrumbSep} />
                    <span className={s.breadcrumbCurrent}>Privacy Policy</span>
                </div>
            </header>

            <div className={s.layout}>
                {/* ── Sticky sidebar TOC ──────────────────────────────────── */}
                <aside className={s.sidebar}>
                    <div className={s.sidebarInner}>
                        <p className={s.tocLabel}>On this page</p>
                        <nav className={s.toc}>
                            {TOC.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className={`${s.tocLink} ${activeId === item.id ? s.tocLinkActive : ""}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document
                                            .getElementById(item.id)
                                            ?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                            });
                                    }}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* ── Main content ────────────────────────────────────────── */}
                <main className={s.main}>
                    {/* Hero */}
                    <div className={s.hero}>
                        <div className={s.heroEyebrow}>
                            <Shield size={13} />
                            Legal Document
                        </div>
                        <h1 className={s.heroTitle}>Privacy Policy</h1>
                        <p className={s.heroMeta}>
                            Effective date: <strong>April 2025</strong>
                            &ensp;·&ensp; Platform: <strong>WowNotes</strong>
                            &ensp;·&ensp; KIIT University Exclusive
                        </p>
                        <p className={s.heroIntro}>
                            Welcome to WowNotes — a subscription-based academic
                            resource platform designed exclusively for students
                            at Kalinga Institute of Industrial Technology (KIIT
                            University), Bhubaneswar. This Privacy Policy
                            explains what personal information we collect, how
                            we use it, and the rights you hold over your data.
                        </p>
                        <p className={s.heroIntro}>
                            By accessing or using WowNotes, you agree to the
                            practices described in this document. If you do not
                            agree, please discontinue use of the platform.
                        </p>
                    </div>

                    {/* ── Sections ──────────────────────────────────────────── */}
                    <Section id="who-we-are" number="01" title="Who We Are">
                        <P>
                            WowNotes is an independent academic platform serving
                            KIIT University students. The platform provides
                            semester-wise study resources — including notes,
                            previous-year question papers (PYQs), and
                            assignments — gated behind a paid subscription. For
                            queries about this policy, contact us at{" "}
                            <a
                                href="mailto:support.wownotes@gmail.com"
                                className={s.link}
                            >
                                support.wownotes@gmail.com
                            </a>{" "}
                            or through the platform's Contact form.
                        </P>
                    </Section>

                    <Section
                        id="information-collected"
                        number="02"
                        title="Information We Collect"
                    >
                        <Sub title="2.1  Information Received via Google Sign-In">
                            <P>
                                WowNotes authenticates users exclusively through
                                Google OAuth 2.0. When you sign in, Google
                                shares the following with us:
                            </P>
                            <Ul>
                                <Li>
                                    Your full name, as registered with your
                                    Google account
                                </Li>
                                <Li>
                                    Your email address — used to derive your
                                    KIIT roll number and branch automatically
                                </Li>
                                <Li>Your Google profile photo (avatar)</Li>
                            </Ul>
                            <P>
                                We do not receive your Google account password
                                at any point.
                            </P>
                        </Sub>

                        <Sub title="2.2  Information You Provide Directly">
                            <Ul>
                                <Li>
                                    Course selection (B.Tech / MBA / MCA) and
                                    current semester — entered during onboarding
                                </Li>
                                <Li>
                                    Branch — auto-derived from your roll number
                                    where possible, otherwise entered manually
                                </Li>
                                <Li>
                                    Messages submitted through the Contact form,
                                    including any category tags you select
                                </Li>
                            </Ul>
                        </Sub>

                        <Sub title="2.3  Payment Information">
                            <P>
                                Subscription payments are processed by Razorpay,
                                a PCI-DSS compliant payment gateway. WowNotes
                                does not store your card details, UPI
                                credentials, or net-banking information. We
                                retain only:
                            </P>
                            <Ul>
                                <Li>
                                    The Razorpay Order ID and Payment Reference
                                    ID, for reconciliation purposes
                                </Li>
                                <Li>
                                    The amount paid and the timestamp of the
                                    transaction
                                </Li>
                                <Li>
                                    The subscription plan purchased (semester,
                                    year, or full-course)
                                </Li>
                            </Ul>
                        </Sub>

                        <Sub title="2.4  Usage Data (Automatically Collected)">
                            <Ul>
                                <Li>
                                    Resources you view and the timestamps of
                                    those views
                                </Li>
                                <Li>
                                    Device session data, used to enforce the
                                    single-active-device policy
                                </Li>
                                <Li>
                                    IP address and browser/device type,
                                    collected through standard server logs
                                </Li>
                                <Li>
                                    Notes you create within the platform —
                                    stored in your account and visible only to
                                    you and platform administrators
                                </Li>
                            </Ul>
                        </Sub>
                    </Section>

                    <Section
                        id="how-we-use"
                        number="03"
                        title="How We Use Your Information"
                    >
                        <P>
                            We use collected data solely to operate and improve
                            the platform:
                        </P>
                        <Ul>
                            <Li>
                                To authenticate your identity and maintain your
                                login session
                            </Li>
                            <Li>
                                To verify your eligibility as a KIIT University
                                student
                            </Li>
                            <Li>
                                To display course- and semester-relevant
                                resources tailored to your academic profile
                            </Li>
                            <Li>
                                To process subscription payments and activate or
                                renew your access
                            </Li>
                            <Li>
                                To send in-app notifications and announcements
                                relevant to your course or semester
                            </Li>
                            <Li>
                                To enforce the single-device login rule for
                                account security
                            </Li>
                            <Li>
                                To respond to contact form messages and resolve
                                support queries
                            </Li>
                            <Li>
                                To generate anonymised aggregate statistics
                                visible only to platform administrators
                            </Li>
                        </Ul>
                        <P>
                            We do not use your data for advertising purposes,
                            and we do not sell or rent your information to any
                            third party.
                        </P>
                    </Section>

                    <Section
                        id="content-protection"
                        number="04"
                        title="Resource Access & Content Protection"
                    >
                        <P>
                            All study materials available on WowNotes —
                            including notes, PYQs, assignments, and any other
                            uploaded content — are the intellectual property of
                            their respective contributors or the platform
                            itself. They are made available exclusively for the
                            personal academic use of subscribed students.
                        </P>

                        <Disclaimer>
                            Sharing screenshots, screen recordings, or any other
                            reproduction of resources available inside this
                            platform constitutes a violation of our Content
                            Protection Policy and your subscription agreement.
                            If such activity is detected or reported by our
                            team, your subscription may be cancelled without a
                            refund and your account may be suspended. We kindly
                            ask all members to respect the effort that goes into
                            curating these materials.
                        </Disclaimer>

                        <P>
                            The platform employs server-side access controls to
                            ensure resources are accessible only to users with
                            an active, valid subscription for the relevant
                            course and semester. Resources are served through
                            authenticated endpoints and are not publicly
                            accessible.
                        </P>
                    </Section>

                    <Section
                        id="cookies"
                        number="05"
                        title="Cookies & Session Data"
                    >
                        <P>
                            We use server-side sessions (stored in our database)
                            to keep you signed in. A session cookie is placed in
                            your browser for this purpose. We do not use
                            tracking cookies, advertising cookies, or any
                            third-party analytics cookies.
                        </P>
                        <Ul>
                            <Li>
                                Session cookies expire when you sign out or
                                after a period of inactivity
                            </Li>
                            <Li>
                                You may clear cookies at any time via your
                                browser settings, which will sign you out of the
                                platform
                            </Li>
                        </Ul>
                    </Section>

                    <Section
                        id="data-sharing"
                        number="06"
                        title="Data Sharing & Third Parties"
                    >
                        <P>
                            We share your data with third parties only to the
                            extent necessary to operate the platform:
                        </P>
                        <div className={s.thirdPartyGrid}>
                            {[
                                {
                                    name: "Google",
                                    role: "OAuth provider",
                                    desc: "Handles authentication. Subject to Google's Privacy Policy.",
                                },
                                {
                                    name: "Razorpay",
                                    role: "Payment gateway",
                                    desc: "Processes subscription payments securely. Subject to Razorpay's Privacy Policy.",
                                },
                                {
                                    name: "Cloudinary",
                                    role: "File storage",
                                    desc: "Stores and serves academic PDFs and resource files. Files are access-controlled.",
                                },
                                {
                                    name: "Railway",
                                    role: "Hosting infrastructure",
                                    desc: "Our server hosting provider, subject to their data processing agreement.",
                                },
                            ].map((tp) => (
                                <div key={tp.name} className={s.thirdPartyCard}>
                                    <p className={s.tpName}>{tp.name}</p>
                                    <p className={s.tpRole}>{tp.role}</p>
                                    <p className={s.tpDesc}>{tp.desc}</p>
                                </div>
                            ))}
                        </div>
                        <P>
                            No data is shared with advertisers, data brokers, or
                            unrelated third parties.
                        </P>
                    </Section>

                    <Section
                        id="data-retention"
                        number="07"
                        title="Data Retention"
                    >
                        <Ul>
                            <Li>
                                Your account data is retained for as long as
                                your account remains active
                            </Li>
                            <Li>
                                Payment records are retained for a minimum of
                                five years for legal and accounting purposes
                            </Li>
                            <Li>
                                If you request account deletion, we will remove
                                your personal data within 30 days, except where
                                retention is required by law
                            </Li>
                            <Li>
                                Contact form messages may be retained for up to
                                12 months for support continuity
                            </Li>
                        </Ul>
                    </Section>

                    <Section id="security" number="08" title="Security">
                        <P>
                            We implement reasonable technical and organisational
                            measures to protect your data:
                        </P>
                        <Ul>
                            <Li>HTTPS encryption for all data in transit</Li>
                            <Li>
                                HTTP security headers (Content Security Policy,
                                XSS protection, and others)
                            </Li>
                            <Li>
                                Rate limiting on all API endpoints to prevent
                                abuse
                            </Li>
                            <Li>
                                Server-side session authentication — session
                                tokens are never exposed in URLs
                            </Li>
                            <Li>
                                Single-device enforcement — logging in from a
                                second device automatically signs out the first
                            </Li>
                        </Ul>
                        <P>
                            No system is entirely immune to security risks. We
                            encourage you to use a strong, unique password for
                            your Google account and to sign out when using
                            shared or public devices.
                        </P>
                    </Section>

                    <Section
                        id="contributors"
                        number="09"
                        title="Uploaded Content & Contributors"
                    >
                        <P>
                            Some resources on WowNotes are uploaded by verified
                            contributor-role users (fellow students). While we
                            review content before publishing, we do not
                            guarantee the accuracy or completeness of any study
                            material. Please use resources as a supplement to
                            your official coursework.
                        </P>

                        <Disclaimer>
                            If you are a contributor uploading resources to the
                            platform, please ensure you have the right to share
                            the material. Uploading copyrighted content without
                            permission is prohibited. Likewise, redistributing
                            platform resources outside WowNotes — via messaging
                            apps, social media, or any other channel — may
                            result in suspension of your account and
                            cancellation of your subscription if intercepted by
                            our team.
                        </Disclaimer>
                    </Section>

                    <Section
                        id="childrens-privacy"
                        number="10"
                        title="Children's Privacy"
                    >
                        <P>
                            WowNotes is intended for use by enrolled university
                            students, who are typically 17 years of age or
                            older. We do not knowingly collect personal
                            information from children under the age of 13. If
                            you believe a minor has registered, please contact
                            us and we will promptly remove the account.
                        </P>
                    </Section>

                    <Section id="your-rights" number="11" title="Your Rights">
                        <P>
                            You have the following rights regarding your
                            personal data:
                        </P>
                        <Ul>
                            <Li>
                                <strong>Access</strong> — request a copy of the
                                personal data we hold about you
                            </Li>
                            <Li>
                                <strong>Correction</strong> — request that
                                inaccurate or incomplete data be corrected
                            </Li>
                            <Li>
                                <strong>Deletion</strong> — request deletion of
                                your account and associated personal data
                            </Li>
                            <Li>
                                <strong>Portability</strong> — request your data
                                in a machine-readable format where technically
                                feasible
                            </Li>
                            <Li>
                                <strong>Objection</strong> — object to any
                                processing not strictly necessary for the
                                platform to function
                            </Li>
                        </Ul>
                        <P>
                            To exercise any of these rights, contact us at{" "}
                            <a
                                href="mailto:support.wownotes@gmail.com"
                                className={s.link}
                            >
                                support.wownotes@gmail.com
                            </a>{" "}
                            or through the platform's Contact form. We will
                            respond within 14 business days.
                        </P>
                    </Section>

                    <Section
                        id="changes"
                        number="12"
                        title="Changes to This Policy"
                    >
                        <P>
                            We may update this Privacy Policy from time to time
                            to reflect changes to our practices or applicable
                            law. When we do, we will update the effective date
                            at the top of this document and, where changes are
                            material, notify users via an in-app announcement.
                        </P>
                        <P>
                            Continued use of the platform after a policy update
                            constitutes your acceptance of the revised terms.
                        </P>
                    </Section>

                    {/* ── Contact card ────────────────────────────────────── */}
                    <div className={s.contactCard}>
                        <Mail size={22} className={s.contactIcon} />
                        <div>
                            <p className={s.contactTitle}>
                                Questions about this policy?
                            </p>
                            <p className={s.contactSub}>
                                Reach us at{" "}
                                <a
                                    href="mailto:support.wownotes@gmail.com"
                                    className={s.link}
                                >
                                    support.wownotes@gmail.com
                                </a>{" "}
                                or through the Contact form on the platform.
                            </p>
                        </div>
                    </div>

                    {/* ── Page footer ─────────────────────────────────────── */}
                    <div className={s.pageFooter}>
                        <p className={s.pageFooterCopy}>
                            © {YEAR} WowNotes · All rights reserved
                        </p>
                        <Link to="/" className={s.pageFooterBack}>
                            ← Back to WowNotes
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    );
}
