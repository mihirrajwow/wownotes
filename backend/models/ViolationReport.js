const mongoose = require("mongoose");

const violationReportSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // The resource they were viewing when limit was hit
        resource: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resource",
            default: null,
        },
        resourceTitle: { type: String, default: null },
        // Breakdown of what they tried to do
        violations: [
            {
                type: { type: String }, // "print" | "copy" | "save" | "devtools" | "default"
                count: { type: Number, default: 1 },
            },
        ],
        totalCount: { type: Number, default: 10 },
        // Has the admin reviewed/dismissed this
        reviewed: { type: Boolean, default: false },
    },
    { timestamps: true },
);

violationReportSchema.index({ reviewed: 1, createdAt: -1 });

module.exports = mongoose.model("ViolationReport", violationReportSchema);
