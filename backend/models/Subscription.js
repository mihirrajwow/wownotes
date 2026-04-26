const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
    {
        // ── Who ───────────────────────────────────────────────────────────────────
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // ── What plan ─────────────────────────────────────────────────────────────
        pack: {
            type: String,
            enum: ["semester", "year", "full"],
            required: true,
        },
        course: { type: String, required: true }, // 'btech' | 'mba' | 'mca'
        semester: { type: Number, default: null }, // semester pack only (1–8)
        year: { type: Number, default: null }, // year pack only (1–4)

        // Human-readable label stored at creation time, e.g. "B.Tech · Sem 3"
        planLabel: { type: String, default: "" },

        // ── Lifecycle ─────────────────────────────────────────────────────────────
        isActive: { type: Boolean, default: true },
        startedAt: { type: Date, default: () => new Date() },
        expiresAt: { type: Date, required: true },

        // ── Payment tracking ──────────────────────────────────────────────────────
        amountPaid: { type: Number, default: null }, // INR (e.g. 52, 89)
        currency: { type: String, default: "INR" },
        orderId: { type: String, default: undefined }, // Razorpay order_id
        paymentRef: { type: String, default: undefined }, // Razorpay payment_id — no default so sparse unique index works
        paidAt: { type: Date, default: null }, // when payment was captured

        // ── Source ────────────────────────────────────────────────────────────────
        grantedBy: {
            type: String,
            enum: ["payment", "admin", "promo"],
            default: "payment",
        },

        // Optional note for admin-granted / promo subscriptions
        note: { type: String, default: "" },
    },
    { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
subscriptionSchema.index({ user: 1, isActive: 1 });
subscriptionSchema.index({ user: 1, expiresAt: 1 });
subscriptionSchema.index({ paymentRef: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ orderId: 1 }, { sparse: true });
subscriptionSchema.index({ createdAt: -1 }); // for admin list sorted by newest

// ── Access helper ─────────────────────────────────────────────────────────────
subscriptionSchema.methods.grantsAccess = function (course, semester) {
    if (!this.isActive) return false;
    if (new Date() > this.expiresAt) return false;
    if (this.course !== course) return false;
    if (this.pack === "full") return true;
    if (this.pack === "year") return Math.ceil(semester / 2) === this.year;
    if (this.pack === "semester") return this.semester === semester;
    return false;
};

// ── Computed label helper (call before .save()) ───────────────────────────────
subscriptionSchema.statics.buildLabel = function ({
    pack,
    course,
    semester,
    year,
}) {
    const c = (course || "").toUpperCase();
    if (pack === "semester") return `${c} · Sem ${semester}`;
    if (pack === "year")
        return `${c} · Year ${year} (Sem ${year * 2 - 1} & ${year * 2})`;
    if (pack === "full") return `${c} · Full course`;
    return c;
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
