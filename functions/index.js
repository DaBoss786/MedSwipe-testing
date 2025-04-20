// functions/index.js
// --- v2 Imports ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https"); // For webhook
const { logger } = require("firebase-functions"); // Use v1 logger for now, or switch to v2 logger if preferred
const admin = require("firebase-admin");
const stripe = require("stripe");
const { defineString } = require("firebase-functions/params");
const { PDFDocument, StandardFonts, rgb, degrees } = require("pdf-lib"); // Added degrees

// --- Initialize Firebase Admin SDK (Keep as is) ---
// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- Define Configuration Parameters (Keep as is) ---
// These define the secrets your functions need access to
//const stripeSecretKeyParam = defineString("STRIPE_SECRET_KEY"); // Simpler definition is fine
//const stripeWebhookSecretParam = defineString("STRIPE_WEBHOOK_SECRET");
// --- End Configuration Parameters ---


// --- Configuration for PDF Generation (Keep as is) ---
const BUCKET_NAME = "medswipe-648ee.firebasestorage.app";
const LOGO1_FILENAME_IN_BUCKET = "MedSwipe Logo gradient.png";
const LOGO2_FILENAME_IN_BUCKET = "CME consultants.jpg";
const storage = admin.storage();
const bucket = storage.bucket(BUCKET_NAME);
// --- End PDF Configuration ---


// --- generateCmeCertificate Function (Keep As Is - No Changes) ---
exports.generateCmeCertificate = onCall({
    secrets: [], // Add secrets if this function needs any in the future
    timeoutSeconds: 120,
    memory: "512MiB"
    }, async (request) => {
  // 1. Auth check
  if (!request.auth) {
    logger.error("Authentication failed: No auth context.");
    throw new HttpsError("unauthenticated", "Please log in.");
  }
  const uid = request.auth.uid;
  logger.log(`Function called by authenticated user: ${uid}`);

  // 2. Input validation
  const { certificateFullName, creditsToClaim } = request.data;
  if (
    !certificateFullName ||
    typeof certificateFullName !== "string" ||
    certificateFullName.trim() === ""
  ) {
    logger.error("Validation failed: Invalid certificateFullName.", { data: request.data });
    throw new HttpsError("invalid-argument", "Please provide a valid full name.");
  }
  if (
    typeof creditsToClaim !== "number" ||
    creditsToClaim <= 0 ||
    isNaN(creditsToClaim)
  ) {
    logger.error("Validation failed: Invalid creditsToClaim.", { data: request.data });
    throw new HttpsError("invalid-argument", "Please provide a valid credits amount.");
  }
  const formattedCredits = creditsToClaim.toFixed(2); // Format credits to 2 decimal places
  const claimDate = new Date().toLocaleDateString(); // Generate date string

  logger.log(`Generating certificate for: ${certificateFullName}, Credits: ${formattedCredits}, Date: ${claimDate}`);

  try {
    // 3. Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size (width, height)
    const { width, height } = page.getSize();

    // 4. Embed fonts
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // 5. Load and embed Logos from Cloud Storage
    let logo1Image, logo2Image;
    let logo1Dims = { width: 0, height: 0 };
    let logo2Dims = { width: 0, height: 0 };
    const desiredLogoHeight = 50;

    try {
      logger.log(`Attempting to download logo 1: ${LOGO1_FILENAME_IN_BUCKET}`);
      const logo1File = bucket.file(LOGO1_FILENAME_IN_BUCKET);
      const [logo1Data] = await logo1File.download();
      if (LOGO1_FILENAME_IN_BUCKET.toLowerCase().endsWith(".png")) {
         logo1Image = await pdfDoc.embedPng(logo1Data);
      } else if (LOGO1_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpg") || LOGO1_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpeg")) {
         logo1Image = await pdfDoc.embedJpg(logo1Data);
      } else {
         throw new Error(`Unsupported file type for logo 1: ${LOGO1_FILENAME_IN_BUCKET}`);
      }
      logo1Dims = logo1Image.scale(desiredLogoHeight / logo1Image.height);
      logger.log(`Logo 1 (${LOGO1_FILENAME_IN_BUCKET}) embedded successfully.`);
    } catch (error) {
      logger.error(`Failed to load or embed logo 1 (${LOGO1_FILENAME_IN_BUCKET}):`, error);
    }

    if (LOGO2_FILENAME_IN_BUCKET) {
        try {
            logger.log(`Attempting to download logo 2: ${LOGO2_FILENAME_IN_BUCKET}`);
            const logo2File = bucket.file(LOGO2_FILENAME_IN_BUCKET);
            const [logo2Data] = await logo2File.download();
            if (LOGO2_FILENAME_IN_BUCKET.toLowerCase().endsWith(".png")) {
                logo2Image = await pdfDoc.embedPng(logo2Data);
            } else if (LOGO2_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpg") || LOGO2_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpeg")) {
                logo2Image = await pdfDoc.embedJpg(logo2Data);
            } else {
                throw new Error(`Unsupported file type for logo 2: ${LOGO2_FILENAME_IN_BUCKET}`);
            }
            logo2Dims = logo2Image.scale(desiredLogoHeight / logo2Image.height);
            logger.log(`Logo 2 (${LOGO2_FILENAME_IN_BUCKET}) embedded successfully.`);
        } catch (error) {
            logger.error(`Failed to load or embed logo 2 (${LOGO2_FILENAME_IN_BUCKET}):`, error);
        }
    }

    // 6. Draw content
    const logoMargin = 50;
    if (logo1Image) {
      page.drawImage(logo1Image, { x: logoMargin, y: height - logoMargin - logo1Dims.height, width: logo1Dims.width, height: logo1Dims.height });
    }
    if (logo2Image) {
      page.drawImage(logo2Image, { x: width - logoMargin - logo2Dims.width, y: height - logoMargin - logo2Dims.height, width: logo2Dims.width, height: logo2Dims.height });
    }

    let currentY = height - 150;
    const drawCenteredText = (text, font, size, y, color = rgb(0.1, 0.1, 0.1)) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (width - textWidth) / 2, y: y, size: size, font: font, color: color });
        return y - size - 10; // Adjust spacing based on font size
    };

    currentY = drawCenteredText("Certificate of Participation", fontBold, 24, currentY);
    currentY -= 30;
    currentY = drawCenteredText("This certifies that", fontRegular, 14, currentY, rgb(0.2, 0.2, 0.2));
    currentY -= 15;
    currentY = drawCenteredText(certificateFullName, fontBold, 22, currentY, rgb(0, 0.3, 0.6));
    currentY -= 10;
    currentY = drawCenteredText("has successfully completed the educational activity entitled:", fontRegular, 12, currentY, rgb(0.2, 0.2, 0.2));
    currentY -= 10;
    currentY = drawCenteredText("MedSwipe Otolaryngology CME Module", fontBold, 16, currentY);
    currentY -= 10;
    currentY = drawCenteredText("and is awarded", fontRegular, 12, currentY, rgb(0.2, 0.2, 0.2));
    currentY -= 10;
    currentY = drawCenteredText(`${formattedCredits} AMA PRA Category 1 Credits™`, fontBold, 14, currentY);
    currentY -= 10;
    currentY = drawCenteredText("on", fontRegular, 12, currentY, rgb(0.2, 0.2, 0.2));
    currentY -= 10;
    currentY = drawCenteredText(claimDate, fontRegular, 14, currentY);
    currentY -= 40;

    const accreditationText = [
        "Accreditation Statement:",
        "This activity has been planned and implemented in accordance with the accreditation",
        "requirements and policies of the Accreditation Council for Continuing Medical Education",
        "(ACCME) through the joint providership of CME Consultants and MedSwipe."
    ];
    const accreditationTextSize = 9;
    const accreditationLineHeight = 12;
    const accreditationStartX = 72;

    page.drawText(accreditationText[0], { x: accreditationStartX, y: currentY, size: accreditationTextSize, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    currentY -= accreditationLineHeight;
    for (let i = 1; i < accreditationText.length; i++) {
        page.drawText(accreditationText[i], { x: accreditationStartX, y: currentY, size: accreditationTextSize, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
        currentY -= accreditationLineHeight;
    }

    // 7. Serialize PDF
    const pdfBytes = await pdfDoc.save();
    logger.log("PDF generated successfully in memory.");

    // 8. Upload to Cloud Storage
    const safeName = certificateFullName.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    const pdfFileName = `${timestamp}_${safeName}_CME.pdf`;
    const filePath = `cme_certificates/${uid}/${pdfFileName}`;
    const file = bucket.file(filePath);

    logger.log(`Attempting to upload PDF to gs://${BUCKET_NAME}/${filePath}`);
    await file.save(Buffer.from(pdfBytes), { metadata: { contentType: "application/pdf" }, public: true });
    logger.log("PDF successfully uploaded to Cloud Storage.");

    // 9. Return public URL
    const publicUrl = file.publicUrl();
    logger.log("Returning success response with public URL:", publicUrl);
    return { success: true, publicUrl: publicUrl, fileName: pdfFileName };

  } catch (error) {
    logger.error("Error during PDF generation or upload:", error);
    if (error instanceof HttpsError) { throw error; }
    throw new HttpsError("internal", "Failed to generate or save the certificate.", error.message);
  }
});


// --- Stripe Webhook Handler (Keep As Is - Already using v2 onRequest and process.env) ---
exports.stripeWebhookHandler = onRequest(
  {
    region: "us-central1", // Or your preferred region
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: ["STRIPE_WEBHOOK_SECRET", "STRIPE_SECRET_KEY"] // Make sure both are listed
  },
  async (req, res) => {
    // Use the secret values directly from process.env
    const webhookSecretValue = process.env.STRIPE_WEBHOOK_SECRET;
    const secretKeyValue = process.env.STRIPE_SECRET_KEY; // Get secret key

    // Initialize Stripe client inside the handler
    if (!secretKeyValue) {
        logger.error("CRITICAL: Stripe secret key is missing from environment.");
        res.status(500).send("Webhook Error: Server configuration error (SK).");
        return;
    }
    const stripeClient = stripe(secretKeyValue); // Initialize with the key

    if (!webhookSecretValue) {
        logger.error("CRITICAL: Webhook secret is missing from environment.");
        res.status(500).send("Webhook Error: Server configuration error (WHS).");
        return;
    }

    logger.info(`stripeWebhookHandler received request: ${req.method} ${req.path}`);

    // Health check for GET requests
    if (req.method === "GET") {
      logger.info("Health check request received. Responding OK.");
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end("OK");
      return;
    }

    // Construct & verify the event
    let event;
    try {
      if (!req.rawBody) { throw new Error("Missing req.rawBody."); }
      const signature = req.headers["stripe-signature"];
      if (!signature) { throw new Error("Missing 'stripe-signature' header."); }

      event = stripeClient.webhooks.constructEvent(req.rawBody, signature, webhookSecretValue);
      logger.info(`Webhook event constructed successfully: ${event.id}, Type: ${event.type}`);
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`, { error: err });
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        logger.info(`Processing checkout.session.completed for session: ${session.id}`);

        // --- Use client_reference_id ---
        const uid = session.client_reference_id;
        // --- End Use client_reference_id ---
        const subsId = session.subscription;
        const custId = session.customer;
        const paid = session.payment_status === "paid";
        // Attempt to get plan name from metadata if passed during session creation
        const planName = session.metadata?.planName || (session.mode === 'subscription' ? 'subscription' : 'unknown');

        logger.info(`Session details: UID=${uid}, SubID=${subsId}, CustID=${custId}, Paid=${paid}, Plan=${planName}`);

        if (paid && uid && subsId && custId) {
          logger.info(`Updating Firestore for user: ${uid}`);
          const subscriptionStartDate = admin.firestore.FieldValue.serverTimestamp();

          await admin.firestore()
            .collection("users")
            .doc(uid)
            .set({
              stripeCustomerId: custId,
              stripeSubscriptionId: subsId,
              cmeSubscriptionActive: true,
              cmeSubscriptionPlan: planName, // Store the plan name
              cmeSubscriptionStartDate: subscriptionStartDate,
            }, { merge: true });

          logger.info(`Firestore update successful for user: ${uid}`);
        } else {
          logger.warn(`Skipping Firestore update for session ${session.id}. Conditions not met (Paid=${paid}, UID=${uid}, SubID=${subsId}, CustID=${custId}).`);
        }
      } else {
        logger.info(`Received unhandled event type: ${event.type}`);
      }

      // Acknowledge receipt
      logger.info(`Acknowledging webhook event: ${event.id}`);
      res.status(200).json({ received: true, eventId: event.id });
    } catch (dbErr) {
      logger.error(`Firestore update failed for session ${event?.data?.object?.id}: ${dbErr.message}`, { error: dbErr });
      res.status(500).send("Webhook Error: Internal database error.");
    }
  }
);


// --- createStripeCheckoutSession (Updated to v2 and using process.env) ---
exports.createStripeCheckoutSession = onCall(
  {
    region: "us-central1", // Or your preferred region
    memory: "256MiB",
    secrets: ["STRIPE_SECRET_KEY"] // Declare the secret needed
  },
  async (request) => { // Use request parameter for v2
    logger.log("createStripeCheckoutSession called.");

    // 1. Auth check (using request.auth)
    if (!request.auth) {
      logger.error("Authentication failed: No auth context.");
      throw new HttpsError("unauthenticated", "You must be logged in to start a checkout.");
    }
    const uid = request.auth.uid; // Get UID from request.auth
    logger.log(`Authenticated user: ${uid}`);

    // 2. Validate priceId (using request.data)
    const priceId = request.data.priceId; // Get priceId from request.data
    if (!priceId || typeof priceId !== "string") {
      logger.error("Validation failed: Invalid Price ID.", { data: request.data });
      throw new HttpsError("invalid-argument", "A valid Price ID must be provided.");
    }
    logger.log(`Received Price ID: ${priceId}`);

    // 3. Initialize Stripe Client using environment variable populated by 'secrets'
    const secretKey = process.env.STRIPE_SECRET_KEY; // Access the secret
    if (!secretKey) { // Check if the secret was actually populated
      logger.error("CRITICAL: Stripe secret key is missing from environment. Check secret configuration and deployment.");
      throw new HttpsError("internal", "Server configuration error [SK].");
    }
    const stripeClient = stripe(secretKey); // Initialize Stripe here
    logger.info("Stripe client initialized successfully within createCheckout handler.");

    // 4. Define URLs (Consider making these configurable later)
    const YOUR_APP_BASE_URL = "https://medswipe-648ee.web.app"; // <<< Double-check this URL is correct
    const successUrl = `${YOUR_APP_BASE_URL}/checkout-success.html`; // Example success page
    const cancelUrl = `${YOUR_APP_BASE_URL}/checkout-cancel.html`;   // Example cancel page

    // 5. Create session
    try {
      logger.log(`Creating Stripe session for user ${uid} with price ${priceId}`);
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: uid, // Use client_reference_id for passing UID
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Optionally pass plan name if needed by webhook immediately
        // metadata: {
        //    planName: request.data.planName // Assuming client sends planName along with priceId
        // }
      });

      logger.log(`Stripe session created: ${session.id}`);
      return { sessionId: session.id }; // Return only the session ID
    } catch (error) {
      logger.error("Stripe session creation failed:", error);
      throw new HttpsError("internal", "Failed to create Stripe checkout session.", error.message);
    }
  }
); // End createStripeCheckoutSession