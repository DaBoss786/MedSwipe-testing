// functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- CONFIGURATION ---
const BUCKET_NAME = "medswipe-648ee.firebasestorage.app";
// --- END CONFIGURATION ---

const bucket = admin.storage().bucket(BUCKET_NAME);

exports.generateCmeCertificate = onCall({ timeoutSeconds: 120 }, async (request) => {
  // 1. Auth check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please log in.");
  }
  const uid = request.auth.uid;

  // 2. Input validation
  const { certificateFullName, creditsToClaim } = request.data;
  if (
    !certificateFullName ||
    typeof certificateFullName !== "string" ||
    certificateFullName.trim() === ""
  ) {
    throw new HttpsError("invalid-argument", "Please provide a valid full name.");
  }
  if (
    typeof creditsToClaim !== "number" ||
    creditsToClaim <= 0 ||
    isNaN(creditsToClaim)
  ) {
    throw new HttpsError("invalid-argument", "Please provide a valid credits amount.");
  }

  logger.log(`Generating certificate for ${certificateFullName} (${creditsToClaim} credits)`);

  // 3. Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter dimensions in points
  const { width, height } = page.getSize();

  // 4. Embed fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 5. Draw text on the page
  // Title
  const title = "Certificate of Completion";
  const titleSize = 24;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 100,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Subtitle
  page.drawText("This certifies that", {
    x: 72,
    y: height - 150,
    size: 12,
    font: fontRegular,
  });

  // Recipient name
  const nameSize = 18;
  const nameWidth = fontBold.widthOfTextAtSize(certificateFullName, nameSize);
  page.drawText(certificateFullName, {
    x: (width - nameWidth) / 2,
    y: height - 180,
    size: nameSize,
    font: fontBold,
  });

  // Credits line
  page.drawText(`has claimed ${creditsToClaim.toFixed(2)} AMA PRA Category 1 Credit(s)™`, {
    x: 72,
    y: height - 220,
    size: 12,
    font: fontRegular,
  });

  // Date line
  const today = new Date().toLocaleDateString();
  page.drawText(`Date: ${today}`, {
    x: 72,
    y: height - 260,
    size: 12,
    font: fontRegular,
  });

  // 6. Serialize the PDF to bytes (Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // 7. Upload to Cloud Storage
  const safeName = certificateFullName.replace(/[^a-zA-Z0-9]/g, "_");
  const filePath = `cme_certificates/${uid}/${Date.now()}_${safeName}.pdf`;
  const file = bucket.file(filePath);

  await file.save(Buffer.from(pdfBytes), {
    metadata: { contentType: "application/pdf" },
    public: true,
  });

  // 8. Return the public URL
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
  logger.log("Returning publicUrl from function:", publicUrl);
  return { success: true, publicUrl };
});
