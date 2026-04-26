const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema(
    {
        // ── Identity ──────────────────────────────────────────────────────────────
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        description: { type: String, default: "" },

        // ── Plan restriction ──────────────────────────────────────────────────────
        // Which plan this code applies to ('semester' | 'year' | 'any')
        applicablePlan: {
            type: String,
            enum: ["semester", "year", "any"],
            default: "any",
        },

        // ── Discount ──────────────────────────────────────────────────────────────
        // discountType: 'fixed' sets exact final price; 'percent' reduces by %
        discountType: {
            type: String,
            enum: ["fixed", "percent"],
            default: "fixed",
        },

        // For fixed: final amount in INR (e.g. 19 → user pays ₹19)
        // For percent: percentage off (e.g. 20 → 20% off)
        discountValue: { type: Number, required: true },

        // ── Limits ────────────────────────────────────────────────────────────────
        maxUses: { type: Number, default: null }, // null = unlimited
        usedCount: { type: Number, default: 0 },

        // Whether the code is currently active
        isActive: { type: Boolean, default: true },

        // Optional expiry date
        expiresAt: { type: Date, default: null },

        // ── Audit ─────────────────────────────────────────────────────────────────
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true },
);

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ isActive: 1 });

// ── Helper: compute final amount in paise given base price ────────────────────
promoCodeSchema.methods.computeFinalAmount = function (basePriceINR) {
    if (this.discountType === "fixed") {
        return Math.max(0, this.discountValue) * 100; // paise
    }
    // percent
    const discounted = basePriceINR * (1 - this.discountValue / 100);
    return Math.round(Math.max(0, discounted)) * 100;
};

// ── Helper: is this code currently valid for a given plan? ────────────────────
promoCodeSchema.methods.isValidForPlan = function (pack) {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;
    if (this.applicablePlan !== "any" && this.applicablePlan !== pack)
        return false;
    return true;
};

module.exports = mongoose.model("PromoCode", promoCodeSchema);
