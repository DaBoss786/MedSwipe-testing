// functions/index.js - SIMPLIFIED FOR TESTING AUTH
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.generateCmeCertificate = functions.https.onCall((data, context) => {
    // --- Minimal Authentication Check ---
    functions.logger.log("Simplified function invoked."); // Log invocation

    if (!context.auth) {
        functions.logger.error("Simplified function: Authentication check failed!");
        throw new functions.https.HttpsError(
            "unauthenticated",
            "SIMPLIFIED: The function must be called while authenticated."
        );
    }

    // If authentication passes, just log it and return success
    const uid = context.auth.uid;
    const email = context.auth.token.email || "No Email";
    functions.logger.log(`Simplified function: Authentication successful for UID: ${uid}, Email: ${email}`);

    // Return a simple success message (no PDF generation)
    return {
        success: true,
        message: `Authentication successful for ${email}`,
        // No downloadUrl or fileName in this test version
    };
});