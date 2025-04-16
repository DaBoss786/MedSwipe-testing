// functions/index.js - v2 SYNTAX VERSION
const { onCall, HttpsError } = require("firebase-functions/v2/https"); // Import v2 https functions
const { logger } = require("firebase-functions"); // Import v2 logger
const admin = require("firebase-admin");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

// Initialize Firebase Admin SDK ONLY ONCE
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Get a reference to the default Cloud Storage bucket
// Use admin.storage() which is initialized via initializeApp()
const bucket = admin.storage().bucket("medswipe-648ee.firebasestorage.app");

// Define the Cloud Function using the v2 onCall syntax
exports.generateCmeCertificate = onCall(async (request) => {
    // --- 1. Authentication Check (using request.auth) ---
    // In v2, authentication info is in request.auth, not context.auth
    if (!request.auth) {
        logger.error("Authentication Error: User is not authenticated (request.auth missing).");
        // Throw HttpsError using the imported v2 version
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }
    // Auth data is available, proceed.
    const uid = request.auth.uid;
    const userEmail = request.auth.token.email || "No Email Provided";
    logger.log(`Function called by authenticated user: ${uid}, Email: ${userEmail}`);

    // --- 2. Input Data Validation (using request.data) ---
    // In v2, data sent from the client is in request.data
    const { certificateFullName, creditsToClaim } = request.data;

    // Check if required data is present
    if (!certificateFullName || typeof certificateFullName !== "string" || certificateFullName.trim() === "") {
        logger.error("Validation Error: Missing or invalid certificateFullName.");
        throw new HttpsError(
            "invalid-argument",
            "Please provide a valid full name for the certificate."
        );
    }
    if (creditsToClaim === undefined || typeof creditsToClaim !== "number" || creditsToClaim <= 0) {
        logger.error("Validation Error: Missing or invalid creditsToClaim. Received:", creditsToClaim);
        throw new HttpsError(
            "invalid-argument",
            "Please provide a valid positive number of credits to claim."
        );
    }
    logger.log(`Received data: Name='${certificateFullName}', Credits=${creditsToClaim}`);

    // --- 3. PDF Generation using pdf-lib (Logic remains the same) ---
    try {
        logger.log("Starting PDF generation...");
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // US Letter size
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // --- Add Content to PDF (Same drawing logic as before) ---
        const title = "Continuing Medical Education Certificate";
        const titleSize = 18;
        const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
        page.drawText(title, { x: (width - titleWidth) / 2, y: height - 60, size: titleSize, font: boldFont, color: rgb(0, 0.2, 0.4) });

        const textSize = 11;
        const labelSize = 10;
        const textYStart = height - 120;
        const lineGap = 18;
        const labelX = 50;
        const valueX = 150;

        page.drawText("Activity Title:", { x: labelX, y: textYStart, size: labelSize, font: font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText("MedSwipe ENT Quiz Module", { x: valueX, y: textYStart, size: textSize, font: font });
        page.drawText("Date Awarded:", { x: labelX, y: textYStart - lineGap, size: labelSize, font: font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(`${new Date().toLocaleDateString()}`, { x: valueX, y: textYStart - lineGap, size: textSize, font: font });
        page.drawText("Participant Name:", { x: labelX, y: textYStart - 2 * lineGap, size: labelSize, font: font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(`${certificateFullName}`, { x: valueX, y: textYStart - 2 * lineGap, size: textSize, font: boldFont });
        page.drawText("AMA PRA Category 1 Credits™ Awarded:", { x: labelX, y: textYStart - 3 * lineGap, size: labelSize, font: font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(`${creditsToClaim.toFixed(2)}`, { x: valueX + 135, y: textYStart - 3 * lineGap, size: textSize, font: boldFont });

        const accreditationY = textYStart - 5 * lineGap;
        const accreditationText = "MedSwipe is jointly accredited by the [Joint Provider Name] and [Your Organization Name] to provide continuing education for the healthcare team. This activity was planned and implemented in accordance with the accreditation requirements and policies of the Accreditation Council for Continuing Medical Education (ACCME)."; // Replace with actual text
        page.drawText(accreditationText, { x: 50, y: accreditationY, size: 9, font: font, lineHeight: 12, maxWidth: width - 100, color: rgb(0.2, 0.2, 0.2) });

        logger.log("Skipping logo embedding for simplicity.");

        // --- Save PDF to Bytes ---
        const pdfBytes = await pdfDoc.save();
        logger.log("PDF generated successfully in memory.");

        // --- 4. Upload PDF to Firebase Cloud Storage (Logic remains the same) ---
        const safeFullName = certificateFullName.replace(/[^a-zA-Z0-9]+/g, '_');
        const fileName = `CME_Certificate_${safeFullName}_${Date.now()}.pdf`;
        const filePath = `cme_certificates/${uid}/${fileName}`;
        const file = bucket.file(filePath);

        logger.log(`Attempting to upload PDF to Cloud Storage at: ${filePath}`);
        await file.save(Buffer.from(pdfBytes), {
            metadata: {
                contentType: "application/pdf",
                metadata: { userId: uid, claimedCredits: creditsToClaim.toString(), participantName: certificateFullName },
            },
        });
        logger.log("PDF successfully uploaded to Cloud Storage.");

        // --- 5. Generate Signed Download URL (Logic remains the same) ---
        const config = {
            action: "read",
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
        };
        const [downloadUrl] = await file.getSignedUrl(config);
        logger.log(`Generated signed download URL: ${downloadUrl}`);

        // --- 6. Return Success Response to the App ---
        // v2 functions return the data directly
        return {
            success: true,
            downloadUrl: downloadUrl,
            fileName: fileName,
        };

    } catch (error) {
        logger.error("Error during PDF generation or upload:", error);
        // Throw HttpsError using the imported v2 version
        throw new HttpsError(
            "internal",
            "Failed to generate or save the certificate. Please try again later.",
            error.message
        );
    }
});

// functions/index.js - END OF FILE