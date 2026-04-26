const express = require("express");
const https = require("https");
const http = require("http");
const Resource = require("../models/Resource");
const Subscription = require("../models/Subscription");
const Curriculum = require("../models/Curriculum");
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

// Helper: check if user has access to a resource (course + semester).
// PYQs have semester=null — any active same-course subscription is sufficient.
async function userHasAccess(user, course, semester) {
    if (user.role === "admin" || user.role === "friend") return true;
    const subs = await Subscription.find({
        user: user._id,
        isActive: true,
        expiresAt: { $gt: new Date() },
    });
    if (semester == null) {
        // PYQ or semester-agnostic resource: any active sub for the course works
        return subs.some((s) => s.isActive && s.course === course);
    }
    return subs.some((s) => s.grantsAccess(course, semester));
}

// GET /api/resources
router.get("/", requireAuth, async (req, res) => {
    try {
        const {
            course,
            semester,
            year,
            pyqYear,
            subject,
            faculty,
            source,
            type,
            exam,
            search,
            free,
        } = req.query;

        const query = { isPublished: true };
        // NOTE: we intentionally do NOT add semester to the DB query anymore.
        // Visibility is determined purely by curriculum subject membership, not
        // by the semester value stored on the resource itself.
        if (course) query.course = course;
        if (year) query.year = parseInt(year);
        if (pyqYear) query.pyqYear = parseInt(pyqYear);
        if (faculty) query.faculty = new RegExp(faculty, "i");
        if (source) query.source = source;
        if (type) query.type = type;
        if (exam) query.exam = exam;
        if (free === "true") query.isFree = true;

        // ── Curriculum-driven subject filtering ───────────────────────────────
        //
        // THE CURRICULUM IS THE SINGLE SOURCE OF TRUTH. Rules per type:
        //
        //  "other"   → bypass curriculum entirely; show all published resources
        //              for the course (no subject gate).
        //
        //  "pyq"     → subject-linked across the user's ENTIRE branch curriculum
        //              (all semesters). A student sees PYQs for any subject that
        //              appears anywhere in their branch, regardless of which
        //              semester the PYQ was for. Semester stored on resource is
        //              irrelevant.
        //
        //  everything else (notes, assignment, syllabus, ppt, …)
        //            → subject-linked to the SELECTED semester only. The
        //              semester stored on the resource is irrelevant; only
        //              curriculum membership of the subject matters.
        //
        //  Fallback  → admin / no branch set / no curriculum found:
        //              plain text subject match only.

        const userBranch = req.user.branch;
        const userCourse  = req.user.course;

        // Helper: build a regex allowlist query from a subjects array
        const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const subjectAllowlist = (subjects) =>
            subjects
                .flatMap((s) => [s.name, s.shortName].filter(Boolean))
                .map((t) => ({ subject: new RegExp(escRe(t), "i") }));

        // Helper: flatten all subjects from every semester, deduplicated by name
        const allSemSubjects = (curriculumDoc) => {
            const seen = new Set();
            const out  = [];
            for (const semDoc of curriculumDoc.semesters) {
                for (const s of semDoc.subjects) {
                    if (!seen.has(s.name)) { seen.add(s.name); out.push(s); }
                }
            }
            return out;
        };

        if (type === "other") {
            // ── "other" bypasses curriculum — show everything for the course ──
            if (subject) query.subject = new RegExp(escRe(subject), "i");
            // no further subject gating

        } else if (
            // PYQ: use the user's own profile course+branch as source of truth —
            // never depends on a `course` query param being present.
            // All other types: require `course` from query params as before.
            (type === "pyq" ? (userBranch && userCourse) : (course && userBranch && userCourse))
        ) {
            const effectiveCourse = type === "pyq" ? userCourse : course;
            const curriculumDoc = await Curriculum.findOne({
                program: effectiveCourse,
                branch: userBranch,
            });

            let curriculumSubjects = [];

            if (curriculumDoc) {
                if (type === "pyq") {
                    // PYQ: subject must exist somewhere in the branch curriculum (all sems)
                    curriculumSubjects = allSemSubjects(curriculumDoc);
                } else if (semester) {
                    // All other types: subject must be in the selected semester
                    const semDoc = curriculumDoc.semesters.find(
                        (s) => s.sem === parseInt(semester),
                    );
                    curriculumSubjects = semDoc ? semDoc.subjects : [];
                }
            }

            if (subject) {
                // Subject pill clicked — match by name OR shortName
                const matched = curriculumSubjects.find(
                    (s) =>
                        s.name.toLowerCase() === subject.toLowerCase() ||
                        (s.shortName &&
                            s.shortName.toLowerCase() === subject.toLowerCase()),
                );
                const terms = matched
                    ? [matched.name, matched.shortName].filter(Boolean)
                    : [subject];
                query.$or = terms.map((t) => ({
                    subject: new RegExp(escRe(t), "i"),
                }));
            } else if (curriculumSubjects.length > 0) {
                // No subject pill — match ANY subject in the allowlist
                query.$or = subjectAllowlist(curriculumSubjects);
            }
            // resource.branch and resource.semester never added to the query.

        } else {
            // Fallback (admin browsing, no branch set, etc.)
            if (subject) query.subject = new RegExp(escRe(subject), "i");
        }

        // PYQs sort by paper year (latest first); all other types by admin priority then upload date.
        const isPyqQuery = query.type === 'pyq';
        const defaultSort = isPyqQuery
            ? { pyqYear: -1, pyqExamType: 1, pyqSeason: 1, createdAt: -1 }
            : { priority: -1, createdAt: -1 };

        let resources;
        if (search) {
            resources = await Resource.find({
                ...query,
                $text: { $search: search },
            }).sort({
                score: { $meta: 'textScore' },
                ...defaultSort,
            });
        } else {
            resources = await Resource.find(query).sort(defaultSort);
        }

        // console.log("[DBG] resources found:", resources.length);

        const role = req.user.role;
        const hasFullAccess = role === "admin" || role === "friend";

        const subs = hasFullAccess
            ? []
            : await Subscription.find({
                  user: req.user._id,
                  isActive: true,
                  expiresAt: { $gt: new Date() },
              });

        const enriched = resources.map((r) => {
            const rObj = r.toObject();
            if (hasFullAccess || r.isFree) {
                rObj.accessible = true;
            } else if (r.type === "pyq") {
                // PYQs have semester=null so grantsAccess() always returns false
                // for semester/year packs. Instead, any active subscription for
                // the same course is sufficient to access the question paper.
                rObj.accessible = subs.some(
                    (s) => s.isActive && s.course === r.course && new Date() < s.expiresAt,
                );
            } else {
                rObj.accessible = subs.some((s) =>
                    s.grantsAccess(r.course, r.semester),
                );
            }
            // ── PYQ solution gating ──────────────────────────────────────────
            if (r.type === "pyq") {
                // Question paper: free if isPyqFree OR user has any active sub
                // for this course OR admin/friend.
                // NOTE: r.isFree grants question paper access only — NOT solution.
                rObj.pyqAccessible =
                    hasFullAccess || r.isPyqFree || rObj.accessible;

                const hasSolution = !!(
                    r.solutionFileUrl || r.solutionPageImages?.length
                );
                rObj.hasSolution = hasSolution;

                // Solution access is INDEPENDENT of isFree / isPyqFree.
                // It requires EITHER isSolutionFree=true OR the user has an
                // active subscription for this course (any semester/year pack).
                // Simply being a "free resource" never unlocks the solution.
                const hasAnySub = subs.some((s) => s.isActive && s.course === r.course && new Date() < s.expiresAt);
                rObj.solutionAccessible =
                    hasSolution &&
                    (hasFullAccess || r.isSolutionFree || hasAnySub);

                // Strip solution URLs if user can't access solution
                if (!rObj.solutionAccessible) {
                    delete rObj.solutionFileUrl;
                    delete rObj.solutionCloudinaryId;
                    delete rObj.solutionPageImages;
                    delete rObj.solutionPageFolder;
                }
            }
            return rObj;
        });

        res.json(enriched);
    } catch (err) {
        console.error("[resources] GET / error:", err);
        res.status(500).json({ error: "Failed to fetch resources." });
    }
});

router.get("/free", requireAuth, async (req, res) => {
    try {
        const resources = await Resource.find({
            isFree: true,
            isPublished: true,
        }).sort({ priority: -1, createdAt: -1 });
        res.json(resources.map((r) => ({ ...r.toObject(), accessible: true })));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch free resources." });
    }
});

// GET /api/resources/catalogue
// Returns resources the admin has explicitly enabled for catalogue display,
// using the page index the admin selected. No subscription gate — teaser only.
router.get("/catalogue", requireAuth, async (req, res) => {
    try {
        const resources = await Resource.find({
            isPublished: true,
            storageMode: "pages",
            catalogueEnabled: true,
            pageCount: { $gt: 0 },
        })
            .select(
                "_id title subject type course semester pageCount cataloguePageIndex priority",
            )
            .sort({ priority: -1, createdAt: -1 });

        const result = resources.map((r) => ({
            _id: r._id,
            title: r.title,
            subject: r.subject,
            type: r.type,
            course: r.course,
            semester: r.semester,
            pageCount: r.pageCount,
            previewPageIndex: Math.min(r.cataloguePageIndex || 1, r.pageCount),
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch catalogue." });
    }
});

// GET /api/resources/:id/preview-page/:index
// Proxies a single page image for catalogue preview — auth only, no subscription gate.
router.get("/:id/preview-page/:index", requireAuth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (
            !resource ||
            !resource.isPublished ||
            resource.storageMode !== "pages"
        )
            return res.status(404).json({ error: "Resource not found." });

        const index = parseInt(req.params.index);
        if (isNaN(index) || index < 1 || index > resource.pageImages.length)
            return res.status(400).json({ error: "Invalid page index." });

        const imageUrl = resource.pageImages[index - 1];
        if (!imageUrl)
            return res.status(404).json({ error: "Page not found." });

        const fetcher = imageUrl.startsWith("https") ? https : http;
        fetcher
            .get(imageUrl, (cloudRes) => {
                if (cloudRes.statusCode !== 200)
                    return res
                        .status(502)
                        .json({ error: "Failed to fetch preview." });
                res.setHeader("Content-Type", "image/jpeg");
                res.setHeader("Cache-Control", "private, max-age=3600");
                res.setHeader("X-Content-Type-Options", "nosniff");
                cloudRes.pipe(res);
            })
            .on("error", () =>
                res.status(502).json({ error: "Stream failed." }),
            );
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch preview page." });
    }
});

// GET /api/resources/:id
router.get("/:id", requireAuth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource || !resource.isPublished)
            return res.status(404).json({ error: "Resource not found." });

        if (
            !resource.isFree &&
            req.user.role !== "admin" &&
            req.user.role !== "friend"
        ) {
            const access = await userHasAccess(
                req.user,
                resource.course,
                resource.semester,
            );
            if (!access)
                return res
                    .status(403)
                    .json({ error: "Subscription required." });
        }

        // Increment views
        await Resource.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

        const obj = resource.toObject();

        // Strip solution URLs if user doesn't have solution access.
        // isFree / isPyqFree only gates the question paper — NOT the solution.
        // Solution requires: isSolutionFree=true OR any active sub for the course.
        if (resource.type === "pyq") {
            const isAdmin = req.user.role === "admin" || req.user.role === "friend";
            if (isAdmin || resource.isSolutionFree) {
                obj.solutionAccessible = true;
            } else {
                // Check for any active subscription for this course
                const anySub = await Subscription.findOne({
                    user: req.user._id,
                    isActive: true,
                    course: resource.course,
                    expiresAt: { $gt: new Date() },
                });
                if (anySub) {
                    obj.solutionAccessible = true;
                } else {
                    obj.solutionFileUrl = null;
                    obj.solutionCloudinaryId = null;
                    obj.solutionPageImages = [];
                    obj.solutionPageFolder = null;
                    obj.solutionAccessible = false;
                }
            }
        } else {
            obj.solutionAccessible = true;
        }

        res.json({ ...obj, accessible: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch resource." });
    }
});

// POST /api/resources — admin creates resource
router.post("/", requireAuth, requireAdmin, async (req, res) => {
    try {
        const body = { ...req.body };
        // Sanitise optional enum/number fields — the form sends "" when not selected,
        // but Mongoose only accepts null | "midsem" | "endsem" for exam.
        if (!body.exam) body.exam = null;
        if (!body.year) body.year = null;
        if (!body.branch) body.branch = null;
        const resource = await Resource.create({
            ...body,
            uploadedBy: req.user._id,
        });
        res.status(201).json(resource);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/resources/:id — admin updates
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const resource = await Resource.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            },
        );
        if (!resource) return res.status(404).json({ error: "Not found." });
        res.json(resource);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/resources/:id — admin deletes
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ error: "Not found." });

        // Clean up Cloudinary asset so we don't leave orphaned files
        if (resource.cloudinaryId) {
            const { deleteFromCloudinary } = require("../config/cloudinary");
            const isPdf = resource.fileUrl?.includes("/raw/");
            await deleteFromCloudinary(
                resource.cloudinaryId,
                isPdf ? "raw" : "image",
            ).catch((err) =>
                console.warn("Cloudinary delete failed:", err.message),
            );
        }

        await Resource.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete." });
    }
});

// ── GET /api/resources/:id/pages ─────────────────────────────────────────────
// Returns the ordered array of page INDEX numbers only (not Cloudinary URLs).
// The actual image bytes are served via /:id/page/:index below.
// Access-checked the same way as /view.
router.get("/:id/pages", requireAuth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource || !resource.isPublished)
            return res.status(404).json({ error: "Resource not found." });

        if (resource.storageMode !== "pages")
            return res
                .status(400)
                .json({ error: "This resource is not stored as page images." });

        if (
            !resource.isFree &&
            req.user.role !== "admin" &&
            req.user.role !== "friend"
        ) {
            const access = await userHasAccess(
                req.user,
                resource.course,
                resource.semester,
            );
            if (!access)
                return res
                    .status(403)
                    .json({ error: "Subscription required." });
        }

        // Return only the count — viewer fetches each page via /:id/page/:index
        res.json({
            pageCount: resource.pageCount || resource.pageImages.length,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch page list." });
    }
});

// ── GET /api/resources/:id/page/:index ───────────────────────────────────────
// Proxies a single page image through the server.
// - Cloudinary URL is NEVER sent to the browser (security)
// - No CORS / canvas-taint issues since it's same-origin
// - Access-checked on every request
// :index is 1-based
router.get("/:id/page/:index", requireAuth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource || !resource.isPublished)
            return res.status(404).json({ error: "Resource not found." });

        if (resource.storageMode !== "pages")
            return res.status(400).json({ error: "Not a paged resource." });

        if (
            !resource.isFree &&
            req.user.role !== "admin" &&
            req.user.role !== "friend"
        ) {
            const access = await userHasAccess(
                req.user,
                resource.course,
                resource.semester,
            );
            if (!access)
                return res
                    .status(403)
                    .json({ error: "Subscription required." });
        }

        const index = parseInt(req.params.index);
        if (isNaN(index) || index < 1 || index > resource.pageImages.length) {
            return res.status(400).json({ error: "Invalid page index." });
        }

        const imageUrl = resource.pageImages[index - 1];
        if (!imageUrl)
            return res.status(404).json({ error: "Page not found." });

        // Proxy the image bytes — browser never sees the Cloudinary URL
        const fetcher = imageUrl.startsWith("https") ? https : http;
        fetcher
            .get(imageUrl, (cloudRes) => {
                if (cloudRes.statusCode !== 200) {
                    return res
                        .status(502)
                        .json({ error: "Failed to fetch page image." });
                }
                res.setHeader("Content-Type", "image/jpeg");
                res.setHeader("Cache-Control", "private, max-age=3600"); // cache 1h in browser
                res.setHeader("X-Content-Type-Options", "nosniff");
                cloudRes.pipe(res);
            })
            .on("error", () =>
                res.status(502).json({ error: "Failed to stream page." }),
            );
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch page." });
    }
});

// ── GET /api/resources/:id/view ───────────────────────────────────────────────
// Proxies the Cloudinary raw file through our server with correct headers so
// the browser opens it inline as a PDF instead of downloading with no name.
router.get("/:id/view", requireAuth, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource || !resource.isPublished)
            return res.status(404).json({ error: "Resource not found." });

        // Access check (admin always passes)
        if (
            !resource.isFree &&
            req.user.role !== "admin" &&
            req.user.role !== "friend"
        ) {
            const access = await userHasAccess(
                req.user,
                resource.course,
                resource.semester,
            );
            if (!access)
                return res
                    .status(403)
                    .json({ error: "Subscription required." });
        }

        if (!resource.fileUrl)
            return res.status(404).json({ error: "No file attached." });

        // Increment views
        await Resource.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

        // Sanitize title for Content-Disposition filename
        const filename =
            (resource.title || "document")
                .replace(/[^a-zA-Z0-9 \-_.]/g, "")
                .trim()
                .replace(/\s+/g, "_") + ".pdf";

        // Security headers — prevent the browser from offering a save/download
        // dialog and block the response from being embedded in iframes elsewhere
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        // Disallow the PDF URL from being opened directly in a new tab
        // (the viewer page is the only intended consumer)
        res.setHeader("Content-Security-Policy", "default-src 'none'");

        // Choose http or https module based on URL
        const fetcher = resource.fileUrl.startsWith("https") ? https : http;

        fetcher
            .get(resource.fileUrl, (cloudRes) => {
                if (cloudRes.statusCode !== 200) {
                    return res
                        .status(502)
                        .json({ error: "Failed to fetch file from storage." });
                }
                // Forward content-length if available so browser shows progress
                if (cloudRes.headers["content-length"]) {
                    res.setHeader(
                        "Content-Length",
                        cloudRes.headers["content-length"],
                    );
                }
                cloudRes.pipe(res);
            })
            .on("error", () => {
                res.status(502).json({ error: "Failed to stream file." });
            });
    } catch (err) {
        res.status(500).json({ error: "Failed to view resource." });
    }
});

module.exports = router;