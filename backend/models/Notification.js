const mongoose = require("mongoose");

// A Notification is sent to a specific user.
// It persists until the user dismisses it (soft-delete via deletedAt).

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: { type: String, required: true, trim: true, maxlength: 120 },
        body: { type: String, required: true, trim: true, maxlength: 2000 },

        // Optional deep-link inside the app
        link: { type: String, default: null },

        // User dismissed the notification (soft-delete)
        deletedAt: { type: Date, default: null },

        // User has seen it (for unread badge)
        readAt: { type: Date, default: null },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

notificationSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
