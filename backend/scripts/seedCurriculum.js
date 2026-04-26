// scripts/seedCurriculum.js
// Run once: node scripts/seedCurriculum.js
// Seeds all KIIT branches with empty semester/subject arrays.
// You will add subjects later via the Admin UI.

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Curriculum = require("../models/Curriculum");

const BTECH_BRANCHES = [
    "Civil Engineering",
    "Construction Technology",
    "Mechanical Engineering",
    "Mechanical Engineering (Automobile)",
    "Aerospace Engineering",
    "Mechatronics Engineering",
    "Electrical Engineering",
    "Electrical and Computer Engineering",
    "Electronics & Tele-Communication Engineering",
    "Electronics & Electrical Engineering",
    "Electronics and Computer Science Engineering",
    "Electronics Engineering VLSI Design and Technology",
    "Electronics and Instrumentation",
    "Computer Science & Engineering",
    "Computer Science & Communication Engineering",
    "CSE (Artificial Intelligence)",
    "CSE (Cyber Security)",
    "CSE (Data Science)",
    "CSE (IoT and Cyber Security Including Block Chain Technology)",
    "CSE (Internet of Things)",
    "Computer Science & Systems Engineering",
    "CSE (Artificial Intelligence and Machine Learning)",
    "Information Technology",
    "Chemical Engineering",
];

const BTECH_LATERAL_BRANCHES = [
    "Civil Engineering",
    "Mechanical Engineering",
    "Mechanical (Automobile Engineering)",
    "Electrical Engineering",
    "Electronics & Tele-Communication Engineering",
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Electrical Engineering",
    "Mechatronics",
];

const MBA_BRANCHES = ["General Management"];
const MCA_BRANCHES = ["Computer Applications"];

function makeSemesters(count) {
    return Array.from({ length: count }, (_, i) => ({
        sem: i + 1,
        subjects: [],
    }));
}

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    let created = 0, skipped = 0;

    const entries = [
        ...BTECH_BRANCHES.map(b => ({ program: "btech", branch: b, totalSems: 8 })),
        ...BTECH_LATERAL_BRANCHES.map(b => ({ program: "btech_lateral", branch: b, totalSems: 6 })),
        ...MBA_BRANCHES.map(b => ({ program: "mba", branch: b, totalSems: 4 })),
        ...MCA_BRANCHES.map(b => ({ program: "mca", branch: b, totalSems: 4 })),
    ];

    for (const { program, branch, totalSems } of entries) {
        const exists = await Curriculum.findOne({ program, branch });
        if (exists) { skipped++; continue; }
        await Curriculum.create({
            program, branch, totalSems,
            semesters: makeSemesters(totalSems),
        });
        console.log(`  ✔ ${program} / ${branch}`);
        created++;
    }

    console.log(`\nDone. Created: ${created}, Skipped (already exist): ${skipped}`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
