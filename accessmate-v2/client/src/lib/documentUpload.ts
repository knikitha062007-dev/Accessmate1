export const MAX_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024;

export function readPdfAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The PDF could not be read from this device."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The PDF could not be read from this device."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(size < 1024 * 1024 ? 1 : 0)} MB`;
}
