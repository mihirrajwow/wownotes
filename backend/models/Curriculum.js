const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
    code:     { type: String, trim: true, default: "" },   // e.g. "CS6001"
    name:     { type: String, required: true, trim: true }, // e.g. "Machine Learning"
    shortName:{ type: String, trim: true, default: "" },   // e.g. "ML"
    isCommon: { type: Boolean, default: false },            // shared across branches in same sem
}, { _id: false });

const semesterSchema = new mongoose.Schema({
    sem:      { type: Number, required: true, min: 1, max: 12 },
    subjects: { type: [subjectSchema], default: [] },
}, { _id: false });

const curriculumSchema = new mongoose.Schema({
    program: {
        type: String,
        required: true,
        enum: ["btech", "mba", "mca", "btech_lateral"],
        default: "btech",
    },
    branch: {
        type: String,
        required: true,
        trim: true,
    },
    totalSems: { type: Number, default: 8 },
    semesters: { type: [semesterSchema], default: [] },
}, { timestamps: true });

// Compound unique index: one doc per program+branch
curriculumSchema.index({ program: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model("Curriculum", curriculumSchema);
