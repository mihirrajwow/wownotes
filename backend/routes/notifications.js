const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");

const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated())
        return res.status(401).json({ error: "Auth required." });
    next();
};

router.use(requireAuth);

// ── GET /api/notifications ────────────────────────────────────────────────────
// Returns active announcements matching the user's profile + their notifications
router.get("/", async (req, res) => {
    try {
        const user = req.user;
        const now = new Date();

        // Build announcement filter: include "all" + any that match user's profile
        const targetFilter = [{ "target.type": "all" }];

        if (user.currentSemester)
            targetFilter.push({
                "target.type": "sem",
                "target.value": user.currentSemester,
            });

        if (user.roll && user.roll.length >= 2) {
            const yr = 2000 + parseInt(user.roll.substring(0, 2));
            if (!isNaN(yr))
                targetFilter.push({ "target.type": "year", "target.value": yr });
        }

        if (user.course)
            targetFilter.push({
                "target.type": "programme",
                "target.value": user.course,
            });

        if (user.branch)
            targetFilter.push({
                "target.type": "branch",
                "target.value": user.branch,
            });

        const [announcements, notifications] = await Promise.all([
            Announcement.find({
                expiresAt: { $gt: now },
                $or: targetFilter,
            })
                .sort({ createdAt: -1 })
                .lean(),

            Notification.find({
                userId: user._id,
                deletedAt: null,
            })
                .sort({ createdAt: -1 })
                .lean(),
        ]);

        res.json({ announcements, notifications });
    } catch (err) {
        res.status(500).json({ error: "Failed to load notifications." });
    }
});

// ── DELETE /api/notifications/:id — user dismisses a notification ─────────────
router.delete("/:id", async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id, deletedAt: null },
            { deletedAt: new Date() },
            { new: true },
        );
        if (!notif)
            return res.status(404).json({ error: "Notification not found." });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to dismiss notification." });
    }
});

// ── PATCH /api/notifications/read-all — mark all as read ─────────────────────
router.patch("/read-all", async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, deletedAt: null, readAt: null },
            { readAt: new Date() },
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to mark as read." });
    }
});

module.exports = router;
