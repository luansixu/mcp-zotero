import { extractText } from "unpdf";

interface PdfTextResult {
  text: string;
  totalPages: number;
}

export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const result = await extractText(uint8, { mergePages: true });
  return {
    text: result.text as string,
    totalPages: result.totalPages,
  };
}
