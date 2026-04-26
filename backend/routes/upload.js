const express = require("express");
const {
    upload,
    uploadToCloudinary,
    deleteFromCloudinary,
    cloudinary,
} = require("../config/cloudinary");
const Resource = require("../models/Resource");
const router = express.Router();

// ── Auth helpers ──────────────────────────────────────────────────────────────
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
// Contributors and admins can upload
const requireUploader = (req, res, next) => {
    if (req.user?.role !== "admin" && req.user?.role !== "contributor")
        return res.status(403).json({ error: "Upload access required." });
    next();
};

const sanitizeFilename = (name) =>
    name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9\-_. ]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase()
        .substring(0, 80) || `file-${Date.now()}`;

// ── POST /api/upload/resource ─────────────────────────────────────────────────
// Files ≤ 10 MB  → upload whole PDF to Cloudinary raw, return JSON
// Files  > 10 MB → this endpoint is NOT used for the actual file upload.
//                  Instead: frontend rasterises pages in-browser, requests
//                  signed upload params per page via /upload/page-signature,
//                  uploads directly to Cloudinary, then calls /upload/resource-pages
//                  to persist the Resource document.
router.post(
    "/resource",
    requireAuth,
    requireUploader,
    upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file)
                return res.status(400).json({ error: "No file uploaded." });

            const {
                title,
                description,
                course,
                semester,
                subject,
                faculty,
                source,
                type,
                isFree,
                tags,
                exam,
                year,
                branch,
                pyqExamType,
                pyqYear,
                pyqSeason,
                pyqSemester,
                isPyqFree,
                isSolutionFree,
            } = req.body;

            const isPyq = type === "pyq";
            const sem = isPyq ? null : (parseInt(semester) || 1);
            const folder = `wownotes/${course || "general"}/${isPyq ? "pyq" : `sem${sem}`}`;
            const isPdf = req.file.mimetype === "application/pdf";
            const resourceType = isPdf ? "raw" : "image";

            const sanitized = sanitizeFilename(req.file.originalname);
            const publicId = isPdf ? sanitized + ".pdf" : `img-${Date.now()}`;

            const result = await uploadToCloudinary(
                req.file.buffer,
                folder,
                publicId,
                resourceType,
            );

            const resource = await Resource.create({
                title: title || req.file.originalname,
                description: description || "",
                course: course || "btech",
                semester: sem,
                subject: subject || "",
                faculty: faculty || "",
                source: source || "other",
                type: type || "notes",
                isFree: isFree === "true",
                tags: tags
                    ? tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                    : [],
                exam: exam || null,
                year: year ? parseInt(year) : null,
                branch: branch || null,
                pyqExamType: pyqExamType || null,
                pyqYear: pyqYear ? parseInt(pyqYear) : null,
                pyqSeason: pyqSeason || null,
                pyqSemester: pyqSemester ? parseInt(pyqSemester) : null,
                isPyqFree: isPyqFree === "true" || isPyqFree === true,
                isSolutionFree: isSolutionFree === "true" || isSolutionFree === true,
                fileUrl: result.secure_url,
                cloudinaryId: result.public_id,
                storageMode: "pdf",
                uploadedBy: req.user._id,
                isPublished: true,
            });

            res.status(201).json(resource);
        } catch (err) {
            console.error("Upload error:", err);
            res.status(500).json({ error: err.message || "Upload failed." });
        }
    },
);

// ── POST /api/upload/page-signature ──────────────────────────────────────────
// Returns a short-lived Cloudinary signed-upload parameter set so the browser
// can upload a single page image DIRECTLY to Cloudinary without routing the
// image bytes through our server.
//
// Body: { folder, publicId }
// Returns: { signature, timestamp, api_key, cloud_name, folder, public_id }
router.post("/page-signature", requireAuth, requireUploader, (req, res) => {
    try {
        const { folder, publicId } = req.body;
        if (!folder || !publicId)
            return res
                .status(400)
                .json({ error: "folder and publicId are required." });

        const timestamp = Math.round(Date.now() / 1000);

        // Parameters that MUST match what the browser sends to Cloudinary
        const paramsToSign = {
            folder,
            public_id: publicId,
            timestamp,
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET,
        );

        res.json({
            signature,
            timestamp,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            folder,
            public_id: publicId,
        });
    } catch (err) {
        console.error("Signature error:", err);
        res.status(500).json({ error: "Failed to generate upload signature." });
    }
});

// ── POST /api/upload/resource-pages ──────────────────────────────────────────
// Called by the browser AFTER all page images have been uploaded directly
// to Cloudinary. Creates the Resource document with storageMode = "pages".
//
// Body: { ...resourceFields, pageFolder, pageImages: [...urls], pageCount }
router.post(
    "/resource-pages",
    requireAuth,
    requireUploader,
    async (req, res) => {
        try {
            const {
                title,
                description,
                course,
                semester,
                subject,
                faculty,
                source,
                type,
                isFree,
                tags,
                exam,
                year,
                branch,
                pageFolder,
                pageImages,
                pageCount,
                pyqExamType,
                pyqYear,
                pyqSeason,
                pyqSemester,
                isPyqFree,
                isSolutionFree,
            } = req.body;

            if (
                !pageImages ||
                !Array.isArray(pageImages) ||
                pageImages.length === 0
            )
                return res
                    .status(400)
                    .json({ error: "pageImages array is required." });

            const isPyq = type === "pyq";
            const sem = isPyq ? null : (parseInt(semester) || 1);

            const resource = await Resource.create({
                title: title || "Untitled",
                description: description || "",
                course: course || "btech",
                semester: sem,
                subject: subject || "",
                faculty: faculty || "",
                source: source || "other",
                type: type || "notes",
                isFree: isFree === true || isFree === "true",
                tags: Array.isArray(tags)
                    ? tags
                    : tags
                      ? tags
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                      : [],
                exam: exam || null,
                year: year ? parseInt(year) : null,
                branch: branch || null,
                pyqExamType: pyqExamType || null,
                pyqYear: pyqYear ? parseInt(pyqYear) : null,
                pyqSeason: pyqSeason || null,
                pyqSemester: pyqSemester ? parseInt(pyqSemester) : null,
                isPyqFree: isPyqFree === "true" || isPyqFree === true,
                isSolutionFree: isSolutionFree === "true" || isSolutionFree === true,
                fileUrl: null,
                cloudinaryId: null,
                storageMode: "pages",
                pageFolder: pageFolder || null,
                pageImages,
                pageCount: parseInt(pageCount) || pageImages.length,
                uploadedBy: req.user._id,
                isPublished: true,
            });

            res.status(201).json(resource);
        } catch (err) {
            console.error("resource-pages error:", err);
            res.status(500).json({
                error: err.message || "Failed to create resource.",
            });
        }
    },
);

// ── DELETE /api/upload/resource/:id ──────────────────────────────────────────
router.delete("/resource/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource)
            return res.status(404).json({ error: "Resource not found." });

        if (resource.storageMode === "pages" && resource.pageFolder) {
            try {
                await cloudinary.api.delete_resources_by_prefix(
                    resource.pageFolder + "/",
                    { resource_type: "image" },
                );
                await cloudinary.api
                    .delete_folder(resource.pageFolder)
                    .catch(() => {});
            } catch (cdnErr) {
                console.warn(
                    "Cloudinary page-folder delete warning:",
                    cdnErr.message,
                );
            }
        } else if (resource.cloudinaryId) {
            const isPdf = resource.fileUrl?.includes("/raw/");
            await deleteFromCloudinary(
                resource.cloudinaryId,
                isPdf ? "raw" : "image",
            ).catch((e) => console.warn("Cloudinary delete warn:", e.message));
        }

        await Resource.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message || "Delete failed." });
    }
});

// ── POST /api/upload/avatar ───────────────────────────────────────────────────
// ── POST /api/upload/solution/:id ────────────────────────────────────────────
// Attach or replace the solution file on an existing PYQ resource.
// Admin / uploader only.
router.post(
    "/solution/:id",
    requireAuth,
    requireUploader,
    upload.single("file"),
    async (req, res) => {
        try {
            const resource = await Resource.findById(req.params.id);
            if (!resource)
                return res.status(404).json({ error: "Resource not found." });
            if (resource.type !== "pyq")
                return res
                    .status(400)
                    .json({ error: "Solution upload is only for PYQ resources." });
            if (!req.file)
                return res.status(400).json({ error: "No file uploaded." });

            const { uploadToCloudinary } = require("../config/cloudinary");
            const sanitizeFilename = (n) =>
                n.replace(/[^a-zA-Z0-9._-]/g, "_");

            const isPdf = req.file.mimetype === "application/pdf";
            const resourceType = isPdf ? "raw" : "image";
            const sem = resource.semester || 1;
            const folder = `wownotes/${resource.course || "general"}/sem${sem}/solutions`;
            const publicId = isPdf
                ? sanitizeFilename(req.file.originalname) + `_sol_${Date.now()}.pdf`
                : `sol-${Date.now()}`;

            // Delete old solution from Cloudinary if it exists
            if (resource.solutionCloudinaryId) {
                const { deleteFromCloudinary } = require("../config/cloudinary");
                await deleteFromCloudinary(
                    resource.solutionCloudinaryId,
                    resource.solutionFileUrl?.includes("/raw/") ? "raw" : "image",
                ).catch((e) =>
                    console.warn("Old solution delete failed:", e.message),
                );
            }

            const result = await uploadToCloudinary(
                req.file.buffer,
                folder,
                publicId,
                resourceType,
            );

            const updated = await Resource.findByIdAndUpdate(
                req.params.id,
                {
                    solutionFileUrl: result.secure_url,
                    solutionCloudinaryId: result.public_id,
                    solutionStorageMode: "pdf",
                },
                { new: true },
            );

            res.json(updated);
        } catch (err) {
            console.error("solution upload error:", err);
            res.status(500).json({ error: err.message || "Upload failed." });
        }
    },
);

router.post(
    "/avatar",
    requireAuth,
    upload.single("avatar"),
    async (req, res) => {
        try {
            if (!req.file)
                return res.status(400).json({ error: "No file uploaded." });

            const result = await uploadToCloudinary(
                req.file.buffer,
                "wownotes/avatars",
                `avatar_${req.user._id}`,
                "image",
            );

            res.json({ url: result.secure_url });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
);

// ── POST /api/upload/ppt-file/:id ─────────────────────────────────────────────
// Upload or replace the file for an existing PPT resource.
// Creates a NEW resource document cloned from the given resource but with the
// new file, so the "group" (same subject/sem) grows.  OR replaces the file on
// the existing resource if query param ?replace=true is sent.
// Admin only.
router.post(
    "/ppt-file/:id",
    requireAuth,
    requireUploader,
    upload.single("file"),
    async (req, res) => {
        try {
            const resource = await Resource.findById(req.params.id);
            if (!resource)
                return res.status(404).json({ error: "Resource not found." });
            if (resource.type !== "ppt")
                return res.status(400).json({ error: "This endpoint is for PPT resources only." });
            if (!req.file)
                return res.status(400).json({ error: "No file uploaded." });

            const { uploadToCloudinary } = require("../config/cloudinary");
            const sanitizeFilename = (n) => n.replace(/[^a-zA-Z0-9._-]/g, "_");

            const isPdf = req.file.mimetype === "application/pdf";
            const resourceType = isPdf ? "raw" : "image";
            const sem = resource.semester || 1;
            const folder = `wownotes/${resource.course || "general"}/sem${sem}/ppt`;
            const publicId = sanitizeFilename(req.file.originalname) + `_${Date.now()}${isPdf ? ".pdf" : ""}`;

            const result = await uploadToCloudinary(req.file.buffer, folder, publicId, resourceType);

            const isReplace = req.query.replace === "true";

            if (isReplace) {
                // Delete old file from Cloudinary
                if (resource.cloudinaryId) {
                    const { deleteFromCloudinary } = require("../config/cloudinary");
                    await deleteFromCloudinary(
                        resource.cloudinaryId,
                        resource.fileUrl?.includes("/raw/") ? "raw" : "image",
                    ).catch((e) => console.warn("Old file delete failed:", e.message));
                }
                const updated = await Resource.findByIdAndUpdate(
                    req.params.id,
                    { fileUrl: result.secure_url, cloudinaryId: result.public_id, storageMode: "pdf" },
                    { new: true },
                );
                return res.json(updated);
            }

            // Create a new resource cloned from the original, with the new file
            const newTitle = req.body.title || req.file.originalname.replace(/\.[^.]+$/, "");
            const clone = await Resource.create({
                title: newTitle,
                description: resource.description || "",
                course: resource.course,
                semester: resource.semester,
                subject: resource.subject,
                faculty: req.body.faculty || resource.faculty,
                source: resource.source,
                type: "ppt",
                isFree: resource.isFree,
                tags: resource.tags,
                branch: resource.branch,
                priority: resource.priority || 0,
                fileUrl: result.secure_url,
                cloudinaryId: result.public_id,
                storageMode: "pdf",
                uploadedBy: req.user._id,
                isPublished: true,
            });

            res.status(201).json(clone);
        } catch (err) {
            console.error("PPT upload error:", err);
            res.status(500).json({ error: err.message || "Upload failed." });
        }
    },
);

module.exports = router;