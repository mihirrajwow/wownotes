const mongoose = require("mongoose");

// An Announcement is broadcast to a group of users and vanishes after expiresAt.
// It lives in the DB as a single document — no per-user copy needed.
// The client fetches active announcements that match the user's profile.

const announcementSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        body: { type: String, required: true, trim: true, maxlength: 2000 },

        // Who can see this announcement
        // type: "all" | "sem" | "year" | "programme" | "branch"
        // value: the specific value (e.g. 3, 2023, "btech", "Computer Science & Engineering")
        target: {
            type: {
                type: String,
                enum: [
                    "all",
                    "sem",
                    "year",
                    "programme",
                    "branch",
                    "individual",
                ],
                default: "all",
            },
            value: { type: mongoose.Schema.Types.Mixed, default: null },
        },

        // When this announcement disappears
        expiresAt: { type: Date, required: true },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete
announcementSchema.index({ "target.type": 1, "target.value": 1 });

module.exports = mongoose.model("Announcement", announcementSchema);
