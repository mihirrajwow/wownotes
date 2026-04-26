const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 1000 },

        course: {
            type: String,
            required: true,
            enum: ["btech", "mba", "mca"],
        },
        semester: { type: Number, default: null }, // null for pyq (subject-based access)
        branch: { type: String, trim: true, default: null }, // e.g. "Computer Science & Engineering"
        year: { type: Number, default: null }, // source year e.g. 2022, 2023, 2024 (optional)
        subject: { type: String, required: true, trim: true },
        faculty: { type: String, trim: true },
        source: {
            type: String,
            enum: [
                "classroom",
                "library",
                "internet",
                "student",
                "faculty",
                "other",
            ],
            default: "other",
        },
        type: {
            type: String,
            enum: ["notes", "assignment", "syllabus", "pyq", "ppt", "other"],
            default: "notes",
        },
        exam: {
            type: String,
            enum: ["midsem", "endsem", null],
            default: null,
        },

        // ── PYQ-specific fields ───────────────────────────────────────────────
        // Only meaningful when type === "pyq"
        pyqSemester: { type: Number, default: null }, // semester in which the PYQ appeared (display only)
        pyqExamType: {
            type: String,
            enum: ["midsem", "endsem", "make-up midsem", "supplementary", null],
            default: null,
        },
        pyqYear: {
            type: Number,
            default: null,
        },
        pyqSeason: {
            type: String,
            enum: ["autumn", "spring", null],
            default: null,
        },
        // Solution file (optional — may be added later)
        solutionFileUrl: { type: String, default: null },
        solutionCloudinaryId: { type: String, default: null },
        solutionStorageMode: {
            type: String,
            enum: ["pdf", "pages", null],
            default: null,
        },
        solutionPageFolder: { type: String, default: null },
        solutionPageImages: { type: [String], default: [] },
        solutionPageCount: { type: Number, default: 0 },
        // Access-control toggles (independent of the main isFree flag)
        isPyqFree: { type: Boolean, default: true },      // question paper access
        isSolutionFree: { type: Boolean, default: false }, // solution access

        fileUrl: { type: String },
        cloudinaryId: { type: String },

        // ── Paged-image storage (for PDFs > 10 MB) ────────────────────────────
        // When storageMode === 'pages', the PDF was never stored as a whole file.
        // Instead each page was rasterised to JPEG and uploaded individually.
        storageMode: {
            type: String,
            enum: ["pdf", "pages"],
            default: "pdf",
        },
        // Cloudinary folder that holds all page images, e.g.
        //   wownotes/pages/btech/sem3/my-awesome-notes
        pageFolder: { type: String, default: null },
        // Ordered array of Cloudinary secure_url strings, one per page
        pageImages: { type: [String], default: [] },
        // Total page count (redundant with pageImages.length but handy for quick reads)
        pageCount: { type: Number, default: 0 },

        tags: [{ type: String, trim: true }],
        isFree: { type: Boolean, default: false },
        views: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 },

        priority: { type: Number, default: 0 }, // higher = shown first

        // ── Catalogue preview (dashboard teaser for unsubscribed users) ────────
        catalogueEnabled: { type: Boolean, default: false },
        cataloguePageIndex: { type: Number, default: 1 }, // 1-based page chosen by admin

        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        isPublished: { type: Boolean, default: true },
    },
    { timestamps: true },
);

resourceSchema.index({ course: 1, semester: 1, subject: 1 });
resourceSchema.index({ isFree: 1 });
resourceSchema.index({ title: "text", subject: "text", description: "text" });
resourceSchema.index({ course: 1, semester: 1, branch: 1, subject: 1 });

module.exports = mongoose.model("Resource", resourceSchema);