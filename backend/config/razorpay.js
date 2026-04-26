const Razorpay = require("razorpay");

// Lazy singleton — instantiated on first use so that dotenv has already
// populated process.env by the time this runs.
let _instance = null;

function getInstance() {
    if (!_instance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error(
                "Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.",
            );
        }
        _instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return _instance;
}

// Proxy so callers can use `razorpay.orders.create(...)` unchanged
module.exports = new Proxy(
    {},
    {
        get(_, prop) {
            return getInstance()[prop];
        },
    },
);
