import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractTextFromPdf, MAX_DOCUMENT_SIZE_BYTES, PdfUploadError, validatePdfUpload } from "./documentService";

async function createTextPdf(text: string) {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 72, y: 700, size: 16, font });
  return Buffer.from(await document.save());
}

describe("AccessMate PDF validation", () => {
  it("rejects non-PDF extensions and MIME types", () => {
    expect(() => validatePdfUpload({ fileName: "notes.txt", mimeType: "text/plain", fileBuffer: Buffer.from("notes") })).toThrow(PdfUploadError);
  });

  it("rejects an empty buffer, oversized file, and invalid PDF signature", () => {
    expect(() => validatePdfUpload({ fileName: "empty.pdf", mimeType: "application/pdf", fileBuffer: Buffer.alloc(0) })).toThrow("empty");
    expect(() => validatePdfUpload({ fileName: "large.pdf", mimeType: "application/pdf", fileBuffer: Buffer.alloc(MAX_DOCUMENT_SIZE_BYTES + 1) })).toThrow("8 MB");
    expect(() => validatePdfUpload({ fileName: "broken.pdf", mimeType: "application/pdf", fileBuffer: Buffer.from("not a pdf") })).toThrow("signature");
  });

  it("extracts readable text from a valid PDF", async () => {
    const pdfBuffer = await createTextPdf("AccessMate extraction test");
    validatePdfUpload({ fileName: "readable.pdf", mimeType: "application/pdf", fileBuffer: pdfBuffer });
    await expect(extractTextFromPdf(pdfBuffer)).resolves.toContain("AccessMate extraction test");
  });

  it("treats a malformed PDF as corrupt", async () => {
    await expect(extractTextFromPdf(Buffer.from("%PDF-1.4 not a real file"))).rejects.toThrow("corrupted");
  });
});
