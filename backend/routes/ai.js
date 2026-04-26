/**
 * routes/ai.js
 *
 * Gemini-powered AI endpoints for the PDFViewer.
 *
 * POST /api/ai/summarize      — summarise a single page
 * POST /api/ai/qa             — answer a question about a page (with conversation history)
 * POST /api/ai/search-topic   — scan up to MAX_SCAN_PAGES pages and locate a topic
 *
 * All endpoints:
 *  • Require an authenticated session (requireAuth middleware re-used from resources)
 *  • Require the user to actually have access to the resource (same access-check logic)
 *  • Only work with storageMode === "pages" resources (images already on Cloudinary)
 *  • Fetch the page image(s) from Cloudinary server-side — the Cloudinary URL is
 *    never forwarded to the client.
 *  • Pass the image(s) to Gemini as inline base64 data parts.
 *
 * ENV vars required:
 *   GEMINI_API_KEY   — Google AI Studio key with access to gemini-3.1-flash-lite
 */

"use strict";

const express      = require("express");
const https        = require("https");
const http         = require("http");
const router       = express.Router();

const Resource     = require("../models/Resource");
const Subscription = require("../models/Subscription");

// ─── Config ──────────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const MAX_SCAN_PAGES = 80;   // topic-search ceiling (500 RPD is comfortable)

// ─── Auth middleware (same pattern as resources.js) ───────────────────────────

function requireAuth(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) return next();
    return res.status(401).json({ error: "Not authenticated." });
}

// ─── Access check (mirrors resources.js userHasAccess) ───────────────────────

async function userHasAccess(user, course, semester) {
    if (user.role === "admin" || user.role === "friend") return true;
    const now  = new Date();
    const subs = await Subscription.find({
        user:      user._id,
        isActive:  true,
        startDate: { $lte: now },
        endDate:   { $gte: now },
    });
    return subs.some(sub => {
        if (sub.course !== course) return false;
        if (sub.accessType === "full") return true;
        if (sub.accessType === "semester" && sub.semester === semester) return true;
        return false;
    });
}

// ─── Helper: fetch a Cloudinary page image and return base64 ─────────────────

function fetchImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const fetcher = url.startsWith("https") ? https : http;
        fetcher.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Image fetch failed: HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => {
                const buf = Buffer.concat(chunks);
                resolve(buf.toString("base64"));
            });
            res.on("error", reject);
        }).on("error", reject);
    });
}

// ─── Helper: call Gemini generateContent ─────────────────────────────────────

function callGemini(requestBody) {
    return new Promise((resolve, reject) => {
        const apiKey  = process.env.GEMINI_API_KEY;
        if (!apiKey) return reject(new Error("GEMINI_API_KEY not configured."));

        const payload = JSON.stringify(requestBody);
        const options = {
            hostname: "generativelanguage.googleapis.com",
            path:     `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
            method:   "POST",
            headers:  {
                "Content-Type":   "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => {
                try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    if (res.statusCode !== 200) {
                        const msg = body?.error?.message || `Gemini error ${res.statusCode}`;
                        return reject(new Error(msg));
                    }
                    resolve(body);
                } catch (e) {
                    reject(new Error("Invalid JSON from Gemini"));
                }
            });
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

function extractText(geminiResponse) {
    return geminiResponse?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("") || "";
}

// ─── POST /api/ai/summarize ───────────────────────────────────────────────────
// Body: { resourceId, pageIndex }
// Returns: { summary: string }

router.post("/summarize", requireAuth, async (req, res) => {
    try {
        const { resourceId, pageIndex } = req.body;
        if (!resourceId || pageIndex == null)
            return res.status(400).json({ error: "resourceId and pageIndex are required." });

        const resource = await Resource.findById(resourceId);
        if (!resource || !resource.isPublished)
            return res.status(404).json({ error: "Resource not found." });
        if (resource.storageMode !== "pages")
            return res.status(400).json({ error: "AI features require a paged resource." });

        // Access check
        if (!resource.isFree) {
            const access = await userHasAccess(req.user, resource.course, resource.semester);
            if (!access) return res.status(403).json({ error: "Subscription required." });
        }

        const idx = parseInt(pageIndex);
        if (isNaN(idx) || idx < 1 || idx > resource.pageImages.length)
            return res.status(400).json({ error: "Invalid page index." });

        const imageUrl  = resource.pageImages[idx - 1];
        const imageB64  = await fetchImageAsBase64(imageUrl);

        const prompt = `You are a smart study assistant helping a student revise.

Analyse the following page from a university study resource titled "${resource.title}" (subject: ${resource.subject}).

Produce a **structured study summary** with these sections:
1. **Key Topics** — bullet list of the main topics/concepts covered on this page.
2. **Core Concepts Explained** — brief, plain-language explanation of each important concept.
3. **Formulas / Definitions** — list any formulas, definitions, or theorems (use markdown code blocks for formulas if relevant).
4. **Quick Revision Points** — 3-5 bullet points a student should remember for exams.

Keep the tone academic but accessible. Use markdown formatting throughout.`;

        const geminiBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: imageB64 } },
                ],
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
        };

        const result  = await callGemini(geminiBody);
        const summary = extractText(result).trim();
        if (!summary) return res.status(502).json({ error: "Gemini returned an empty response." });

        res.json({ summary });
    } catch (err) {
        console.error("[AI/summarize]", err.message);
        res.status(500).json({ error: err.message || "Failed to generate summary." });
    }
});

// ─── POST /api/ai/qa ─────────────────────────────────────────────────────────
// Body: { resourceId, pageIndex, question, conversationHistory? }
// Returns: { answer: string }

router.post("/qa", requireAuth, async (req, res) => {
    try {
        const { resourceId, pageIndex, question, conversationHistory = [] } = req.body;
        if (!resourceId || pageIndex == null || !question?.trim())
            return res.status(400).json({ error: "resourceId, pageIndex, and question are required." });

        const resource = await Resource.findById(resourceId);
        if (!resource || !resource.isPublished)
            return res.status(404).json({ error: "Resource not found." });
        if (resource.storageMode !== "pages")
            return res.status(400).json({ error: "AI features require a paged resource." });

        if (!resource.isFree) {
            const access = await userHasAccess(req.user, resource.course, resource.semester);
            if (!access) return res.status(403).json({ error: "Subscription required." });
        }

        const idx = parseInt(pageIndex);
        if (isNaN(idx) || idx < 1 || idx > resource.pageImages.length)
            return res.status(400).json({ error: "Invalid page index." });

        const imageUrl = resource.pageImages[idx - 1];
        const imageB64 = await fetchImageAsBase64(imageUrl);

        // Build conversation turns (limit history to last 8 messages for token budget)
        const history = (Array.isArray(conversationHistory) ? conversationHistory : [])
            .slice(-8)
            .map(msg => ({
                role:  msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
            }));

        // System context as first user turn (Gemini doesn't have a system role)
        const systemTurn = {
            role:  "user",
            parts: [
                {
                    text: `You are a knowledgeable study assistant for a university student. 
The student is viewing page ${idx} of a document titled "${resource.title}" (subject: ${resource.subject}).
The page image is provided. Answer only based on what you can see in the image and general academic knowledge. 
Be concise, accurate, and use markdown formatting for clarity.`,
                },
                { inline_data: { mime_type: "image/jpeg", data: imageB64 } },
            ],
        };
        const systemAck = { role: "model", parts: [{ text: "Understood. I can see the page and I'm ready to answer your questions." }] };

        const questionTurn = { role: "user", parts: [{ text: question.trim() }] };

        const geminiBody = {
            contents: [systemTurn, systemAck, ...history, questionTurn],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
        };

        const result = await callGemini(geminiBody);
        const answer = extractText(result).trim();
        if (!answer) return res.status(502).json({ error: "Gemini returned an empty response." });

        res.json({ answer });
    } catch (err) {
        console.error("[AI/qa]", err.message);
        res.status(500).json({ error: err.message || "Failed to get answer." });
    }
});

// ─── POST /api/ai/search-topic ────────────────────────────────────────────────
// Body: { resourceId, topic }
// Returns: { found: boolean, pages: number[], message?: string }
//
// Strategy: scan pages in batches of 5, asking Gemini to check a batch at once
// (one API call per batch, images as inline_data, JSON response requested).
// This keeps latency and quota usage reasonable while still scanning up to 80 pages.

router.post("/search-topic", requireAuth, async (req, res) => {
    try {
        const { resourceId, topic } = req.body;
        if (!resourceId || !topic?.trim())
            return res.status(400).json({ error: "resourceId and topic are required." });

        const resource = await Resource.findById(resourceId);
        if (!resource || !resource.isPublished)
            return res.status(404).json({ error: "Resource not found." });
        if (resource.storageMode !== "pages")
            return res.status(400).json({ error: "AI features require a paged resource." });

        if (!resource.isFree) {
            const access = await userHasAccess(req.user, resource.course, resource.semester);
            if (!access) return res.status(403).json({ error: "Subscription required." });
        }

        const totalPages = Math.min(resource.pageImages.length, MAX_SCAN_PAGES);
        if (totalPages === 0)
            return res.json({ found: false, pages: [], message: "This document has no pages to scan." });

        const BATCH_SIZE = 5;
        const matchedPages = [];

        for (let batchStart = 0; batchStart < totalPages; batchStart += BATCH_SIZE) {
            const batchEnd   = Math.min(batchStart + BATCH_SIZE, totalPages);
            const batchNums  = [];           // 1-based page numbers in this batch
            const imageParts = [];

            // Fetch all images in the batch concurrently
            const fetchPromises = [];
            for (let i = batchStart; i < batchEnd; i++) {
                batchNums.push(i + 1);
                fetchPromises.push(fetchImageAsBase64(resource.pageImages[i]));
            }
            const images = await Promise.all(fetchPromises);

            for (let j = 0; j < images.length; j++) {
                imageParts.push({ text: `[Page ${batchNums[j]}]` });
                imageParts.push({ inline_data: { mime_type: "image/jpeg", data: images[j] } });
            }

            const prompt = `You are scanning pages of a study document for a specific topic.

Topic to find: "${topic.trim()}"

The images above show pages ${batchNums.join(", ")} of the document.

For each page, determine whether this topic is meaningfully discussed, defined, explained, or demonstrated on that page (not just a passing mention in a heading or diagram label).

Respond ONLY with a valid JSON array of the page numbers (from the list [${batchNums.join(", ")}]) where the topic is meaningfully present.
Example response if pages 2 and 4 matched: [2, 4]
Example response if nothing matched: []
Do not include any explanation or extra text — only the JSON array.`;

            const geminiBody = {
                contents: [{
                    parts: [{ text: prompt }, ...imageParts],
                }],
                generationConfig: {
                    temperature:     0.0,
                    maxOutputTokens: 100,
                    responseMimeType: "application/json",
                },
            };

            try {
                const result   = await callGemini(geminiBody);
                const raw      = extractText(result).trim();
                // Strip possible markdown code fences Gemini sometimes adds
                const cleaned  = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
                const parsed   = JSON.parse(cleaned);
                if (Array.isArray(parsed)) {
                    parsed.forEach(n => {
                        if (typeof n === "number" && batchNums.includes(n)) {
                            matchedPages.push(n);
                        }
                    });
                }
            } catch (batchErr) {
                // If one batch errors, skip it and continue scanning
                console.warn(`[AI/search-topic] batch ${batchStart}-${batchEnd} error:`, batchErr.message);
            }
        }

        matchedPages.sort((a, b) => a - b);

        if (matchedPages.length > 0) {
            res.json({ found: true, pages: matchedPages });
        } else {
            res.json({
                found:   false,
                pages:   [],
                message: `"${topic}" was not found in the first ${totalPages} pages of this document.`,
            });
        }
    } catch (err) {
        console.error("[AI/search-topic]", err.message);
        res.status(500).json({ error: err.message || "Topic search failed." });
    }
});

module.exports = router;