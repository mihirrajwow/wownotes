const mongoose = require("mongoose");

// Represents a purchasable subscription plan shown on the Pricing page.
// The "free" plan is UI-only and never stored here.
const planSchema = new mongoose.Schema(
    {
        // Drives subscription logic — must be "semester" or "year"
        pack: {
            type: String,
            enum: ["semester", "year"],
            required: true,
        },

        // Display
        name: { type: String, required: true, trim: true, maxlength: 60 },
        headline: { type: String, required: true, trim: true, maxlength: 120 },
        period: { type: String, required: true, trim: true, maxlength: 60 },
        perks: [{ type: String, trim: true, maxlength: 200 }],
        color: {
            type: String,
            enum: ["accent", "gold", "default"],
            default: "accent",
        },
        popular: { type: Boolean, default: false },
        cta: { type: String, trim: true, default: "" }, // e.g. "Pay ₹52"

        // Pricing
        priceINR: { type: Number, required: true, min: 1 },

        // How long a subscription created by this plan lasts (mutually exclusive with fixedExpiryDate)
        durationDays: { type: Number, min: 1, default: null },

        // Fixed calendar date on which all subscriptions for this plan expire
        fixedExpiryDate: { type: Date, default: null },

        // Admin can hide a plan without deleting it
        isActive: { type: Boolean, default: true },

        // Display order on the pricing page
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
