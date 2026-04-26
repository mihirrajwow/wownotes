const mongoose = require("mongoose");

// ── KIIT branch code map ──────────────────────────────────────────────────────
// Extracted from digits 3–4 of the roll number
// e.g. 23051352 → code "05" → CSE
// Add more codes here as you discover them
const BRANCH_CODE_MAP = {
    "01": "Civil Engineering",
    "02": "Mechanical Engineering",
    "03": "Electrical Engineering",
    "04": "Electronics & Communication Engineering",
    "05": "Computer Science & Engineering",
    "06": "Information Technology",
    "07": "Chemical Engineering",
    "08": "Biotechnology",
    "09": "Aerospace Engineering",
    10: "Electronics & Electrical Engineering",
    11: "Industrial Engineering",
    12: "Computer Science & System Engineering",
    14: "CSE (Artificial Intelligence)",
    15: "CSE (Data Science)",
    16: "CSE (Cyber Security)",
    17: "CSE (Internet of Things)",
    19: "Electronics & Computer Engineering",
    29: "Unknown", // add label once confirmed
};

// Helper exported for use in passport.js / routes
function branchFromRoll(roll) {
    if (!roll || !/^\d{6,8}$/.test(roll)) return null;
    // For 8-digit rolls: digits at index 2–3 (0-based) are the branch code
    // e.g. 2305XXXX → code "05"
    const code = roll.length >= 4 ? roll.substring(2, 4) : null;
    if (!code) return null;
    return BRANCH_CODE_MAP[code] || `Unknown (${code})`;
}

const KNOWN_BRANCHES = [...new Set(Object.values(BRANCH_CODE_MAP))];

const userSchema = new mongoose.Schema(
    {
        googleId: { type: String, required: true, unique: true },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            validate: [
                // temporarily disabled for external testing
                // {
                //     validator: (v) => v.endsWith("@kiit.ac.in"),
                //     message: "Only @kiit.ac.in emails allowed.",
                // },
            ],
        },

        // Extracted automatically from email
        roll: {
            type: String,
            unique: true,
            sparse: true,
            match: [/^\d{6,8}$/, "Roll number must be 6–8 digits"],
        },

        // Auto-detected from roll, or manually chosen by the user
        branch: {
            type: String,
            default: null,
            trim: true,
        },

        name: { type: String, required: true, trim: true },
        avatar: { type: String, default: null },

        course: {
            type: String,
            enum: {
                values: ["btech", "mba", "mca", null],
                message: "Invalid course.",
            },
            default: null,
        },

        currentSemester: { type: Number, min: 1, max: 8, default: null },

        role: {
            type: String,
            // student     — standard user, subscription-gated content
            // contributor — student + can upload resources
            // friend      — student + full access to all resources (no subscription needed)
            // admin       — full access + upload + admin panel
            enum: {
                values: ["student", "contributor", "friend", "admin"],
                message: "Invalid role.",
            },
            default: "student",
        },
    },
    { timestamps: true },
);

// ── Auto-extract roll + branch from email before save ─────────────────────────
userSchema.pre("save", function (next) {
    if (this.email) {
        const local = this.email.split("@")[0];
        if (/^\d{6,8}$/.test(local)) {
            this.roll = local;
            // Only auto-set branch if user hasn't manually chosen one
            if (!this.branch) {
                this.branch = branchFromRoll(local);
            }
        } else {
            this.roll = null;
            this.branch = this.branch || null;
        }
    }
    next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true });
userSchema.index({ roll: 1 }, { unique: true, sparse: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
userSchema.methods.isAdmin = function () {
    return this.role === "admin";
};
userSchema.methods.canUpload = function () {
    return this.role === "admin" || this.role === "contributor";
};
userSchema.methods.hasFullAccess = function () {
    return this.role === "admin" || this.role === "friend";
};
userSchema.methods.batchYear = function () {
    if (!this.roll) return null;
    const yr = parseInt(this.roll.substring(0, 2));
    return isNaN(yr) ? null : 2000 + yr;
};
userSchema.methods.branchCode = function () {
    if (!this.roll || this.roll.length < 4) return null;
    return this.roll.substring(2, 4);
};

module.exports = mongoose.model("User", userSchema);
module.exports.branchFromRoll = branchFromRoll;
module.exports.BRANCH_CODE_MAP = BRANCH_CODE_MAP;
module.exports.KNOWN_BRANCHES = KNOWN_BRANCHES;
