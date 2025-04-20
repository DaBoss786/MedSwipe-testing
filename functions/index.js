// functions/index.js
const functions = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe");
const { defineString } = require("firebase-functions/params");

// Define a test parameter (no secrets yet)
const testParam = defineString("TEST_PARAM", {
  description: "Test parameter"
});

exports.testFunction = onCall(
  {
    region: "us-central1"
  },
  async (request) => {
    return { message: "Test function works!" };
  }
);

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- Define Configuration Parameters (v2 Style) ---
const stripeSecretKeyParam = defineString("STRIPE_SECRET_KEY", {
  description: "Stripe API Secret Key (sk_...)",
  input: { secret: "STRIPE_SECRET_KEY" },
});

const stripeWebhookSecretParam = defineString("STRIPE_WEBHOOK_SECRET", {
  description: "Stripe Webhook Signing Secret (whsec_...)",
  input: { secret: "STRIPE_WEBHOOK_SECRET" },
});
// --- CONFIGURATION ---
const BUCKET_NAME = "medswipe-648ee.firebasestorage.app"; // Your bucket name
const LOGO1_FILENAME_IN_BUCKET = "MedSwipe Logo gradient.png"; // <<< CHANGE if your logo file has a different name
const LOGO2_FILENAME_IN_BUCKET = "CME consultants.jpg"; // <<< CHANGE if your second logo file has a different name (or remove if only one logo)
// --- END CONFIGURATION ---

const storage = admin.storage();
const bucket = storage.bucket(BUCKET_NAME);

// --- Stripe Client Initialization (Using Parameters) ---
let stripeClient = null;
// --- End Stripe Client ---


exports.generateCmeCertificate = onCall({ timeoutSeconds: 120, memory: "512MiB" }, async (request) => {
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
    // Using Helvetica as a standard, professional-looking font
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique); // Or HelveticaOblique

    // 5. Load and embed Logos from Cloud Storage
    let logo1Image, logo2Image;
    let logo1Dims = { width: 0, height: 0 };
    let logo2Dims = { width: 0, height: 0 };
    const desiredLogoHeight = 50; // Adjust desired height of logos in points

    try {
      logger.log(`Attempting to download logo 1: ${LOGO1_FILENAME_IN_BUCKET}`);
      const logo1File = bucket.file(LOGO1_FILENAME_IN_BUCKET);
      const [logo1Data] = await logo1File.download();
      // Check file type for embedding
      if (LOGO1_FILENAME_IN_BUCKET.toLowerCase().endsWith(".png")) {
         logo1Image = await pdfDoc.embedPng(logo1Data);
      } else if (LOGO1_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpg") || LOGO1_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpeg")) {
         logo1Image = await pdfDoc.embedJpg(logo1Data);
      } else {
         throw new Error(`Unsupported file type for logo 1: ${LOGO1_FILENAME_IN_BUCKET}`);
      }
      logo1Dims = logo1Image.scale(desiredLogoHeight / logo1Image.height); // Scale based on height
      logger.log(`Logo 1 (${LOGO1_FILENAME_IN_BUCKET}) embedded successfully.`);
    } catch (error) {
      logger.error(`Failed to load or embed logo 1 (${LOGO1_FILENAME_IN_BUCKET}):`, error);
      // Decide if you want to proceed without the logo or throw an error
      // throw new HttpsError("internal", "Could not load required logo 1.");
    }

    // --- Load Logo 2 (Optional - remove/comment out if only one logo) ---
    if (LOGO2_FILENAME_IN_BUCKET) {
        try {
            logger.log(`Attempting to download logo 2: ${LOGO2_FILENAME_IN_BUCKET}`);
            const logo2File = bucket.file(LOGO2_FILENAME_IN_BUCKET);
            const [logo2Data] = await logo2File.download();
             // Check file type for embedding
            if (LOGO2_FILENAME_IN_BUCKET.toLowerCase().endsWith(".png")) {
                logo2Image = await pdfDoc.embedPng(logo2Data);
            } else if (LOGO2_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpg") || LOGO2_FILENAME_IN_BUCKET.toLowerCase().endsWith(".jpeg")) {
                logo2Image = await pdfDoc.embedJpg(logo2Data);
            } else {
                throw new Error(`Unsupported file type for logo 2: ${LOGO2_FILENAME_IN_BUCKET}`);
            }
            logo2Dims = logo2Image.scale(desiredLogoHeight / logo2Image.height); // Scale based on height
            logger.log(`Logo 2 (${LOGO2_FILENAME_IN_BUCKET}) embedded successfully.`);
        } catch (error) {
            logger.error(`Failed to load or embed logo 2 (${LOGO2_FILENAME_IN_BUCKET}):`, error);
            // Decide if you want to proceed without the logo or throw an error
            // throw new HttpsError("internal", "Could not load required logo 2.");
        }
    }
    // --- End Load Logo 2 ---


    // 6. Draw content based on the template

    // --- Draw Logos ---
    const logoMargin = 50; // Margin from page edge
    if (logo1Image) {
      page.drawImage(logo1Image, {
        x: logoMargin,
        y: height - logoMargin - logo1Dims.height,
        width: logo1Dims.width,
        height: logo1Dims.height,
      });
      logger.log(`Drew logo 1 at x:${logoMargin}, y:${height - logoMargin - logo1Dims.height}`);
    }
     // Draw logo 2 on the right side (if it exists)
    if (logo2Image) {
      page.drawImage(logo2Image, {
        x: width - logoMargin - logo2Dims.width, // Position from right edge
        y: height - logoMargin - logo2Dims.height,
        width: logo2Dims.width,
        height: logo2Dims.height,
      });
       logger.log(`Drew logo 2 at x:${width - logoMargin - logo2Dims.width}, y:${height - logoMargin - logo2Dims.height}`);
    }

    // --- Draw Text Elements ---
    let currentY = height - 150; // Starting Y position below logos

    // Title
    const title = "Certificate of Participation";
    const titleSize = 24;
    const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y: currentY,
      size: titleSize,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1), // Dark Gray
    });
    currentY -= 50; // Space after title

    // "This certifies that"
    const certifiesText = "This certifies that";
    const certifiesTextSize = 14;
    const certifiesTextWidth = fontRegular.widthOfTextAtSize(certifiesText, certifiesTextSize);
     page.drawText(certifiesText, {
      x: (width - certifiesTextWidth) / 2,
      y: currentY,
      size: certifiesTextSize,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 40; // Space

    // Full Name
    const nameSize = 22;
    const nameWidth = fontBold.widthOfTextAtSize(certificateFullName, nameSize);
    page.drawText(certificateFullName, {
      x: (width - nameWidth) / 2,
      y: currentY,
      size: nameSize,
      font: fontBold,
      color: rgb(0, 0.3, 0.6), // A blue color
    });
    currentY -= 30; // Space

    // "has successfully completed..."
    const completedText = "has successfully completed the educational activity entitled:";
    const completedTextSize = 12;
    const completedTextWidth = fontRegular.widthOfTextAtSize(completedText, completedTextSize);
     page.drawText(completedText, {
      x: (width - completedTextWidth) / 2,
      y: currentY,
      size: completedTextSize,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 30; // Space

    // Activity Title
    const activityTitle = "MedSwipe Otolaryngology CME Module";
    const activityTitleSize = 16;
    const activityTitleWidth = fontBold.widthOfTextAtSize(activityTitle, activityTitleSize);
    page.drawText(activityTitle, {
      x: (width - activityTitleWidth) / 2,
      y: currentY,
      size: activityTitleSize,
      font: fontBold, // Make title stand out
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 30; // Space

    // "and is awarded"
    const awardedText = "and is awarded";
    const awardedTextSize = 12;
    const awardedTextWidth = fontRegular.widthOfTextAtSize(awardedText, awardedTextSize);
     page.drawText(awardedText, {
      x: (width - awardedTextWidth) / 2,
      y: currentY,
      size: awardedTextSize,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 30; // Space

    // Credits
    const creditsText = `${formattedCredits} AMA PRA Category 1 Credits™`;
    const creditsTextSize = 14;
    const creditsTextWidth = fontBold.widthOfTextAtSize(creditsText, creditsTextSize);
    page.drawText(creditsText, {
      x: (width - creditsTextWidth) / 2,
      y: currentY,
      size: creditsTextSize,
      font: fontBold, // Emphasize credits
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 30; // Space

     // "on"
    const onText = "on";
    const onTextSize = 12;
    const onTextWidth = fontRegular.widthOfTextAtSize(onText, onTextSize);
     page.drawText(onText, {
      x: (width - onTextWidth) / 2,
      y: currentY,
      size: onTextSize,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 30; // Space

    // Claim Date
    const dateTextSize = 14;
    const dateTextWidth = fontRegular.widthOfTextAtSize(claimDate, dateTextSize);
    page.drawText(claimDate, {
      x: (width - dateTextWidth) / 2,
      y: currentY,
      size: dateTextSize,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 60; // More space before accreditation

    // Accreditation Statement (smaller font, multi-line)
    const accreditationText = [
        "Accreditation Statement:",
        "This activity has been planned and implemented in accordance with the accreditation",
        "requirements and policies of the Accreditation Council for Continuing Medical Education",
        "(ACCME) through the joint providership of CME Consultants and MedSwipe."
    ];
    const accreditationTextSize = 9;
    const accreditationLineHeight = 12; // Space between lines
    const accreditationStartX = 72; // Indent from left

    page.drawText(accreditationText[0], { // Draw first line (title) bold
        x: accreditationStartX,
        y: currentY,
        size: accreditationTextSize,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= accreditationLineHeight;

    for (let i = 1; i < accreditationText.length; i++) { // Draw remaining lines regular
        page.drawText(accreditationText[i], {
            x: accreditationStartX,
            y: currentY,
            size: accreditationTextSize,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3),
        });
        currentY -= accreditationLineHeight;
    }

    // 7. Serialize the PDF to bytes (Uint8Array)
    const pdfBytes = await pdfDoc.save();
    logger.log("PDF generated successfully in memory.");

    // 8. Upload to Cloud Storage
    // Create a unique, descriptive file name
    const safeName = certificateFullName.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    const pdfFileName = `${timestamp}_${safeName}_CME.pdf`;
    const filePath = `cme_certificates/${uid}/${pdfFileName}`; // Store in user-specific folder
    const file = bucket.file(filePath);

    logger.log(`Attempting to upload PDF to gs://${BUCKET_NAME}/${filePath}`);
    await file.save(Buffer.from(pdfBytes), {
      metadata: {
          contentType: "application/pdf",
          // Optional: Add custom metadata if needed
          // metadata: {
          //   userId: uid,
          //   fullName: certificateFullName,
          //   credits: formattedCredits
          // }
        },
      public: true, // Make the file publicly readable
    });
    logger.log("PDF successfully uploaded to Cloud Storage.");

    // 9. Construct and return the public URL
    // Note: Ensure your bucket/object ACLs allow public reads if using this URL format.
    // It's often better to use signed URLs for better security control, but public URLs are simpler.
    const publicUrl = file.publicUrl(); // Get the public URL
    // const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`; // Alternative manual construction

    logger.log("Returning success response with public URL:", publicUrl);
    return { success: true, publicUrl: publicUrl, fileName: pdfFileName }; // Include filename for download attribute

  } catch (error) {
    logger.error("Error during PDF generation or upload:", error);
    // Log the specific error details if available
    if (error instanceof HttpsError) {
        throw error; // Re-throw HttpsErrors directly
    } else {
         // Throw a generic internal error for other issues
        throw new HttpsError("internal", "Failed to generate or save the certificate.", error.message);
    }
  }
});

// --- Stripe Webhook Handler ---
exports.stripeWebhookHandler = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: ["STRIPE_WEBHOOK_SECRET", "STRIPE_SECRET_KEY"] // Include both secrets
  },
  async (req, res) => {
    logger.info(`stripeWebhookHandler received request: ${req.method} ${req.path}`);

    // 1️⃣ Health check
    if (req.method === "GET") {
      logger.info("Health check request received. Responding OK.");
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end("OK");
      return;
    }

    // 2️⃣ Get webhook secret from environment
    const webhookSecretValue = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecretValue || webhookSecretValue.startsWith("YOUR_") || webhookSecretValue.length < 10) {
      logger.error("CRITICAL: Webhook secret is missing or invalid.");
      res.status(500).send("Webhook Error: Server configuration error (webhook secret).");
      return;
    }

    // 3️⃣ Initialize Stripe client
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.startsWith("YOUR_") || secretKey.length < 10) {
      logger.error("CRITICAL: Stripe secret key is missing or invalid.");
      res.status(500).send("Webhook Error: Server configuration error (Stripe client init).");
      return;
    }

    const stripeClient = stripe(secretKey);
    logger.info("Stripe client initialized successfully within webhook handler.");

    // 4️⃣ Construct & verify the event
    let event;
    try {
      if (!req.rawBody) {
        logger.error("Missing req.rawBody.");
        return res.status(400).send("Webhook Error: Missing raw body.");
      }
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        logger.error("Missing 'stripe-signature' header.");
        return res.status(400).send("Webhook Error: Missing signature header.");
      }
      
      event = stripeClient.webhooks.constructEvent(req.rawBody, signature, webhookSecretValue);
      logger.info(`Webhook event constructed successfully: ${event.id}, Type: ${event.type}`);
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`, { error: err });
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // 5️⃣ Handle the event
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        logger.info(`Processing checkout.session.completed for session: ${session.id}`);

        const uid = session.client_reference_id;
        const subsId = session.subscription;
        const custId = session.customer;
        const paid = session.payment_status === "paid";
        const planName = session.metadata?.planName || "subscription";

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
              cmeSubscriptionPlan: planName,
              cmeSubscriptionStartDate: subscriptionStartDate,
            }, { merge: true });
            
          logger.info(`Firestore update successful for user: ${uid}`);
        } else {
          logger.warn(`Skipping Firestore update for session ${session.id}. Conditions not met.`);
        }
      } else {
        logger.info(`Received unhandled event type: ${event.type}`);
      }

      // 6️⃣ Acknowledge receipt
      logger.info(`Acknowledging webhook event: ${event.id}`);
      res.status(200).json({ received: true, eventId: event.id });
    } catch (dbErr) {
      logger.error(`Firestore update failed for session ${event?.data?.object?.id}: ${dbErr.message}`, { error: dbErr });
      res.status(500).send("Webhook Error: Internal database error.");
    }
  }
);

// --- createStripeCheckoutSession ---
exports.createStripeCheckoutSession = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    secrets: ["STRIPE_SECRET_KEY"]
  },
  async (request) => {
    logger.log("createStripeCheckoutSession called.");

    // 1. Auth check
    if (!request.auth) {
      logger.error("Authentication failed: No auth context.");
      throw new HttpsError("unauthenticated", "You must be logged in to start a checkout.");
    }
    
    const uid = request.auth.uid;
    logger.log(`Authenticated user: ${uid}`);

    // 2. Validate priceId
    const priceId = request.data.priceId;
    if (!priceId || typeof priceId !== "string") {
      logger.error("Validation failed: Invalid Price ID.", { data: request.data });
      throw new HttpsError("invalid-argument", "A valid Price ID must be provided.");
    }
    
    logger.log(`Received Price ID: ${priceId}`);

    // 3. Initialize Stripe Client using environment variable
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || secretKey.startsWith("YOUR_") || secretKey.length < 10) {
      logger.error("CRITICAL: Stripe secret key is missing or invalid.");
      throw new HttpsError("internal", "Server configuration error [SK].");
    }
    
    const stripeClient = stripe(secretKey);
    logger.info("Stripe client initialized successfully within createCheckout handler.");

    // 4. Create session
    const YOUR_APP_BASE_URL = "https://medswipeapp.com";
    try {
      logger.log(`Creating Stripe session for user ${uid} with price ${priceId}`);
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: uid,
        success_url: `${YOUR_APP_BASE_URL}/checkout-success.html`,
        cancel_url: `${YOUR_APP_BASE_URL}/checkout-cancel.html`,
      });
      
      logger.log(`Stripe session created: ${session.id}`);
      return { sessionId: session.id };
    } catch (error) {
      logger.error("Stripe session creation failed:", error);
      throw new HttpsError("internal", "Failed to create Stripe checkout session.", error.message);
    }
  }
);