import {
  answerFromDocument,
  simplifyDocumentText,
  translateDocumentText,
} from "../server/documentAssistant.ts";
import { extractTextFromPdf, validatePdfUpload } from "../server/documentService.ts";
import { PDFDocument, StandardFonts } from "pdf-lib";

const generatedPdf = await PDFDocument.create();
const page = generatedPdf.addPage([612, 792]);
const font = await generatedPdf.embedFont(StandardFonts.Helvetica);
page.drawText("AccessMate orientation is scheduled for Monday at 10:00 AM. Participants should bring a valid photo ID.", { x: 54, y: 720, size: 13, font, maxWidth: 490 });
const pdfBuffer = Buffer.from(await generatedPdf.save());
validatePdfUpload({ fileName: "accessmate-flow.pdf", mimeType: "application/pdf", fileBuffer: pdfBuffer });
const extractedText = await extractTextFromPdf(pdfBuffer);

const simplified = await simplifyDocumentText(extractedText);
const telugu = await translateDocumentText(simplified, "Telugu");
const hindi = await translateDocumentText(simplified, "Hindi");
const answer = await answerFromDocument(extractedText, "When is AccessMate orientation scheduled?", "English");

if (!simplified || !telugu || !hindi || !/monday/i.test(answer)) {
  throw new Error("Live document assistant verification returned an incomplete result.");
}

console.log("Simplify: PASS");
console.log("Translate to Telugu: PASS");
console.log("Translate to Hindi: PASS");
console.log("Ask Document: PASS");
