const express = require("express");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const router = express.Router();

const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated())
        return res.status(401).json({ error: "Auth required." });
    next();
};
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin")
        return res.status(403).json({ error: "Admin only." });
    next();
};

// ─────────────────────────────────────────────────────────────────────────────
// USER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/subscriptions/mine
// Returns current user's active subscriptions
router.get("/mine", requireAuth, async (req, res) => {
    try {
        const subs = await Subscription.find({
            user: req.user._id,
            isActive: true,
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch subscriptions." });
    }
});

// GET /api/subscriptions/access?course=btech&semester=3
router.get("/access", requireAuth, async (req, res) => {
    try {
        const { course, semester } = req.query;
        const sem = parseInt(semester);
        const subs = await Subscription.find({
            user: req.user._id,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });
        res.json({ hasAccess: subs.some((s) => s.grantsAccess(course, sem)) });
    } catch (err) {
        res.status(500).json({ error: "Failed to check access." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/subscriptions/admin/all
// Query params: page, limit, pack, course, grantedBy, status (active|expired|all)
// Returns paginated list with populated user info
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            pack,
            course,
            grantedBy,
            status = "all",
            search, // search by user email / name
        } = req.query;

        const query = {};
        if (pack) query.pack = pack;
        if (course) query.course = course;
        if (grantedBy) query.grantedBy = grantedBy;

        if (status === "active") {
            query.isActive = true;
            query.expiresAt = { $gt: new Date() };
        }
        if (status === "expired") {
            query.$or = [
                { isActive: false },
                { expiresAt: { $lte: new Date() } },
            ];
        }

        // If searching by email/name, find matching user IDs first
        if (search) {
            const users = await User.find({
                $or: [
                    { email: new RegExp(search, "i") },
                    { name: new RegExp(search, "i") },
                    { roll: new RegExp(search, "i") },
                ],
            }).select("_id");
            query.user = { $in: users.map((u) => u._id) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Subscription.countDocuments(query);

        const subs = await Subscription.find(query)
            .populate("user", "name email roll course currentSemester avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            subscriptions: subs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch subscriptions." });
    }
});

// GET /api/subscriptions/admin/stats
// Revenue + subscriber counts broken down by plan, course, etc.
router.get("/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
        const now = new Date();

        const [
            totalRevenue,
            activeCount,
            expiredCount,
            byPack,
            byCourse,
            byGrantedBy,
            recentRevenue, // last 30 days
        ] = await Promise.all([
            // Total revenue from paid subscriptions
            Subscription.aggregate([
                { $match: { grantedBy: "payment", amountPaid: { $ne: null } } },
                { $group: { _id: null, total: { $sum: "$amountPaid" } } },
            ]),

            // Active subscriber count (unique users)
            Subscription.distinct("user", {
                isActive: true,
                expiresAt: { $gt: now },
            }).then((ids) => ids.length),

            // Expired subscription count
            Subscription.countDocuments({
                $or: [{ isActive: false }, { expiresAt: { $lte: now } }],
            }),

            // Breakdown by plan type
            Subscription.aggregate([
                {
                    $group: {
                        _id: "$pack",
                        count: { $sum: 1 },
                        revenue: { $sum: { $ifNull: ["$amountPaid", 0] } },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            // Breakdown by course
            Subscription.aggregate([
                {
                    $group: {
                        _id: "$course",
                        count: { $sum: 1 },
                        revenue: { $sum: { $ifNull: ["$amountPaid", 0] } },
                    },
                },
                { $sort: { count: -1 } },
            ]),

            // Breakdown by source (payment / admin / promo)
            Subscription.aggregate([
                { $group: { _id: "$grantedBy", count: { $sum: 1 } } },
            ]),

            // Revenue in last 30 days
            Subscription.aggregate([
                {
                    $match: {
                        grantedBy: "payment",
                        amountPaid: { $ne: null },
                        paidAt: { $gte: new Date(Date.now() - 30 * 86400000) },
                    },
                },
                { $group: { _id: null, total: { $sum: "$amountPaid" } } },
            ]),
        ]);

        res.json({
            totalRevenue: totalRevenue[0]?.total || 0,
            recentRevenue: recentRevenue[0]?.total || 0,
            activeSubscribers: activeCount,
            expiredCount,
            byPack,
            byCourse,
            byGrantedBy,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch stats." });
    }
});

// GET /api/subscriptions/admin/user/:userId
// All subscriptions (history) for a specific user
router.get(
    "/admin/user/:userId",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const subs = await Subscription.find({
                user: req.params.userId,
            }).sort({ createdAt: -1 });
            res.json(subs);
        } catch (err) {
            res.status(500).json({
                error: "Failed to fetch user subscriptions.",
            });
        }
    },
);

// POST /api/subscriptions/grant — admin grants manually
router.post("/grant", requireAuth, requireAdmin, async (req, res) => {
    try {
        const {
            userId,
            pack,
            course,
            semester,
            year,
            durationDays,
            grantedBy,
            note,
        } = req.body;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (durationDays || 180));

        const sub = await Subscription.create({
            user: userId,
            pack,
            course,
            semester: pack === "semester" ? parseInt(semester) : null,
            year: pack === "year" ? parseInt(year) : null,
            planLabel: Subscription.buildLabel({
                pack,
                course,
                semester,
                year,
            }),
            isActive: true,
            startedAt: new Date(),
            expiresAt,
            amountPaid: 0,
            grantedBy: grantedBy || "admin",
            note: note || "",
        });

        res.status(201).json(sub);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/subscriptions/:id — admin revokes
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const sub = await Subscription.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true },
        );
        if (!sub)
            return res.status(404).json({ error: "Subscription not found." });
        res.json({ success: true, subscription: sub });
    } catch (err) {
        res.status(500).json({ error: "Failed to revoke." });
    }
});

module.exports = router;
