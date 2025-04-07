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
