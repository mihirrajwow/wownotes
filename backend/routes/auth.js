const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const router = express.Router();

router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        prompt: "select_account",
    }),
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: `${process.env.CLIENT_URL}/login?error=unauthorized`,
        session: true,
    }),
    (req, res) => {
        // Set cookie explicitly before redirecting
        res.cookie("connect.sid", req.sessionID, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });
        
        if (!req.user.course) {
            return res.redirect(`${process.env.CLIENT_URL}/onboarding`);
        }
        res.redirect(`${process.env.CLIENT_URL}/dashboard`);
    },
);
router.get("/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ user: null });
    res.json({ user: req.user });
});

// PATCH /api/auth/profile — update course/semester after onboarding
router.patch("/profile", async (req, res) => {
    if (!req.isAuthenticated())
        return res.status(401).json({ error: "Auth required." });
    try {
        const { course, currentSemester, branch } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { course, currentSemester, branch },
            { new: true, runValidators: true },
        );
        res.json({ user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post("/logout", (req, res, next) => {
    const userId = req.user?._id?.toString();
    const activeConnections = req.app.get("activeConnections");
    const io = req.app.get("io");

    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            if (userId && activeConnections) {
                const socketId = activeConnections.get(userId);
                if (socketId) {
                    io.to(socketId).emit("logged_out");
                    activeConnections.delete(userId);
                }
            }
            res.json({ success: true });
        });
    });
});

module.exports = router;
