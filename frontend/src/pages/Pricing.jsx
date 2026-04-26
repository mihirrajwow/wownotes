import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { paymentApi, plansApi } from "../services/api";
import AppShell from "../components/AppShell";
import ContactPane from "../components/ContactPane";
import {
    CheckCircle2,
    Lock,
    Zap,
    BookOpen,
    Calendar,
    ChevronDown,
    Star,
    AlertCircle,
    Tag,
    X,
    Loader2,
    MessageCircle,
} from "lucide-react";
import s from "./Pricing.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────
const COURSES = [
    { id: "btech", label: "B.Tech", sems: 8, years: 4 },
    { id: "mba", label: "MBA", sems: 4, years: 2 },
    { id: "mca", label: "MCA", sems: 4, years: 2 },
];

// Icon map — pack → lucide icon (admin can't change icons, these are fixed)
const PACK_ICONS = { semester: Zap, year: Calendar };

// Free plan is always shown as first card (no DB entry needed)
const FREE_PLAN = {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    icon: BookOpen,
    color: "default",
    headline: "Explore free resources",
    perks: [
        "Access all free-tagged resources",
        "My Notebook (personal notes)",
        "Dashboard & search",
    ],
    cta: "Current plan",
};

function loadRazorpay() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const sc = document.createElement("script");
        sc.src = "https://checkout.razorpay.com/v1/checkout.js";
        sc.onload = () => resolve(true);
        sc.onerror = () => resolve(false);
        document.body.appendChild(sc);
    });
}

function SubCard({ sub }) {
    const expiresAt = new Date(sub.expiresAt);
    const daysLeft = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 86400000),
    );
    const label =
        sub.pack === "semester"
            ? `Sem ${sub.semester}`
            : sub.pack === "year"
              ? `Year ${sub.year}`
              : "Full course";

    return (
        <div className={s.subCard}>
            <CheckCircle2 size={15} className={s.subCardIcon} />
            <div className={s.subCardInfo}>
                <span className={s.subCardTitle}>
                    {sub.course?.toUpperCase()} · {label}
                </span>
                <span className={s.subCardExpiry}>
                    Expires{" "}
                    {expiresAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })}
                    {" · "}
                    {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                </span>
            </div>
            <span className={`${s.subPack} ${s[`pack_${sub.pack}`]}`}>
                {sub.pack}
            </span>
        </div>
    );
}

// ── Promo code input widget ───────────────────────────────────────────────────
function PromoInput({ pack, onApply, onRemove, applied }) {
    const [code, setCode] = useState("");
    const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [message, setMessage] = useState("");
    const inputRef = useRef(null);

    const handleApply = async () => {
        if (!code.trim()) return;
        setStatus("loading");
        setMessage("");
        try {
            const data = await paymentApi.validatePromo(code.trim(), pack);
            setStatus("success");
            setMessage(
                `You save ₹${data.savingsINR}! Pay only ₹${data.finalINR}`,
            );
            onApply(data);
        } catch (err) {
            setStatus("error");
            setMessage(err?.response?.data?.error || "Invalid promo code.");
            onApply(null);
        }
    };

    const handleRemove = () => {
        setCode("");
        setStatus(null);
        setMessage("");
        onRemove();
    };

    if (applied) {
        return (
            <div className={s.promoApplied}>
                <CheckCircle2 size={14} className={s.promoAppliedIcon} />
                <span className={s.promoAppliedCode}>{applied.code}</span>
                <span className={s.promoAppliedSaving}>
                    −₹{applied.savingsINR} off
                </span>
                <button
                    className={s.promoRemoveBtn}
                    onClick={handleRemove}
                    title="Remove promo"
                >
                    <X size={11} />
                </button>
            </div>
        );
    }

    return (
        <div className={s.promoSection}>
            <label className={s.checkoutLabel}>
                <Tag size={13} /> Promo code
            </label>
            <div className={s.promoRow}>
                <input
                    ref={inputRef}
                    className={`${s.promoInput} ${status === "error" ? s.promoInputError : ""} ${status === "success" ? s.promoInputSuccess : ""}`}
                    placeholder="Enter code (optional)"
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setStatus(null);
                        setMessage("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleApply()}
                    maxLength={24}
                    spellCheck={false}
                    autoComplete="off"
                />
                <button
                    className={s.promoApplyBtn}
                    onClick={handleApply}
                    disabled={status === "loading" || !code.trim()}
                    style={
                        status === "success"
                            ? { background: "#16a34a", borderColor: "#16a34a" }
                            : {}
                    }
                >
                    {status === "loading" ? (
                        <Loader2 size={13} className={s.spin} />
                    ) : status === "success" ? (
                        <>
                            <CheckCircle2 size={13} /> Applied
                        </>
                    ) : (
                        "Apply"
                    )}
                </button>
            </div>
            {message && (
                <p
                    className={`${s.promoMsg} ${status === "success" ? s.promoMsgOk : s.promoMsgErr}`}
                >
                    {status === "success" ? (
                        <CheckCircle2 size={13} />
                    ) : (
                        <AlertCircle size={13} />
                    )}
                    {message}
                </p>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Pricing() {
    const { user, subs, fetchSubs } = useAuth();

    const [plans, setPlans] = useState([]); // loaded from API
    const [plansLoading, setPlansLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [course, setCourse] = useState(user?.course || "");
    const [semester, setSemester] = useState("");
    const [year, setYear] = useState("");
    const [paying, setPaying] = useState(false);
    const [toast, setToast] = useState(null);
    const [promoData, setPromoData] = useState(null); // validated promo info
    const [showContact, setShowContact] = useState(false);

    // Fetch plans from backend on mount
    useEffect(() => {
        plansApi
            .getAll()
            .then((data) => setPlans(data))
            .catch(() => {}) // fall through to empty state
            .finally(() => setPlansLoading(false));
    }, []);

    // Build the full plan list for rendering: Free (static) + DB plans
    const allPlans = [
        FREE_PLAN,
        ...plans.map((p) => ({
            id: p._id,
            name: p.name,
            price: `₹${p.priceINR}`,
            period: p.period,
            icon: PACK_ICONS[p.pack] || Zap,
            color: p.color,
            headline: p.headline,
            perks: p.perks,
            cta: p.cta || `Pay ₹${p.priceINR}`,
            amount: p.priceINR,
            pack: p.pack,
            popular: p.popular,
        })),
    ];

    const activeSubs = subs.filter(
        (sub) => sub.isActive && new Date() < new Date(sub.expiresAt),
    );
    const courseObj = COURSES.find((c) => c.id === course);

    // Reset promo when plan changes
    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setPromoData(null);
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5500);
    };

    // Compute display amount (with or without promo)
    const displayAmount = promoData ? promoData.finalINR : selectedPlan?.amount;

    const handlePay = async (plan) => {
        if (!course) {
            showToast("error", "Please select your course first.");
            return;
        }
        if (plan.pack === "semester" && !semester) {
            showToast("error", "Please select a semester.");
            return;
        }
        if (plan.pack === "year" && !year) {
            showToast("error", "Please select a year.");
            return;
        }

        setPaying(true);

        const loaded = await loadRazorpay();
        if (!loaded) {
            showToast(
                "error",
                "Failed to load payment gateway. Check your connection.",
            );
            setPaying(false);
            return;
        }

        let orderData;
        try {
            orderData = await paymentApi.createOrder({
                pack: plan.pack,
                course,
                semester:
                    plan.pack === "semester" ? parseInt(semester) : undefined,
                year: plan.pack === "year" ? parseInt(year) : undefined,
                promoCode: promoData?.code || undefined,
            });
        } catch (err) {
            showToast(
                "error",
                err?.response?.data?.error || "Could not initiate payment.",
            );
            setPaying(false);
            return;
        }

        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "WowNotes",
            description: plan.headline,
            order_id: orderData.orderId,
            prefill: { name: user?.name || "", email: user?.email || "" },
            theme: { color: "#c8501a" },

            handler: async (response) => {
                try {
                    await paymentApi.verify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        pack: plan.pack,
                        course,
                        semester:
                            plan.pack === "semester"
                                ? parseInt(semester)
                                : undefined,
                        year: plan.pack === "year" ? parseInt(year) : undefined,
                        promoCode: promoData?.code || undefined,
                    });
                    await fetchSubs();
                    setSelectedPlan(null);
                    setPromoData(null);
                    showToast(
                        "success",
                        `🎉 Payment successful! ${plan.name} plan activated.`,
                    );
                } catch {
                    showToast(
                        "error",
                        "Payment received but activation failed — contact support with ID: " +
                            response.razorpay_payment_id,
                    );
                } finally {
                    setPaying(false);
                }
            },
            modal: { ondismiss: () => setPaying(false) },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
            showToast(
                "error",
                "Payment failed: " +
                    (response.error?.description || "Unknown error"),
            );
            setPaying(false);
        });
        rzp.open();
    };

    return (
        <AppShell>
            <div className={s.page}>
                {/* Contact pane */}
                {showContact && (
                    <ContactPane onClose={() => setShowContact(false)} />
                )}

                {/* Toast */}
                {toast && (
                    <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
                        {toast.type === "success" ? (
                            <CheckCircle2 size={15} />
                        ) : (
                            <AlertCircle size={15} />
                        )}
                        {toast.msg}
                    </div>
                )}

                {/* Header */}
                <div className={s.header}>
                    <div className={s.headerRow}>
                        <div>
                            <h1 className={s.title}>Plans & Pricing</h1>
                            <p className={s.sub}>
                                Unlock resources for your semester or full
                                academic year
                            </p>
                        </div>
                        <button
                            className={s.contactIconBtn}
                            onClick={() => setShowContact(true)}
                            title="Contact support"
                        >
                            <MessageCircle size={16} />
                            <span>Support</span>
                        </button>
                    </div>
                </div>

                {/* Active subscriptions */}
                {activeSubs.length > 0 && (
                    <div className={s.activeSection}>
                        <h2 className={s.activeSectionTitle}>
                            <CheckCircle2 size={15} /> Your active subscriptions
                        </h2>
                        <div className={s.subList}>
                            {activeSubs.map((sub) => (
                                <SubCard key={sub._id} sub={sub} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Plan cards */}
                <div className={s.plansGrid}>
                    {allPlans.map((plan) => {
                        const Icon = plan.icon;
                        const isSelected = selectedPlan?.id === plan.id;
                        return (
                            <div
                                key={plan.id}
                                className={`${s.planCard} ${s[`card_${plan.color}`]} ${isSelected ? s.cardSelected : ""} ${plan.popular ? s.cardPopular : ""}`}
                                onClick={() =>
                                    plan.pack &&
                                    handleSelectPlan(isSelected ? null : plan)
                                }
                            >
                                {plan.popular && (
                                    <div className={s.popularBadge}>
                                        <Star size={10} fill="currentColor" />{" "}
                                        Best value
                                    </div>
                                )}

                                <div className={s.planTop}>
                                    <div
                                        className={`${s.planIconWrap} ${s[`iconWrap_${plan.color}`]}`}
                                    >
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <p className={s.planName}>
                                            {plan.name}
                                        </p>
                                        <p className={s.planHeadline}>
                                            {plan.headline}
                                        </p>
                                    </div>
                                </div>

                                <div className={s.planPrice}>
                                    <span className={s.priceAmount}>
                                        {plan.price}
                                    </span>
                                    <span className={s.pricePeriod}>
                                        {plan.period}
                                    </span>
                                </div>

                                <ul className={s.perkList}>
                                    {plan.perks.map((p) => (
                                        <li key={p} className={s.perk}>
                                            <CheckCircle2
                                                size={13}
                                                className={s.perkIcon}
                                            />
                                            {p}
                                        </li>
                                    ))}
                                </ul>

                                {plan.pack ? (
                                    <button
                                        className={`${s.ctaBtn} ${s[`cta_${plan.color}`]}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectPlan(
                                                isSelected ? null : plan,
                                            );
                                        }}
                                    >
                                        {isSelected ? "Cancel" : plan.cta}
                                        {!isSelected && (
                                            <ChevronDown size={14} />
                                        )}
                                    </button>
                                ) : (
                                    <div className={s.currentPlanLabel}>
                                        <CheckCircle2 size={13} /> {plan.cta}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Checkout panel */}
                {selectedPlan && (
                    <div className={s.checkoutPanel}>
                        <h2 className={s.checkoutTitle}>
                            Configure your{" "}
                            <span className={s.checkoutPlanName}>
                                {selectedPlan.name} plan
                            </span>
                        </h2>

                        {/* Course selector */}
                        <div className={s.checkoutSection}>
                            <label className={s.checkoutLabel}>Course</label>
                            <div className={s.chipGroup}>
                                {COURSES.map((c) => (
                                    <button
                                        key={c.id}
                                        className={`${s.chip} ${course === c.id ? s.chipOn : ""}`}
                                        onClick={() => {
                                            setCourse(c.id);
                                            setSemester("");
                                            setYear("");
                                        }}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Semester selector */}
                        {selectedPlan.pack === "semester" && courseObj && (
                            <div className={s.checkoutSection}>
                                <label className={s.checkoutLabel}>
                                    Semester to unlock
                                </label>
                                <div className={s.chipGroup}>
                                    {Array.from(
                                        { length: courseObj.sems },
                                        (_, i) => i + 1,
                                    ).map((n) => (
                                        <button
                                            key={n}
                                            className={`${s.chip} ${semester == n ? s.chipOn : ""}`}
                                            onClick={() => setSemester(n)}
                                        >
                                            Sem {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Year selector */}
                        {selectedPlan.pack === "year" && courseObj && (
                            <div className={s.checkoutSection}>
                                <label className={s.checkoutLabel}>
                                    Year to unlock
                                    <span className={s.checkoutHint}>
                                        (unlocks both semesters of that year)
                                    </span>
                                </label>
                                <div className={s.chipGroup}>
                                    {Array.from(
                                        { length: courseObj.years },
                                        (_, i) => i + 1,
                                    ).map((n) => (
                                        <button
                                            key={n}
                                            className={`${s.chip} ${year == n ? s.chipOn : ""}`}
                                            onClick={() => setYear(n)}
                                        >
                                            Year {n}
                                            <span className={s.chipSub}>
                                                Sem {n * 2 - 1} & {n * 2}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Promo code */}
                        <div className={s.checkoutSection}>
                            <PromoInput
                                pack={selectedPlan.pack}
                                applied={promoData}
                                onApply={(data) => setPromoData(data)}
                                onRemove={() => setPromoData(null)}
                            />
                        </div>

                        {/* Summary + Pay */}
                        <div className={s.checkoutFooter}>
                            <div className={s.orderSummary}>
                                <span className={s.summaryLabel}>Total</span>
                                <div className={s.summaryAmountWrap}>
                                    {promoData && (
                                        <span className={s.summaryOriginal}>
                                            ₹{selectedPlan.amount}
                                        </span>
                                    )}
                                    <span className={s.summaryAmount}>
                                        ₹{displayAmount}
                                    </span>
                                </div>
                                <span className={s.summaryNote}>
                                    Secure payment via Razorpay
                                </span>
                            </div>
                            <button
                                className={s.payBtn}
                                onClick={() => handlePay(selectedPlan)}
                                disabled={paying}
                            >
                                {paying ? (
                                    <>
                                        <span className={s.spin} /> Processing…
                                    </>
                                ) : (
                                    <>
                                        <Lock size={14} /> Pay ₹{displayAmount}{" "}
                                        securely
                                    </>
                                )}
                            </button>
                        </div>

                        <p className={s.checkoutDisclaimer}>
                            Payments are processed securely by Razorpay. We
                            never store your card details.
                        </p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
