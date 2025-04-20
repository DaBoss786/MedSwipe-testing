// functions/index.js
const functions = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument, StandardFonts, rgb, degrees } = require("pdf-lib"); // Added degrees
const stripe = require("stripe"); // Add this line

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- CONFIGURATION ---
const BUCKET_NAME = "medswipe-648ee.firebasestorage.app"; // Your bucket name
const LOGO1_FILENAME_IN_BUCKET = "MedSwipe Logo gradient.png"; // <<< CHANGE if your logo file has a different name
const LOGO2_FILENAME_IN_BUCKET = "CME consultants.jpg"; // <<< CHANGE if your second logo file has a different name (or remove if only one logo)
// --- END CONFIGURATION ---

const storage = admin.storage();
const bucket = storage.bucket(BUCKET_NAME);

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
// This function listens for events from Stripe (like successful payments)

// IMPORTANT: Set your Stripe secret key and webhook signing secret in Firebase environment configuration:
// firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY" stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
// (Replace with your actual TEST keys/secrets - get webhook secret in the next step)

// Initialize Stripe with the secret key from environment config
// Ensure functions.config() is defined or handle potential errors


exports.stripeWebhookHandler = functions.https.onRequest(async (request, response) => {
  // --- Initialize Stripe client INSIDE the function ---
  const stripeSecretKey = functions.config().stripe?.secret_key;
  if (!stripeSecretKey) {
       logger.error("Stripe secret key is not configured..."); // Shortened log
       response.status(500).send("Webhook Error: Server configuration missing (SK).");
       return;
  }
  const stripeClient = stripe(stripeSecretKey);

  // --- Read and Check Webhook Secret INSIDE the function ---
  const webhookSecret = functions.config().stripe?.webhook_secret;
  if (!webhookSecret || webhookSecret.includes("PLACEHOLDER")) { // Also check for placeholder
      logger.error("Stripe webhook secret is not configured or is placeholder..."); // Shortened log
      response.status(500).send("Webhook Error: Server configuration missing (WHS).");
      return;
  }
  // --- End Webhook Secret Check ---

    // Get the signature from the headers
    const sig = request.headers['stripe-signature'];
    let event;

    try {
        // Verify the event signature
        event = stripeClient.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
        logger.log("Stripe webhook event verified:", event.id, event.type);

    } catch (err) {
        // On error, log and return the error message
        logger.error(`⚠️ Webhook signature verification failed: ${err.message}`);
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

                   // --- Handle the Stripe event ---
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          logger.log(`Checkout session completed: ${session.id}`);

          // --- Get Subscription and User ID ---
          const stripeSubscriptionId = session.subscription;
          const stripeCustomerId = session.customer;
          const paymentStatus = session.payment_status;

          // Validate necessary data from session
          if (paymentStatus !== 'paid') {
               logger.warn(`Checkout session ${session.id} not paid (status: ${paymentStatus}). No action taken.`);
               response.status(200).json({ received: true, status: "Not paid" });
               return;
          }
           if (!stripeSubscriptionId || !stripeCustomerId) {
               logger.error(`Missing subscription or customer ID in checkout session: ${session.id}`);
               response.status(200).json({ received: true, error: "Missing subscription/customer ID" });
               return;
           }

          // Retrieve the subscription to get metadata (including firebaseUid)
          let firebaseUid;
          try {
              const subscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId);
              firebaseUid = subscription.metadata.firebaseUid; // Get UID from metadata
              if (!firebaseUid) {
                   logger.error(`Missing firebaseUid in metadata for subscription: ${stripeSubscriptionId}`);
                   response.status(200).json({ received: true, error: "Missing firebaseUid in subscription metadata" });
                   return;
              }
               logger.log(`Retrieved subscription ${stripeSubscriptionId}, found firebaseUid: ${firebaseUid}`);
          } catch (subError) {
               logger.error(`Failed to retrieve subscription ${stripeSubscriptionId}:`, subError);
               response.status(500).send(`Webhook Error: Could not retrieve subscription: ${subError.message}`);
               return;
          }
          // --- End Get Subscription and User ID ---


          // --- Update User Document in Firestore ---
          try {
              const userDocRef = admin.firestore().collection('users').doc(firebaseUid); // Use the UID from metadata

              // Prepare data to update/set
              const subscriptionData = {
                  stripeCustomerId: stripeCustomerId,
                  stripeSubscriptionId: stripeSubscriptionId,
                  cmeSubscriptionActive: true, // Grant access!
                  cmeSubscriptionPlan: session.metadata?.planName || (session.mode === 'subscription' ? 'unknown_subscription' : 'unknown'),
                  cmeSubscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
              };

              await userDocRef.set(subscriptionData, { merge: true });

              logger.log(`Successfully updated Firestore for user ${firebaseUid}. CME access granted.`);

          } catch (dbError) {
              logger.error(`Firestore update failed for user ${firebaseUid}:`, dbError);
              response.status(500).send(`Webhook Error: Firestore update failed: ${dbError.message}`);
              return;
          }

      } else {
          // Handle other event types
          logger.log(`Received unhandled event type: ${event.type}`);
      }

    // Return a response to acknowledge receipt of the event
    response.status(200).json({ received: true });
});
