const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Dynamic import to handle ESM app
exports.api = onRequest(async (req, res) => {
    try {
        // We import the app instance from the COPIED server code
        const appModule = await import('./server/app.js');
        const app = appModule.default;

        // Pass the request to the Express app
        app(req, res);
    } catch (e) {
        logger.error("Failed to load app", e);
        res.status(500).send("Internal Server Error: " + e.message);
    }
});
