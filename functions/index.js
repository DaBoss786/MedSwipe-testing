// functions/index.js - TOP OF FILE
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib"); // Import necessary pdf-lib components
// const { Storage } = require("@google-cloud/storage"); // We'll use admin.storage() instead

// Initialize Firebase Admin SDK. Cloud Functions does this automatically when deployed,
// but initializing here is good practice and needed for local testing (if you do that later).
admin.initializeApp();

// Get a reference to the default Cloud Storage bucket
const bucket = admin.storage().bucket();

// Define the Cloud Function triggered by HTTPS callable request
exports.generateCmeCertificate = functions.https.onCall(async (data, context) => {
    // --- 1. Authentication Check ---
    // Verify the user calling the function is authenticated.
    if (!context.auth) {
        functions.logger.error("Authentication Error: User is not authenticated.");
        throw new functions.https.HttpsError(
            "unauthenticated", // Error code
            "The function must be called while authenticated." // Error message
        );
    }
    const uid = context.auth.uid; // Get the authenticated user's ID
    const userEmail = context.auth.token.email || "No Email Provided"; // Get user's email
    functions.logger.log(`Function called by authenticated user: ${uid}, Email: ${userEmail}`);

    // --- 2. Input Data Validation ---
    // Get the data sent from the app (app.js)
    const { certificateFullName, creditsToClaim } = data;

    // Check if required data is present
    if (!certificateFullName || typeof certificateFullName !== "string" || certificateFullName.trim() === "") {
        functions.logger.error("Validation Error: Missing or invalid certificateFullName.");
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Please provide a valid full name for the certificate."
        );
    }
    if (creditsToClaim === undefined || typeof creditsToClaim !== "number" || creditsToClaim <= 0) {
        functions.logger.error("Validation Error: Missing or invalid creditsToClaim.");
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Please provide a valid number of credits to claim."
        );
    }
    functions.logger.log(`Received data: Name='${certificateFullName}', Credits=${creditsToClaim}`);

    // --- 3. PDF Generation using pdf-lib ---
    try {
        functions.logger.log("Starting PDF generation...");
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Standard US Letter size (points)
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica); // Embed a standard font

        // --- Add Content to PDF ---
        // Title (Centered)
        const title = "Continuing Medical Education Certificate";
        const titleSize = 18;
        const titleWidth = font.widthOfTextAtSize(title, titleSize);
        page.drawText(title, {
            x: (width - titleWidth) / 2,
            y: height - 50,
            size: titleSize,
            font: font,
            color: rgb(0, 0.3, 0.7), // Dark blue color
        });

        // Static Info
        const textSize = 12;
        const textYStart = height - 100;
        const lineGap = 20;
        page.drawText("Activity Title: MedSwipe ENT Quiz Module", { x: 50, y: textYStart, size: textSize, font: font });
        page.drawText(`Date Awarded: ${new Date().toLocaleDateString()}`, { x: 50, y: textYStart - lineGap, size: textSize, font: font });

        // Dynamic Info
        page.drawText(`Participant Name: ${certificateFullName}`, { x: 50, y: textYStart - 2 * lineGap, size: textSize, font: font });
        page.drawText(`AMA PRA Category 1 Credits™ Awarded: ${creditsToClaim.toFixed(2)}`, { x: 50, y: textYStart - 3 * lineGap, size: textSize, font: font });

        // Accreditation Statement (Example - Replace with your actual text)
        const accreditationText = "MedSwipe is jointly accredited by the [Joint Provider Name] and [Your Organization Name] to provide continuing education for the healthcare team. This activity was planned and implemented in accordance with the accreditation requirements and policies of the Accreditation Council for Continuing Medical Education (ACCME).";
        page.drawText(accreditationText, {
            x: 50,
            y: textYStart - 5 * lineGap, // Adjust Y position
            size: 10,
            font: font,
            lineHeight: 14,
            maxWidth: width - 100, // Wrap text within margins
            color: rgb(0.3, 0.3, 0.3), // Gray color
        });

        // Add Logos (Requires images accessible to the function or embedded)
        // This part is more complex. For now, we'll skip adding images to keep it simple.
        // You would typically load image bytes and use `pdfDoc.embedPng()` or `pdfDoc.embedJpg()`.
        functions.logger.log("Skipping logo embedding for simplicity.");

        // --- Save PDF to Bytes ---
        const pdfBytes = await pdfDoc.save();
        functions.logger.log("PDF generated successfully in memory.");

        // --- 4. Upload PDF to Firebase Cloud Storage ---
        const fileName = `CME_Certificate_${certificateFullName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const filePath = `cme_certificates/${uid}/${fileName}`; // Organize by user ID
        const file = bucket.file(filePath);

        functions.logger.log(`Attempting to upload PDF to Cloud Storage at: ${filePath}`);
        await file.save(Buffer.from(pdfBytes), {
            metadata: {
                contentType: "application/pdf",
                // Optional: Add custom metadata if needed
                metadata: {
                    userId: uid,
                    claimedCredits: creditsToClaim.toString(),
                    participantName: certificateFullName,
                },
            },
        });
        functions.logger.log("PDF successfully uploaded to Cloud Storage.");

        // --- 5. Generate Signed Download URL ---
        // Create a URL that allows temporary read access to the file.
        const config = {
            action: "read", // Allow reading the file
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // URL expires in 7 days
        };
        const [downloadUrl] = await file.getSignedUrl(config);
        functions.logger.log(`Generated signed download URL: ${downloadUrl}`);

        // --- 6. Return Success Response to the App ---
        return {
            success: true,
            downloadUrl: downloadUrl,
            fileName: fileName, // Send filename back for download attribute
        };

    } catch (error) {
        functions.logger.error("Error during PDF generation or upload:", error);
        // Throw a specific error for the client app
        throw new functions.https.HttpsError(
            "internal", // Error code
            "Failed to generate or save the certificate. Please try again later.", // User-friendly message
            error.message // Optional: include original error message for debugging
        );
    }
});

// functions/index.js - END OF FILE