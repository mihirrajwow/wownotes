const express = require("express");
const router = express.Router();
const { Resend } = require("resend");
const rateLimit = require("express-rate-limit");

// Rate-limit: max 5 contact messages per IP per 15 minutes
const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

// ── POST /api/contact ─────────────────────────────────────────────────────────
router.post("/", contactLimit, async (req, res) => {
    const { message, tags, senderEmail } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required." });
    }
    if (message.trim().length < 10) {
        return res.status(400).json({ error: "Message is too short." });
    }
    if (message.trim().length > 2000) {
        return res
            .status(400)
            .json({ error: "Message is too long (max 2000 chars)." });
    }

    // Build tag list string
    const tagLine =
        Array.isArray(tags) && tags.length
            ? tags.map((t) => `#${t}`).join("  ")
            : "None";

    // Sender info
    const from = senderEmail || req.user?.email || "Anonymous";
    const name = req.user?.name || "A visitor";

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const result = await resend.emails.send({
            from: "WowNotes Contact <onboarding@resend.dev>",
            to: process.env.SUPPORT_EMAIL,
            replyTo: from,
            subject: `📬 New message from ${name} — WowNotes`,
            html: `
                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0f1216;color:#e8e4d8;border-radius:12px;overflow:hidden;">
                  <div style="background:linear-gradient(135deg,#1a1f28,#13161d);padding:28px 32px;border-bottom:1px solid rgba(255,210,63,.15);">
                    <h2 style="margin:0;font-size:1.25rem;color:#ffd23f;letter-spacing:-.01em;">📬 New Contact Message</h2>
                    <p style="margin:6px 0 0;font-size:.8rem;color:rgba(200,195,180,.5);">via WowNotes Contact Form</p>
                  </div>
                  <div style="padding:28px 32px;display:flex;flex-direction:column;gap:18px;">
                    <div>
                      <p style="margin:0 0 4px;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(200,195,180,.45);">From</p>
                      <p style="margin:0;font-size:.92rem;color:#f5f0e8;">${name} &lt;${from}&gt;</p>
                    </div>
                    <div>
                      <p style="margin:0 0 4px;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(200,195,180,.45);">Tags</p>
                      <p style="margin:0;font-size:.85rem;color:#ffd23f;">${tagLine}</p>
                    </div>
                    <div>
                      <p style="margin:0 0 8px;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(200,195,180,.45);">Message</p>
                      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,210,63,.12);border-radius:10px;padding:16px 20px;font-size:.9rem;line-height:1.7;color:#e8e4d8;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                    </div>
                  </div>
                  <div style="padding:14px 32px;background:rgba(0,0,0,.25);border-top:1px solid rgba(255,255,255,.05);font-size:.7rem;color:rgba(150,145,130,.45);">
                    WowNotes · KIIT University · ${new Date().toLocaleString("en-IN")}
                  </div>
                </div>
            `,
        });
        // console.log("Resend result:", JSON.stringify(result));

        res.json({ success: true, message: "Message sent!" });
    } catch (err) {
        console.error("Contact email error:", err);
        res.status(500).json({
            error: "Failed to send message. Please try again later.",
        });
    }
});

module.exports = router;
