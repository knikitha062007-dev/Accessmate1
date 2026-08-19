import { PDFParse } from "pdf-parse";
import { storagePut } from "./storage";
import { saveDocument } from "./accessmateDb";

export const MAX_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024;

export class PdfUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfUploadError";
  }
}

export function validatePdfUpload(input: { fileName: string; mimeType: string; fileBuffer: Buffer }) {
  const fileName = input.fileName.trim();
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    throw new PdfUploadError("Only files with a .pdf extension can be uploaded.");
  }
  if (input.mimeType && input.mimeType !== "application/pdf") {
    throw new PdfUploadError("The selected file is not identified as a PDF.");
  }
  if (!input.fileBuffer.length) {
    throw new PdfUploadError("The selected PDF is empty.");
  }
  if (input.fileBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    throw new PdfUploadError("The PDF exceeds the 8 MB file-size limit.");
  }
  if (input.fileBuffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new PdfUploadError("The selected file does not contain a valid PDF signature.");
  }
}

export async function extractTextFromPdf(fileBuffer: Buffer) {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    const text = result.text.replace(/\r\n/g, "\n").trim();
    if (!text) {
      throw new PdfUploadError("This PDF contains no extractable text. Image-only PDFs are not supported yet.");
    }
    return text;
  } catch (error) {
    if (error instanceof PdfUploadError) throw error;
    throw new PdfUploadError("This PDF appears to be corrupted or cannot be read.");
  } finally {
    await parser?.destroy();
  }
}

function decodeBase64Pdf(fileData: string) {
  const normalized = fileData.replace(/^data:application\/pdf;base64,/i, "").replace(/\s/g, "");
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new PdfUploadError("The uploaded file data could not be read.");
  }
  return Buffer.from(normalized, "base64");
}

export async function processDocumentUpload(input: {
  user: { openId: string; name?: string | null; email?: string | null };
  fileName: string;
  mimeType: string;
  fileData: string;
}) {
  const fileBuffer = decodeBase64Pdf(input.fileData);
  validatePdfUpload({ fileName: input.fileName, mimeType: input.mimeType, fileBuffer });
  const extractedText = await extractTextFromPdf(fileBuffer);
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedFile = await storagePut(`accessmate/${input.user.openId}/${safeName}`, fileBuffer, "application/pdf");
  return saveDocument({
    user: input.user,
    fileName: input.fileName.trim(),
    fileKey: storedFile.key,
    fileUrl: storedFile.url,
    mimeType: "application/pdf",
    fileSize: fileBuffer.length,
    extractedText,
  });
}
