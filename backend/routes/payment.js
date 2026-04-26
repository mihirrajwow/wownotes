const express = require("express");
const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Subscription = require("../models/Subscription");
const PromoCode = require("../models/PromoCode");
const Plan = require("../models/Plan");
const router = express.Router();

const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated())
        return res.status(401).json({ error: "Auth required." });
    next();
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/validate-promo
// ─────────────────────────────────────────────────────────────────────────────
router.post("/validate-promo", requireAuth, async (req, res) => {
    try {
        const { code, pack } = req.body;
        if (!code || !pack)
            return res
                .status(400)
                .json({ error: "code and pack are required." });
        const dbPlan = await Plan.findOne({ pack, isActive: true }).catch(
            () => null,
        );
        if (!dbPlan)
            return res.status(400).json({ error: "Invalid or inactive plan." });

        const promo = await PromoCode.findOne({
            code: code.trim().toUpperCase(),
        });
        if (!promo || !promo.isValidForPlan(pack))
            return res
                .status(404)
                .json({ error: "Invalid or expired promo code." });

        const basePriceINR = dbPlan.priceINR;
        const finalPaise = promo.computeFinalAmount(basePriceINR);
        const finalINR = finalPaise / 100;

        return res.json({
            valid: true,
            code: promo.code,
            description: promo.description,
            originalINR: basePriceINR,
            finalINR,
            savingsINR: basePriceINR - finalINR,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
        });
    } catch (err) {
        console.error("validate-promo error:", err);
        res.status(500).json({ error: "Could not validate promo code." });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// ─────────────────────────────────────────────────────────────────────────────
router.post("/create-order", requireAuth, async (req, res) => {
    try {
        const { pack, course, semester, year, promoCode } = req.body;

        const dbPlan = await Plan.findOne({ pack, isActive: true }).catch(
            () => null,
        );
        if (!dbPlan)
            return res
                .status(400)
                .json({ error: "Invalid plan. Choose semester or year." });

        const validCourses = ["btech", "mba", "mca"];
        if (!validCourses.includes(course))
            return res.status(400).json({ error: "Invalid course." });

        if (pack === "semester" && (!semester || semester < 1 || semester > 8))
            return res
                .status(400)
                .json({ error: "Provide a valid semester (1–8)." });

        if (pack === "year" && (!year || year < 1 || year > 4))
            return res
                .status(400)
                .json({ error: "Provide a valid year (1–4)." });

        const plan = dbPlan;
        let finalAmount = plan.priceINR * 100; // convert to paise
        let finalAmountINR = plan.priceINR;
        let appliedPromo = null;

        if (promoCode) {
            const promo = await PromoCode.findOne({
                code: promoCode.trim().toUpperCase(),
            });
            if (!promo || !promo.isValidForPlan(pack))
                return res
                    .status(400)
                    .json({ error: "Invalid or expired promo code." });

            finalAmount = promo.computeFinalAmount(plan.priceINR);
            finalAmountINR = finalAmount / 100;
            appliedPromo = promo.code;
        }

        const order = await razorpay.orders.create({
            amount: finalAmount,
            currency: "INR",
            receipt: `r_${String(req.user._id).slice(-8)}_${Date.now().toString().slice(-10)}`,
            notes: {
                userId: String(req.user._id),
                pack,
                course,
                semester: semester || "",
                year: year || "",
                promoCode: appliedPromo || "",
                originalAmt: String(plan.priceINR),
                finalAmt: String(finalAmountINR),
            },
        });

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            appliedPromo,
            finalAmountINR,
            originalAmountINR: plan.priceINR,
        });
    } catch (err) {
        console.error("Razorpay create-order error:", err);
        res.status(500).json({
            error: "Could not create payment order. Try again.",
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/verify
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify", requireAuth, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            pack,
            course,
            semester,
            year,
            promoCode,
        } = req.body;

        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expected !== razorpay_signature)
            return res.status(400).json({
                error: "Payment verification failed. Invalid signature.",
            });

        const already = await Subscription.findOne({
            paymentRef: razorpay_payment_id,
        });
        if (already)
            return res.json({
                success: true,
                subscription: already,
                duplicate: true,
            });

        // Fetch actual amount from Razorpay
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const amountPaidINR = order.amount / 100;

        // Increment promo usage
        let promoNote = "";
        if (promoCode) {
            const promo = await PromoCode.findOneAndUpdate(
                { code: promoCode.trim().toUpperCase(), isActive: true },
                { $inc: { usedCount: 1 } },
                { new: true },
            );
            if (promo) promoNote = `Promo: ${promo.code}`;
        }

        const verifyPlan = await Plan.findOne({ pack, isActive: true });
        const durationDays = verifyPlan
            ? verifyPlan.durationDays
            : pack === "semester"
              ? 180
              : 365;
        let expiresAt;
        if (
            verifyPlan &&
            verifyPlan.fixedExpiryDate &&
            verifyPlan.fixedExpiryDate > new Date()
        ) {
            expiresAt = verifyPlan.fixedExpiryDate;
        } else {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + durationDays);
        }

        const sub = await Subscription.create({
            user: req.user._id,
            pack,
            course,
            semester: pack === "semester" ? parseInt(semester) : null,
            year: pack === "year" ? parseInt(year) : null,
            planLabel: Subscription.buildLabel({
                pack,
                course,
                semester,
                year,
            }),
            isActive: true,
            startedAt: new Date(),
            expiresAt,
            amountPaid: amountPaidINR,
            currency: "INR",
            orderId: razorpay_order_id,
            paymentRef: razorpay_payment_id,
            paidAt: new Date(),
            grantedBy: promoCode ? "promo" : "payment",
            note: promoNote,
        });

        res.status(201).json({ success: true, subscription: sub });
    } catch (err) {
        console.error("Payment verify error:", err);
        res.status(500).json({
            error: "Verification failed. Contact support.",
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// ─────────────────────────────────────────────────────────────────────────────
router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        try {
            const signature = req.headers["x-razorpay-signature"];
            const bodyStr = req.body.toString();
            const expected = crypto
                .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
                .update(bodyStr)
                .digest("hex");

            if (expected !== signature)
                return res
                    .status(400)
                    .json({ error: "Invalid webhook signature." });

            const event = JSON.parse(bodyStr);
            const payload = event?.payload?.payment?.entity;

            if (event.event !== "payment.captured" || !payload)
                return res.json({ received: true });

            const { notes, id: paymentId, order_id: orderId, amount } = payload;
            if (!notes?.userId || !notes?.pack || !notes?.course)
                return res.json({ received: true });

            const already = await Subscription.findOne({
                paymentRef: paymentId,
            });
            if (already) return res.json({ received: true });

            const pack = notes.pack;
            const packPlan = await Plan.findOne({ pack, isActive: true });
            const durationDays = packPlan
                ? packPlan.durationDays
                : pack === "semester"
                  ? 180
                  : 365;
            let expiresAt;
            if (
                packPlan &&
                packPlan.fixedExpiryDate &&
                packPlan.fixedExpiryDate > new Date()
            ) {
                expiresAt = packPlan.fixedExpiryDate;
            } else {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + durationDays);
            }

            let promoNote = "";
            if (notes.promoCode) {
                const promo = await PromoCode.findOneAndUpdate(
                    { code: notes.promoCode, isActive: true },
                    { $inc: { usedCount: 1 } },
                    { new: true },
                );
                if (promo) promoNote = `Promo: ${promo.code}`;
            }

            const amountPaidINR = notes.finalAmt
                ? parseFloat(notes.finalAmt)
                : amount / 100;

            await Subscription.create({
                user: notes.userId,
                pack,
                course: notes.course,
                semester:
                    pack === "semester" && notes.semester
                        ? parseInt(notes.semester)
                        : null,
                year:
                    pack === "year" && notes.year ? parseInt(notes.year) : null,
                planLabel: Subscription.buildLabel({
                    pack,
                    course: notes.course,
                    semester: notes.semester,
                    year: notes.year,
                }),
                isActive: true,
                startedAt: new Date(),
                expiresAt,
                amountPaid: amountPaidINR,
                currency: "INR",
                orderId: orderId || null,
                paymentRef: paymentId,
                paidAt: new Date(),
                grantedBy: notes.promoCode ? "promo" : "payment",
                note: promoNote,
            });

            res.json({ received: true });
        } catch (err) {
            console.error("Webhook error:", err);
            res.status(500).json({ error: "Webhook processing failed." });
        }
    },
);

module.exports = router;
