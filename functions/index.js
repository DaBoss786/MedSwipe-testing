/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Import the necessary Firebase Functions modules
// Using v1 syntax for simplicity with HTTPS callable functions for now
const functions = require("firebase-functions");
// If you need Firebase Admin SDK later (e.g., to access Firestore from functions)
// const admin = require("firebase-admin");
// admin.initializeApp();

// Basic Logger (optional but helpful)
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// Simple HTTPS Callable Function (can be called directly from your app's JS)
exports.helloWorld = functions.https.onCall((data, context) => {
  // Log a message to the Firebase Functions console
  logger.info("Hello world function called!", {structuredData: true});

  // You can optionally receive data from the frontend call:
  const text = data.text;
  logger.info(`Received text from frontend: ${text || "No text received"}`);

  // You can check if the user is authenticated (if needed)
  // if (!context.auth) {
  //   // Throwing an HttpsError is the standard way to handle errors client-side.
  //   throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  // }
  // const uid = context.auth.uid;
  // logger.info(`Function called by user: ${uid}`);

  // Send back a response to the frontend
  return {
    message: `Hello from the Cloud Function! You sent: ${text || "nothing"}`,
    timestamp: new Date().toISOString(),
  };
});

// You can add more functions here later by exporting them, e.g.:
// exports.anotherFunction = functions.https.onRequest((req, res) => { ... });
// exports.firestoreTrigger = functions.firestore.document('users/{userId}').onCreate((snap, context) => { ... });

// --- Step C1: Add Certificate Generation Cloud Function ---

// Import Firebase Admin SDK (needed to potentially fetch user email/data securely)
const admin = require("firebase-admin");
// Initialize admin SDK only once
try { admin.initializeApp(); } catch (e) { console.log("Admin SDK already initialized or error:", e.message); }


/**
 * Generates a CME certificate (simulation) and triggers email (simulation).
 * Called from the frontend after a successful claim transaction.
 */
exports.generateCmeCertificate = functions.https.onCall(async (data, context) => {
  // --- 1. Authentication Check ---
  // Ensure the user calling this function is authenticated.
  if (!context.auth) {
    logger.error("Certificate generation called by unauthenticated user.");
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to generate a certificate.');
  }
  const uid = context.auth.uid;
  logger.info(`Certificate generation requested by user: ${uid}`);

  // --- 2. Data Validation ---
  // Expecting data like: { creditsClaimed: 1.00, claimTimestamp: "ISO_string_or_millis", evaluationData: {...}, certificateName: "User Name" }
  const creditsClaimed = data.creditsClaimed;
  const claimTimestamp = data.claimTimestamp; // We'll send this from frontend
  const evaluationData = data.evaluationData;
  const certificateName = data.certificateName; // Get name provided during claim

  if (!creditsClaimed || typeof creditsClaimed !== 'number' || creditsClaimed <= 0) {
    logger.error("Invalid data received: Missing or invalid 'creditsClaimed'.", data);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid amount of credits claimed provided.');
  }
   if (!claimTimestamp) {
    logger.error("Invalid data received: Missing 'claimTimestamp'.", data);
    throw new functions.https.HttpsError('invalid-argument', 'Claim timestamp is missing.');
  }
   if (!certificateName || typeof certificateName !== 'string' || certificateName.trim() === '') {
    logger.error("Invalid data received: Missing or invalid 'certificateName'.", data);
    throw new functions.https.HttpsError('invalid-argument', 'Certificate name is missing.');
  }
   // Add more validation for evaluationData if needed

  logger.info(`Data received: Credits=${creditsClaimed}, Name=${certificateName}, Timestamp=${claimTimestamp}`);

  // --- 3. Fetch User Email (Securely on Backend) ---
  let userEmail = 'email_not_found@example.com'; // Default
  try {
    const userRecord = await admin.auth().getUser(uid);
    userEmail = userRecord.email || userEmail;
    logger.info(`Fetched user email: ${userEmail}`);
  } catch (error) {
    logger.error(`Failed to fetch user email for UID: ${uid}`, error);
    // Decide if you want to proceed without email or throw an error
    // throw new functions.https.HttpsError('internal', 'Could not retrieve user email.');
  }

  // --- 4. Placeholder for PDF Generation ---
  // TODO: Implement actual PDF generation using pdf-lib, pdfkit, etc.
  // Use data: certificateName, creditsClaimed, claimTimestamp, your accreditation statement
  logger.info("SIMULATING PDF Generation...");
  const simulatedPdfUrl = `https://placeholder.pdf/for/${uid}/${Date.now()}.pdf`; // Fake URL
  logger.info(`Simulated PDF URL: ${simulatedPdfUrl}`);


  // --- 5. Placeholder for Email Sending ---
  // TODO: Implement actual email sending using SendGrid, Mailgun, etc.
  // Send email to userEmail with the PDF attached or linked
  logger.info(`SIMULATING Email Sending to ${userEmail}...`);
  const emailSendData = {
      to: userEmail,
      from: "noreply@yourdomain.com", // Use a verified sender email
      subject: `Your MedSwipe CME Certificate (${creditsClaimed.toFixed(2)} Credits)`,
      text: `Dear ${certificateName},\n\nPlease find your CME certificate attached (or download here: ${simulatedPdfUrl}) for ${creditsClaimed.toFixed(2)} credits claimed on ${new Date(claimTimestamp).toLocaleDateString()}.\n\nThank you for using MedSwipe!\n\nAccreditation: [Your Statement Here]`,
      // html: "...", // Add HTML version if desired
      // attachments: [...] // Add PDF attachment if generating directly
  };
  logger.info("Simulated Email Data:", emailSendData);


  // --- 6. Placeholder for Saving PDF URL to Firestore History (Optional) ---
  // If you generate and store the PDF (e.g., in Cloud Storage), you might want
  // to update the corresponding cmeClaimHistory entry with the download URL.
  // This would likely involve another Firestore operation (potentially outside this function
  // triggered by storage, or carefully done here).
  logger.info("SIMULATING update of claim history with PDF URL (optional step).");


  // --- 7. Return Success Response ---
  // Send back confirmation to the frontend.
  return {
    success: true,
    message: `Certificate generation process initiated for ${creditsClaimed.toFixed(2)} credits. Check your email at ${userEmail}.`,
    simulatedPdfUrl: simulatedPdfUrl, // Send back the fake URL for potential display
  };
});

// --- End of Step C1 Code ---
