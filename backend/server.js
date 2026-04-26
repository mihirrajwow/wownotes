require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

require("./config/passport");

const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const resourcesRoutes = require("./routes/resources");
const subscriptionsRoutes = require("./routes/subscriptions");
const uploadRoutes = require("./routes/upload");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./routes/admin");
const contactRoutes = require("./routes/contact");
const curriculumRoutes = require("./routes/curriculum");
const notificationsRoutes = require("./routes/notifications");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

// ── Socket.IO single-device enforcement ──────────────────────────────────────
// Allows multiple tabs from the same browser session while still preventing
// truly different devices/sessions from being logged in simultaneously.
// activeConnections: Map<userId, Map<socketId, sessionId>>
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
});
const activeConnections = new Map();

// Parse the connect.sid cookie value from the handshake headers
function getSessionIdFromSocket(socket) {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const match = cookieHeader.match(/connect\.sid=s%3A([^.]+)/);
    return match ? match[1] : null;
}

io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) return;

    const incomingSessionId = getSessionIdFromSocket(socket);

    if (!activeConnections.has(userId)) {
        activeConnections.set(userId, new Map());
    }
    const userSockets = activeConnections.get(userId);

    // If there are existing connections from a DIFFERENT session, force them out
    if (incomingSessionId) {
        for (const [existingSocketId, existingSessionId] of userSockets) {
            if (existingSessionId && existingSessionId !== incomingSessionId) {
                io.to(existingSocketId).emit("force_logout", {
                    reason: "Another device logged into your account.",
                });
                userSockets.delete(existingSocketId);
            }
        }
    }

    // Register this socket
    userSockets.set(socket.id, incomingSessionId);

    socket.on("disconnect", () => {
        const sockets = activeConnections.get(userId);
        if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) activeConnections.delete(userId);
        }
    });
});

app.set("io", io);
app.set("activeConnections", activeConnections);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    // Razorpay checkout script
                    "https://checkout.razorpay.com",
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                ],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: [
                    "'self'",
                    "data:",
                    "https://lh3.googleusercontent.com",
                    "https://res.cloudinary.com",
                    // Razorpay may load brand/card logos
                    "https://*.razorpay.com",
                ],
                connectSrc: [
                    "'self'",
                    process.env.CLIENT_URL,
                    process.env.SERVER_URL,
                    // Razorpay API calls from the checkout modal
                    "https://api.razorpay.com",
                    "https://lumberjack.razorpay.com",
                ],
                frameSrc: [
                    // Razorpay renders its checkout inside an iframe
                    "https://api.razorpay.com",
                    "https://*.razorpay.com",
                ],
            },
        },
    }),
);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Larger limit for upload routes; standard limit for everything else
app.use("/api/upload", rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use("/api/payment", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }));

// NOTE: Do NOT add express.json() before upload routes —
// multer handles multipart/form-data parsing itself.
// express.json() only applies to JSON routes.
app.use(express.json({ limit: "100mb" }));

// ── Session ───────────────────────────────────────────────────────────────────
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        },
    }),
);

app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/resources", resourcesRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/curriculum", curriculumRoutes);
app.use("/api/notifications", notificationsRoutes);

// ── Public: fetch active plans for Pricing page ───────────────────────────────
app.get("/api/plans", async (req, res) => {
    try {
        const Plan = require("./models/Plan");
        const plans = await Plan.find({ isActive: true }).sort({
            sortOrder: 1,
            createdAt: 1,
        });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: "Failed to load plans." });
    }
});
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────────────────────────
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB connected");
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () =>
            console.log(`🚀 Server running on port ${PORT}`),
        );
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });
