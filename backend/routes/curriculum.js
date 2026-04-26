const express = require("express");
const router = express.Router();
const Curriculum = require("../models/Curriculum");

function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    next();
}
function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Admins only." });
    next();
}

// ── GET /api/curriculum
// Public: list all curricula (just program + branch + totalSems, no subjects)
// Used to populate branch dropdowns in Admin Upload etc.
router.get("/", async (req, res) => {
    try {
        const { program } = req.query;
        const query = program ? { program } : {};
        const docs = await Curriculum.find(query, "program branch totalSems").sort({ program: 1, branch: 1 });
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch curricula." });
    }
});

// ── GET /api/curriculum/subjects
// Public: get subjects for a specific program + branch + semester
// Used by Resources filter dropdown
router.get("/subjects", async (req, res) => {
    try {
        const { program, branch, sem } = req.query;
        if (!program || !branch || !sem)
            return res.status(400).json({ error: "program, branch, and sem are required." });

        const doc = await Curriculum.findOne({ program, branch });
        if (!doc) return res.json([]);

        const semDoc = doc.semesters.find(s => s.sem === parseInt(sem));
        res.json(semDoc ? semDoc.subjects : []);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch subjects." });
    }
});

// ── GET /api/curriculum/all-subjects
// Returns every unique subject across ALL semesters for a program + branch.
// Used by PYQ upload where semester is not relevant.
// Query: ?program=btech&branch=Computer Science %26 Engineering
router.get("/all-subjects", async (req, res) => {
    try {
        const { program, branch } = req.query;
        if (!program || !branch)
            return res.status(400).json({ error: "program and branch are required." });

        const doc = await Curriculum.findOne({ program, branch });
        if (!doc) return res.json([]);

        // Flatten all subjects across all semesters, deduplicate by name
        const seen = new Set();
        const subjects = [];
        for (const semDoc of doc.semesters) {
            for (const subj of semDoc.subjects) {
                if (!seen.has(subj.name)) {
                    seen.add(subj.name);
                    subjects.push({ ...subj.toObject(), sem: semDoc.sem });
                }
            }
        }
        // Sort alphabetically
        subjects.sort((a, b) => a.name.localeCompare(b.name));
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch subjects." });
    }
});

// ── GET /api/curriculum/:id
// Admin: get full curriculum doc with all semesters and subjects
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        const doc = await Curriculum.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Not found." });
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch curriculum." });
    }
});

// ── POST /api/curriculum/:id/subjects
// Admin: add a subject to a specific semester
router.post("/:id/subjects", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { sem, name, code, shortName, isCommon } = req.body;
        if (!sem || !name)
            return res.status(400).json({ error: "sem and name are required." });

        const doc = await Curriculum.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Not found." });

        let semDoc = doc.semesters.find(s => s.sem === parseInt(sem));
        if (!semDoc) {
            doc.semesters.push({ sem: parseInt(sem), subjects: [] });
            semDoc = doc.semesters[doc.semesters.length - 1];
        }

        // Avoid duplicates
        if (semDoc.subjects.some(s => s.name.toLowerCase() === name.toLowerCase()))
            return res.status(409).json({ error: "Subject already exists in this semester." });

        semDoc.subjects.push({ name: name.trim(), code: code?.trim() || "", shortName: shortName?.trim() || "", isCommon: !!isCommon });
        await doc.save();
        res.status(201).json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/curriculum/:id/subjects
// Admin: edit a subject (by name match) in a semester
router.patch("/:id/subjects", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { sem, oldName, name, code, shortName, isCommon } = req.body;
        const doc = await Curriculum.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Not found." });

        const semDoc = doc.semesters.find(s => s.sem === parseInt(sem));
        if (!semDoc) return res.status(404).json({ error: "Semester not found." });

        const subj = semDoc.subjects.find(s => s.name === oldName);
        if (!subj) return res.status(404).json({ error: "Subject not found." });

        if (name !== undefined) subj.name = name.trim();
        if (code !== undefined) subj.code = code.trim();
        if (shortName !== undefined) subj.shortName = shortName.trim();
        if (isCommon !== undefined) subj.isCommon = !!isCommon;

        await doc.save();
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/curriculum/:id/subjects
// Admin: remove a subject from a semester
router.delete("/:id/subjects", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { sem, name } = req.body;
        const doc = await Curriculum.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Not found." });

        const semDoc = doc.semesters.find(s => s.sem === parseInt(sem));
        if (!semDoc) return res.status(404).json({ error: "Semester not found." });

        const before = semDoc.subjects.length;
        semDoc.subjects = semDoc.subjects.filter(s => s.name !== name);
        if (semDoc.subjects.length === before)
            return res.status(404).json({ error: "Subject not found." });

        await doc.save();
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;