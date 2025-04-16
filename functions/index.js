// functions/index.js - v2 SYNTAX - Google Docs Template - PUBLIC UPLOAD Version
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const { Readable } = require("stream");

// Initialize Firebase Admin SDK ONLY ONCE
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// --- CONFIGURATION ---
const BUCKET_NAME = "medswipe-648ee.firebasestorage.app"; // CONFIRM this is your correct default bucket
const TEMPLATE_DOCUMENT_ID = "1qL1WC1Ne2YSVhORPLphPllZcT7IHJW75"; // <--- PASTE YOUR TEMPLATE ID
// --- END CONFIGURATION ---

const bucket = admin.storage().bucket(BUCKET_NAME);
 
exports.generateCmeCertificate = onCall({
    timeoutSeconds: 120,
}, async (request) => {
    // --- 1. Authentication Check ---
    if (!request.auth) {
        logger.error("Authentication Error: User is not authenticated.");
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const uid = request.auth.uid;
    const userEmail = request.auth.token.email || "No Email Provided";
    logger.log(`Function called by authenticated user: ${uid}, Email: ${userEmail}`);

    // --- 2. Input Data Validation ---
    const { certificateFullName, creditsToClaim } = request.data;
    // ... (Keep the same validation logic as before) ...
    if (!certificateFullName || typeof certificateFullName !== "string" || certificateFullName.trim() === "") throw new HttpsError("invalid-argument", "Please provide a valid full name.");
    if (creditsToClaim === undefined || typeof creditsToClaim !== "number" || creditsToClaim <= 0) throw new HttpsError("invalid-argument", "Please provide valid credits.");
    logger.log(`Received data: Name='${certificateFullName}', Credits=${creditsToClaim}`);

    // --- 3. Authenticate to Google APIs ---
    const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"],
    });
    const authClient = await auth.getClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const docs = google.docs({ version: "v1", auth: authClient });
    const claimDate = new Date().toLocaleDateString();

    // --- 4. Process with Google Docs/Drive ---
    let newDocId = null;
    try {
        // --- Step 4a: Copy Template ---
        logger.log(`Copying template document: ${TEMPLATE_DOCUMENT_ID}`);
        const copyResponse = await drive.files.copy({
            fileId: TEMPLATE_DOCUMENT_ID,
            requestBody: { name: `CME Cert Temp - ${certificateFullName} - ${Date.now()}` }, // Temporary name
            auth: authClient,
        });
        newDocId = copyResponse.data.id;
        if (!newDocId) throw new Error("Failed to get ID from copied document.");
        logger.log(`Template copied. New Document ID: ${newDocId}`);

        // --- Step 4b: Replace Placeholders ---
        logger.log(`Replacing placeholders in document: ${newDocId}`);
        const requests = [
            { replaceAllText: { containsText: { text: "{{FullName}}", matchCase: true }, replaceText: certificateFullName } },
            { replaceAllText: { containsText: { text: "{{Credits}}", matchCase: true }, replaceText: creditsToClaim.toFixed(2) } },
            { replaceAllText: { containsText: { text: "{{ClaimDate}}", matchCase: true }, replaceText: claimDate } },
        ];
        await docs.documents.batchUpdate({
            documentId: newDocId, requestBody: { requests: requests }, auth: authClient,
        });
        logger.log("Placeholders replaced.");

        // --- Step 4c: Export as PDF Stream ---
        logger.log(`Exporting document ${newDocId} as PDF...`);
        const exportResponse = await drive.files.export({
            fileId: newDocId, mimeType: "application/pdf", auth: authClient,
        }, { responseType: "stream" });

        // --- Step 4d: Upload PDF Stream to Cloud Storage (MAKE PUBLIC) ---
        const safeFullName = certificateFullName.replace(/[^a-zA-Z0-9]+/g, '_');
        const fileName = `CME_Certificate_${safeFullName}_${Date.now()}.pdf`;
        const filePath = `cme_certificates/${uid}/${fileName}`;
        const file = bucket.file(filePath);

        logger.log(`Uploading exported PDF stream publicly to: ${filePath}`);
        const storageWriteStream = file.createWriteStream({
            metadata: {
                contentType: "application/pdf",
                metadata: { userId: uid, claimedCredits: creditsToClaim.toString(), participantName: certificateFullName },
            },
            // --- MAKE FILE PUBLICLY READABLE ---
            public: true,
            // --- You might also need predefinedAcl: 'publicRead' depending on bucket settings ---
            // predefinedAcl: 'publicRead' // Add this if 'public: true' alone doesn't work
        });

        await new Promise((resolve, reject) => {
            exportResponse.data
                .on("error", reject)
                .pipe(storageWriteStream)
                .on("error", reject)
                .on("finish", resolve);
        });
        logger.log("PDF successfully uploaded publicly to Cloud Storage.");

        // --- Step 4e: Get the Public URL ---
        // Construct the standard public URL format
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
        logger.log(`Generated public URL: ${publicUrl}`);

        // --- Step 4f: Delete Temporary Google Doc ---
        try {
            logger.log(`Attempting to delete temporary Google Doc: ${newDocId}`);
            await drive.files.delete({ fileId: newDocId, auth: authClient });
            logger.log(`Successfully deleted temporary Google Doc: ${newDocId}`);
        } catch (deleteError) {
            logger.warn(`Could not delete temporary Google Doc ${newDocId}:`, deleteError.message);
        }

        // --- 5. (Optional) Send Email ---
        // TODO: Implement email sending logic here if desired
        // Example using a hypothetical sendEmail function:
        // await sendEmail({
        //     to: userEmail,
        //     subject: "Your MedSwipe CME Certificate",
        //     body: `Hello ${certificateFullName},\n\nYour CME certificate for ${creditsToClaim.toFixed(2)} credits is attached (or download here: ${publicUrl}).\n\nThanks,\nThe MedSwipe Team`,
        //     attachmentUrl: publicUrl // Some services might fetch from URL
        // });
        logger.log("Skipping email sending for now.");


        // --- 6. Return Success Response with Public URL ---
        return {
            success: true,
            publicUrl: publicUrl, // Return the public URL
            fileName: fileName,
        };

    } catch (error) {
        logger.error("Error during Google Docs/Drive processing or upload:", error);
        if (newDocId) { /* ... attempt cleanup ... */ } // Keep cleanup logic
        if (error instanceof HttpsError) throw error;
        else throw new HttpsError("internal", "Failed to process the certificate.", error.message);
    }
});