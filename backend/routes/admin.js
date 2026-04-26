const express = require("express");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Resource = require("../models/Resource");
const Note = require("../models/Note");
const PromoCode = require("../models/PromoCode");
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

// ── Lifetime subscription helper for admins ───────────────────────────────────
async function grantAdminLifetimeSub(userId) {
    // Check if a lifetime admin sub already exists
    const existing = await Subscription.findOne({
        user: userId,
        pack: "full",
        grantedBy: "admin",
        note: "admin-lifetime",
    });
    if (existing) return existing;

    const expiresAt = new Date("2099-12-31T23:59:59Z");
    return Subscription.create({
        user: userId,
        pack: "full",
        course: "btech", // 'full' pack with grantsAccess checks course, but backend bypasses for admins anyway
        planLabel: "Admin — Lifetime Access",
        isActive: true,
        startedAt: new Date(),
        expiresAt,
        amountPaid: 0,
        grantedBy: "admin",
        note: "admin-lifetime",
    });
}

// Filed by the user\'s browser when they hit 10 violations
router.post("/violation-report", requireAuth, async (req, res) => {
    try {
        const { resourceId, resourceTitle, violations } = req.body;

        const report = await ViolationReport.create({
            user: req.user._id,
            resource: resourceId || null,
            resourceTitle: resourceTitle || null,
            violations: violations || [],
            totalCount:
                (violations || []).reduce((s, v) => s + (v.count || 1), 0) ||
                10,
        });

        // Also create an admin notification so it shows up in the admin panel
        const adminUsers = await User.find({ role: "admin" })
            .select("_id")
            .lean();
        if (adminUsers.length) {
            const userName = req.user.name || req.user.email;
            const roll = req.user.roll ? ` (${req.user.roll})` : "";
            const docTitle = resourceTitle ? ` on "${resourceTitle}"` : "";
            await Notification.insertMany(
                adminUsers.map((a) => ({
                    userId: a._id,
                    title: "\u26a0\ufe0f Content Violation Alert",
                    body: `${userName}${roll} exceeded 10 violation attempts${docTitle}. Actions attempted: ${
                        (violations || [])
                            .map((v) => `${v.type} \u00d7${v.count}`)
                            .join(", ") || "unknown"
                    }. Please review their account.`,
                    link: `/admin?tab=users&highlight=${req.user._id}`,
                    createdBy: req.user._id,
                })),
            );
        }

        res.status(201).json({ received: true });
    } catch (err) {
        console.error("violation-report error:", err);
        res.status(500).json({ error: "Failed to log report." });
    }
});

router.use(requireAuth, requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats — overview counts + revenue
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
    try {
        const now = new Date();
        const [
            totalUsers,
            totalResources,
            totalNotes,
            totalSubs,
            activeSubs,
            revenue,
            recentRevenue,
            usersByCourse,
            subsByPack,
        ] = await Promise.all([
            User.countDocuments(),
            Resource.countDocuments({ isPublished: true }),
            Note.countDocuments(),
            Subscription.countDocuments(),
            Subscription.countDocuments({
                isActive: true,
                expiresAt: { $gt: now },
            }),
            Subscription.aggregate([
                { $match: { amountPaid: { $gt: 0 } } },
                { $group: { _id: null, total: { $sum: "$amountPaid" } } },
            ]),
            Subscription.aggregate([
                {
                    $match: {
                        amountPaid: { $gt: 0 },
                        paidAt: { $gte: new Date(Date.now() - 30 * 86400000) },
                    },
                },
                { $group: { _id: null, total: { $sum: "$amountPaid" } } },
            ]),
            User.aggregate([
                { $group: { _id: "$course", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            Subscription.aggregate([
                {
                    $group: {
                        _id: "$pack",
                        count: { $sum: 1 },
                        revenue: { $sum: { $ifNull: ["$amountPaid", 0] } },
                    },
                },
            ]),
        ]);

        res.json({
            totalUsers,
            totalResources,
            totalNotes,
            totalSubs,
            activeSubs,
            totalRevenue: revenue[0]?.total || 0,
            recentRevenue: recentRevenue[0]?.total || 0,
            usersByCourse,
            subsByPack,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to load stats." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/seed-admin-subs
// One-time call: grants lifetime subscriptions to ALL existing admin users
// who don't already have one. Call once after deploying this update.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/seed-admin-subs", async (req, res) => {
    try {
        const admins = await User.find({ role: "admin" });
        const results = await Promise.all(
            admins.map(async (admin) => {
                const sub = await grantAdminLifetimeSub(admin._id);
                return {
                    userId: admin._id,
                    name: admin.name,
                    subId: sub._id,
                    created:
                        !sub.createdAt ||
                        sub.createdAt > new Date(Date.now() - 5000),
                };
            }),
        );
        res.json({ granted: results.length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// GET  /api/admin/users          — paginated list
// GET  /api/admin/users/:id      — single user + their subs + notes count
// PATCH /api/admin/users/:id     — update role / course / semester
// DELETE /api/admin/users/:id    — hard delete user + cascade
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/search?q=... — lightweight user search for individual picker
router.get("/users/search", async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) return res.json([]);
        const users = await User.find({
            $or: [
                { name: new RegExp(q, "i") },
                { email: new RegExp(q, "i") },
                { roll: new RegExp(q, "i") },
            ],
        })
            .select("_id name email roll avatar")
            .limit(10)
            .lean();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Search failed." });
    }
});

router.get("/users", async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, course } = req.query;
        const query = {};
        if (role) query.role = role;
        if (course) query.course = course;
        if (search) {
            query.$or = [
                { name: new RegExp(search, "i") },
                { email: new RegExp(search, "i") },
                { roll: new RegExp(search, "i") },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        res.json({
            users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users." });
    }
});

router.get("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found." });
        const [subs, noteCount, resourceCount] = await Promise.all([
            Subscription.find({ user: req.params.id }).sort({ createdAt: -1 }),
            Note.countDocuments({ user: req.params.id }),
            Resource.countDocuments({ uploadedBy: req.params.id }),
        ]);
        res.json({ user, subscriptions: subs, noteCount, resourceCount });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user." });
    }
});

router.patch("/users/:id", async (req, res) => {
    try {
        const allowed = ["role", "course", "currentSemester", "branch", "name"];
        const update = {};
        allowed.forEach((k) => {
            if (req.body[k] !== undefined) update[k] = req.body[k];
        });
        const user = await User.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true,
        });
        if (!user) return res.status(404).json({ error: "User not found." });

        // Auto-grant lifetime subscription when promoted to admin or friend
        if (update.role === "admin" || update.role === "friend") {
            await grantAdminLifetimeSub(req.params.id);
        }

        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/users/:id", async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.params.id === String(req.user._id))
            return res
                .status(400)
                .json({ error: "Cannot delete your own account." });
        await Promise.all([
            User.findByIdAndDelete(req.params.id),
            Subscription.deleteMany({ user: req.params.id }),
            Note.deleteMany({ user: req.params.id }),
        ]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete user." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/users/:id/grant-sub — grant a subscription manually
// ─────────────────────────────────────────────────────────────────────────────
router.post("/users/:id/grant-sub", async (req, res) => {
    try {
        const {
            pack,
            course,
            semester,
            year,
            days,
            expiresAt: expiresAtRaw,
            amountPaid,
            note,
        } = req.body;
        if (!pack || !course)
            return res
                .status(400)
                .json({ error: "pack and course are required." });

        // Accept either a specific end date OR duration in days
        let expiresAt;
        if (expiresAtRaw) {
            expiresAt = new Date(expiresAtRaw);
            if (isNaN(expiresAt.getTime()))
                return res.status(400).json({ error: "Invalid expiry date." });
            if (expiresAt <= new Date())
                return res
                    .status(400)
                    .json({ error: "Expiry date must be in the future." });
        } else {
            const durationDays =
                parseInt(days) ||
                (pack === "semester" ? 180 : pack === "year" ? 365 : 36500);
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + durationDays);
        }

        const paidAmount =
            amountPaid !== undefined && amountPaid !== ""
                ? parseFloat(amountPaid)
                : 0;

        const sub = await Subscription.create({
            user: req.params.id,
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
            amountPaid: paidAmount,
            paidAt: paidAmount > 0 ? new Date() : null,
            grantedBy: "admin",
            note: note || `Granted by admin on ${new Date().toDateString()}`,
        });
        res.status(201).json(sub);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id/subs — revoke all subscriptions for a user
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/users/:id/subs", async (req, res) => {
    try {
        const result = await Subscription.deleteMany({ user: req.params.id });
        res.json({ deleted: result.deletedCount });
    } catch (err) {
        res.status(500).json({ error: "Failed to revoke subscriptions." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/extend-sub — extend a specific subscription
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/users/:id/extend-sub/:subId", async (req, res) => {
    try {
        const { days } = req.body;
        if (!days || isNaN(days))
            return res.status(400).json({ error: "days is required." });

        const sub = await Subscription.findOne({
            _id: req.params.subId,
            user: req.params.id,
        });
        if (!sub)
            return res.status(404).json({ error: "Subscription not found." });

        const base = sub.expiresAt > new Date() ? sub.expiresAt : new Date();
        base.setDate(base.getDate() + parseInt(days));
        sub.expiresAt = base;
        sub.isActive = true;
        await sub.save();
        res.json(sub);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS
// GET /api/admin/subscriptions
// ─────────────────────────────────────────────────────────────────────────────
router.get("/subscriptions", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            pack,
            course,
            grantedBy,
            status = "all",
            search,
        } = req.query;
        const now = new Date();
        const query = {};
        if (pack) query.pack = pack;
        if (course) query.course = course;
        if (grantedBy) query.grantedBy = grantedBy;
        if (status === "active") {
            query.isActive = true;
            query.expiresAt = { $gt: now };
        }
        if (status === "expired") {
            query.$or = [{ isActive: false }, { expiresAt: { $lte: now } }];
        }
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
        res.status(500).json({ error: "Failed to fetch subscriptions." });
    }
});

router.patch("/subscriptions/:id", async (req, res) => {
    try {
        const allowed = ["isActive", "expiresAt", "note"];
        const update = {};
        allowed.forEach((k) => {
            if (req.body[k] !== undefined) update[k] = req.body[k];
        });
        const sub = await Subscription.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true },
        );
        if (!sub)
            return res.status(404).json({ error: "Subscription not found." });
        res.json(sub);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/subscriptions/:id", async (req, res) => {
    try {
        await Subscription.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete subscription." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCES
// GET   /api/admin/resources
// PATCH /api/admin/resources/:id  — toggle published, edit metadata
// DELETE /api/admin/resources/:id — hard delete
// ─────────────────────────────────────────────────────────────────────────────
router.get("/resources", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            course,
            type,
            search,
            published,
        } = req.query;
        const query = {};
        if (course) query.course = course;
        if (type) query.type = type;
        if (published !== undefined) query.isPublished = published === "true";
        if (search) query.$text = { $search: search };
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Resource.countDocuments(query);
        const resources = await Resource.find(query)
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        res.json({
            resources,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch resources." });
    }
});

router.patch("/resources/:id", async (req, res) => {
    try {
        const allowed = [
            "title",
            "description",
            "isPublished",
            "isFree",
            "subject",
            "faculty",
            "tags",
            "type",
            "source",
            "catalogueEnabled",
            "cataloguePageIndex",
            "priority",
            // PYQ-specific
            "pyqExamType",
            "pyqYear",
            "pyqSeason",
            "pyqSemester",
            "isPyqFree",
            "isSolutionFree",
            "solutionFileUrl",
            "solutionCloudinaryId",
        ];
        const update = {};
        allowed.forEach((k) => {
            if (req.body[k] !== undefined) update[k] = req.body[k];
        });
        const resource = await Resource.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true },
        );
        if (!resource)
            return res.status(404).json({ error: "Resource not found." });
        res.json(resource);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── PATCH /api/admin/resources/:id/pages ─────────────────────────────────────
// Reorder / delete / append pages for a paged-mode resource.
// Body: { pageImages: string[] }   — the new ordered array of Cloudinary URLs
// Deleted pages are destroyed on Cloudinary automatically.
router.patch("/resources/:id/pages", async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ error: "Resource not found." });
        if (resource.storageMode !== "pages")
            return res.status(400).json({ error: "Not a paged resource." });

        const { pageImages } = req.body;
        if (!Array.isArray(pageImages) || pageImages.length === 0)
            return res.status(400).json({ error: "pageImages array is required." });

        // Find pages that were removed so we can delete them from Cloudinary
        const { cloudinary } = require("../config/cloudinary");
        const removed = (resource.pageImages || []).filter(
            (url) => !pageImages.includes(url),
        );
        for (const url of removed) {
            try {
                // Extract public_id from the Cloudinary URL
                const match = url.match(new RegExp('/upload/(?:v\\d+/)?([^?]+?)(?:\\.[^./?]+)?$'));
                if (match) {
                    await cloudinary.uploader.destroy(match[1], { resource_type: "image" });
                }
            } catch (e) {
                console.warn("Could not delete page from Cloudinary:", e.message);
            }
        }

        const updated = await Resource.findByIdAndUpdate(
            req.params.id,
            { pageImages, pageCount: pageImages.length },
            { new: true },
        );
        res.json(updated);
    } catch (err) {
        console.error("pages patch error:", err);
        res.status(500).json({ error: err.message || "Failed to update pages." });
    }
});

router.delete("/resources/:id", async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource)
            return res.status(404).json({ error: "Resource not found." });
        if (resource.cloudinaryId) {
            const { deleteFromCloudinary } = require("../config/cloudinary");
            const isPdf = resource.fileUrl?.includes("/raw/");
            await deleteFromCloudinary(
                resource.cloudinaryId,
                isPdf ? "raw" : "image",
            ).catch((e) =>
                console.warn("Cloudinary delete failed:", e.message),
            );
        }
        await Resource.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete resource." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTES
// GET    /api/admin/notes
// DELETE /api/admin/notes/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/notes", async (req, res) => {
    try {
        const { page = 1, limit = 20, search, userId } = req.query;
        const query = {};
        if (userId) query.user = userId;
        if (search) query.$text = { $search: search };
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Note.countDocuments(query);
        const notes = await Note.find(query)
            .populate("user", "name email roll")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        res.json({
            notes,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch notes." });
    }
});

router.delete("/notes/:id", async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete note." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PROMO CODES
// GET    /api/admin/promos          — list all promo codes
// POST   /api/admin/promos          — create a promo code
// PATCH  /api/admin/promos/:id      — update a promo code
// DELETE /api/admin/promos/:id      — delete a promo code
// PATCH  /api/admin/promos/:id/toggle — toggle isActive
// ─────────────────────────────────────────────────────────────────────────────
router.get("/promos", async (req, res) => {
    try {
        const promos = await PromoCode.find()
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
        res.json(promos);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch promo codes." });
    }
});

router.post("/promos", async (req, res) => {
    try {
        const {
            code,
            description,
            applicablePlan,
            discountType,
            discountValue,
            maxUses,
            isActive,
            expiresAt,
        } = req.body;

        if (!code || discountValue === undefined || discountValue === null)
            return res
                .status(400)
                .json({ error: "code and discountValue are required." });

        const promo = await PromoCode.create({
            code: code.trim().toUpperCase(),
            description: description || "",
            applicablePlan: applicablePlan || "any",
            discountType: discountType || "fixed",
            discountValue: Number(discountValue),
            maxUses: maxUses ? Number(maxUses) : null,
            isActive: isActive !== undefined ? isActive : true,
            expiresAt: expiresAt || null,
            createdBy: req.user._id,
        });

        res.status(201).json(promo);
    } catch (err) {
        if (err.code === 11000)
            return res
                .status(400)
                .json({ error: "Promo code already exists." });
        res.status(400).json({ error: err.message });
    }
});

router.patch("/promos/:id", async (req, res) => {
    try {
        const allowed = [
            "description",
            "applicablePlan",
            "discountType",
            "discountValue",
            "maxUses",
            "isActive",
            "expiresAt",
        ];
        const update = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }
        const promo = await PromoCode.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true,
        });
        if (!promo)
            return res.status(404).json({ error: "Promo code not found." });
        res.json(promo);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.patch("/promos/:id/toggle", async (req, res) => {
    try {
        const promo = await PromoCode.findById(req.params.id);
        if (!promo)
            return res.status(404).json({ error: "Promo code not found." });
        promo.isActive = !promo.isActive;
        await promo.save();
        res.json(promo);
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle promo code." });
    }
});

router.delete("/promos/:id", async (req, res) => {
    try {
        const promo = await PromoCode.findByIdAndDelete(req.params.id);
        if (!promo)
            return res.status(404).json({ error: "Promo code not found." });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete promo code." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PLANS
// GET    /api/admin/plans         — list all plans
// POST   /api/admin/plans         — create plan
// PATCH  /api/admin/plans/:id     — update plan
// DELETE /api/admin/plans/:id     — delete plan
// ─────────────────────────────────────────────────────────────────────────────
const Plan = require("../models/Plan");

router.get("/plans", async (req, res) => {
    try {
        const plans = await Plan.find().sort({ sortOrder: 1, createdAt: 1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch plans." });
    }
});

router.post("/plans", async (req, res) => {
    try {
        const {
            pack,
            name,
            headline,
            period,
            perks,
            color,
            popular,
            cta,
            priceINR,
            durationDays,
            fixedExpiryDate,
            isActive,
            sortOrder,
        } = req.body;
        if (!pack || !name || !priceINR)
            return res.status(400).json({
                error: "pack, name, and priceINR are required.",
            });
        if (!durationDays && !fixedExpiryDate)
            return res.status(400).json({
                error: "Either durationDays or fixedExpiryDate is required.",
            });
        const plan = await Plan.create({
            pack,
            name,
            headline,
            period,
            perks: perks || [],
            color: color || "accent",
            popular: popular || false,
            cta: cta || `Pay ₹${priceINR}`,
            priceINR: Number(priceINR),
            durationDays: durationDays ? Number(durationDays) : null,
            fixedExpiryDate: fixedExpiryDate || null,
            isActive: isActive !== undefined ? isActive : true,
            sortOrder: sortOrder || 0,
        });
        res.status(201).json(plan);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.patch("/plans/:id", async (req, res) => {
    try {
        const allowed = [
            "pack",
            "name",
            "headline",
            "period",
            "perks",
            "color",
            "popular",
            "cta",
            "priceINR",
            "durationDays",
            "fixedExpiryDate",
            "isActive",
            "sortOrder",
        ];
        const update = {};
        allowed.forEach((k) => {
            if (req.body[k] !== undefined) update[k] = req.body[k];
        });
        const plan = await Plan.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true,
        });
        if (!plan) return res.status(404).json({ error: "Plan not found." });
        res.json(plan);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete("/plans/:id", async (req, res) => {
    try {
        const plan = await Plan.findByIdAndDelete(req.params.id);
        if (!plan) return res.status(404).json({ error: "Plan not found." });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete plan." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST — Announcements & Notifications
// POST /api/admin/broadcast          — send announcement or notification(s)
// GET  /api/admin/announcements      — list all announcements
// DELETE /api/admin/announcements/:id
// GET  /api/admin/notifications/sent — list sent notifications (paginated)
// ─────────────────────────────────────────────────────────────────────────────
const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");
const ViolationReport = require("../models/ViolationReport");
const { Resend } = require("resend");

// Build a Mongo query that matches users in the target group
// target.value can now be a single value OR an array of values.
// target.type "individual" uses user _id(s) directly.
function buildUserQuery(target) {
    if (!target || target.type === "all") return {};

    // Normalise value to array
    const vals = Array.isArray(target.value) ? target.value : [target.value];

    if (target.type === "sem") {
        const nums = vals.map(Number).filter((n) => !isNaN(n));
        return nums.length === 1
            ? { currentSemester: nums[0] }
            : { currentSemester: { $in: nums } };
    }
    if (target.type === "year") {
        const suffixes = vals.map((v) => String(v).slice(-2));
        return suffixes.length === 1
            ? { roll: { $regex: `^${suffixes[0]}` } }
            : { $or: suffixes.map((s) => ({ roll: { $regex: `^${s}` } })) };
    }
    if (target.type === "programme") {
        return vals.length === 1
            ? { course: vals[0] }
            : { course: { $in: vals } };
    }
    if (target.type === "branch") {
        return vals.length === 1
            ? { branch: vals[0] }
            : { branch: { $in: vals } };
    }
    if (target.type === "individual") {
        return vals.length === 1 ? { _id: vals[0] } : { _id: { $in: vals } };
    }
    return {};
}

router.post("/broadcast", async (req, res) => {
    try {
        const {
            kind, // "announcement" | "notification"
            title,
            body,
            target, // { type, value }
            expiryDays, // for announcements: number of days
            expiresAt: expiresAtRaw, // or a fixed ISO date
            sendEmail, // bool — also send an email to matched users
            emailSubject,
            emailBody,
        } = req.body;

        if (!title?.trim() || !body?.trim())
            return res
                .status(400)
                .json({ error: "title and body are required." });
        if (!kind || !["announcement", "notification"].includes(kind))
            return res
                .status(400)
                .json({ error: "kind must be announcement or notification." });

        const io = req.app.get("io");
        const activeConnections = req.app.get("activeConnections");

        // ── Announcement ──────────────────────────────────────────────────────
        if (kind === "announcement") {
            let expiry;
            if (expiresAtRaw) {
                expiry = new Date(expiresAtRaw);
            } else {
                const days = parseInt(expiryDays) || 7;
                expiry = new Date(Date.now() + days * 86400000);
            }
            if (isNaN(expiry.getTime()) || expiry <= new Date())
                return res
                    .status(400)
                    .json({ error: "expiresAt must be in the future." });

            const announcement = await Announcement.create({
                title: title.trim(),
                body: body.trim(),
                target: target || { type: "all", value: null },
                expiresAt: expiry,
                createdBy: req.user._id,
            });

            // Push via socket to all currently-connected matching users
            if (io && activeConnections) {
                const userQuery = buildUserQuery(target);
                const matchedUsers = await User.find(userQuery)
                    .select("_id")
                    .lean();
                const matchedIds = new Set(
                    matchedUsers.map((u) => String(u._id)),
                );
                for (const [userId, userSockets] of activeConnections.entries()) {
                    if (matchedIds.has(userId)) {
                        for (const socketId of userSockets.keys()) {
                            io.to(socketId).emit("new_announcement", announcement);
                        }
                    }
                }
            }

            return res.status(201).json({ success: true, announcement });
        }

        // ── Notification (per-user) ───────────────────────────────────────────
        if (kind === "notification") {
            const userQuery = buildUserQuery(target);
            const matchedUsers = await User.find(userQuery)
                .select("_id email name")
                .lean();

            if (!matchedUsers.length)
                return res
                    .status(400)
                    .json({ error: "No users matched the target." });

            // Create one Notification doc per matched user
            const docs = matchedUsers.map((u) => ({
                userId: u._id,
                title: title.trim(),
                body: body.trim(),
                createdBy: req.user._id,
            }));
            const notifications = await Notification.insertMany(docs);

            // Push via socket to online users
            if (io && activeConnections) {
                const idToNotif = {};
                notifications.forEach((n) => {
                    idToNotif[String(n.userId)] = n;
                });
                for (const [userId, userSockets] of activeConnections.entries()) {
                    if (idToNotif[userId]) {
                        for (const socketId of userSockets.keys()) {
                            io.to(socketId).emit(
                                "new_notification",
                                idToNotif[userId],
                            );
                        }
                    }
                }
            }

            // Optionally send emails
            if (sendEmail) {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const subject = (emailSubject || title).trim();
                const htmlBody = (emailBody || body)
                    .trim()
                    .replace(/\n/g, "<br>");

                // Fire-and-forget — don't block the response
                Promise.allSettled(
                    matchedUsers.map((u) =>
                        resend.emails.send({
                            from: "WowNotes <onboarding@resend.dev>",
                            to: u.email,
                            subject,
                            html: `
                                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0f1216;color:#e8e4d8;border-radius:12px;overflow:hidden;">
                                  <div style="background:linear-gradient(135deg,#1a1f28,#13161d);padding:24px 28px;border-bottom:1px solid rgba(255,210,63,.15);">
                                    <h2 style="margin:0;font-size:1.1rem;color:#ffd23f;">${subject}</h2>
                                    <p style="margin:4px 0 0;font-size:.75rem;color:rgba(200,195,180,.5);">WowNotes · KIIT</p>
                                  </div>
                                  <div style="padding:24px 28px;font-size:.9rem;line-height:1.7;color:#e8e4d8;">${htmlBody}</div>
                                  <div style="padding:12px 28px;background:rgba(0,0,0,.25);font-size:.7rem;color:rgba(150,145,130,.45);">
                                    WowNotes · KIIT University · ${new Date().toLocaleString("en-IN")}
                                  </div>
                                </div>`,
                        }),
                    ),
                ).then((results) => {
                    const failed = results.filter(
                        (r) => r.status === "rejected",
                    ).length;
                    if (failed)
                        console.warn(
                            `Broadcast email: ${failed} failed out of ${matchedUsers.length}`,
                        );
                });
            }

            return res.status(201).json({
                success: true,
                sent: notifications.length,
                emailQueued: !!sendEmail,
            });
        }
    } catch (err) {
        console.error("Broadcast error:", err);
        res.status(500).json({ error: err.message || "Broadcast failed." });
    }
});

// List all announcements (admin view)
router.get("/announcements", async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch announcements." });
    }
});

router.delete("/announcements/:id", async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete announcement." });
    }
});

// List sent notifications (admin view)
router.get("/notifications/sent", async (req, res) => {
    try {
        const { page = 1, limit = 30 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Notification.countDocuments();
        const notifications = await Notification.find()
            .populate("userId", "name email roll")
            .populate("createdBy", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();
        res.json({
            notifications,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch notifications." });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// VIOLATION REPORTS
// POST /api/admin/violation-report  — filed by authenticated user (not admin-only)
// GET  /api/admin/violations         — admin view of all reports
// PATCH /api/admin/violations/:id/review — mark as reviewed
// ──────────────────────────────────────────────────────────────────────────────
// NOTE: violation-report is intentionally placed BEFORE router.use(requireAdmin)
// so regular authenticated users can POST it. The GET/PATCH are admin-only.

// Get all violation reports (admin only — below router.use(requireAdmin))
router.get("/violations", async (req, res) => {
    try {
        const { page = 1, limit = 30, reviewed } = req.query;
        const query = {};
        if (reviewed !== undefined) query.reviewed = reviewed === "true";
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await ViolationReport.countDocuments(query);
        const reports = await ViolationReport.find(query)
            .populate("user", "name email roll avatar")
            .populate("resource", "title")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();
        res.json({
            reports,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch violation reports." });
    }
});

// Mark a report as reviewed
router.patch("/violations/:id/review", async (req, res) => {
    try {
        const report = await ViolationReport.findByIdAndUpdate(
            req.params.id,
            { reviewed: true },
            { new: true },
        );
        if (!report)
            return res.status(404).json({ error: "Report not found." });
        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ error: "Failed to update report." });
    }
});

// ── GET /api/admin/resources/:id/ppt-siblings ─────────────────────────────────
// Returns all PPT resources in the same subject+course+semester group.
router.get("/resources/:id/ppt-siblings", async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ error: "Not found." });
        const siblings = await Resource.find({
            _id: { $ne: resource._id },
            type: "ppt",
            course: resource.course,
            semester: resource.semester,
            subject: resource.subject,
        }).select("_id title faculty fileUrl storageMode pageCount createdAt isPublished").lean();
        res.json({ current: resource, siblings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;