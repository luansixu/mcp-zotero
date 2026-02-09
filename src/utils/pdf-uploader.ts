import { createHash } from "node:crypto";
import { ZoteroApiInterface } from "../types/zotero-types.js";
import { logger } from "./logger.js";
import { extractPdfText } from "./pdf-text-extractor.js";
import { putFulltext } from "./zotero-fulltext.js";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

interface UploadAuthResponse {
  url: string;
  contentType: string;
  prefix: string;
  suffix: string;
  uploadKey: string;
}

export interface PdfUploadOptions {
  url: string;
  parentItem?: string;
  collections?: string[];
  tags?: string[];
  filename?: string;
  title?: string;
  contentType?: string;
}

export interface PdfUploadResult {
  success: boolean;
  itemKey?: string;
  filename?: string;
  sizeBytes?: number;
  fulltextIndexed?: boolean;
  fulltextStatus?: string;
  error?: string;
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const basename = pathname.split("/").pop();
    if (basename && basename.includes(".")) {
      return decodeURIComponent(basename);
    }
  } catch {
    // fall through
  }
  return "document.pdf";
}

/**
 * Download a PDF from a URL and upload it to Zotero storage.
 * Handles the full 7-step flow: download → validate → create item → auth → upload → register → fulltext.
 */
export async function downloadAndUploadPdf(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  apiKey: string,
  options: PdfUploadOptions
): Promise<PdfUploadResult> {
  const contentType = options.contentType ?? "application/pdf";
  const filename = options.filename ?? extractFilename(options.url);
  const title = options.title ?? filename;

  // 1. Download the file
  let downloadResponse: Response;
  try {
    downloadResponse = await fetch(options.url);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Network error downloading file: ${detail}. The server may be blocking automated requests, the URL may redirect to an HTML page, or it may require authentication.`,
    };
  }

  if (!downloadResponse.ok) {
    return {
      success: false,
      error: `Failed to download file from URL (status ${downloadResponse.status})`,
    };
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Validate size
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File exceeds 100 MB limit (${buffer.length} bytes)`,
    };
  }

  // 3. Compute md5
  const md5 = createHash("md5").update(buffer).digest("hex");

  // 4. Create attachment item via Zotero API
  const itemData: Record<string, unknown> = {
    itemType: "attachment",
    linkMode: "imported_url",
    title,
    url: options.url,
    contentType,
    filename,
    tags: options.tags?.map((t) => ({ tag: t })) ?? [],
  };

  if (options.parentItem) {
    itemData.parentItem = options.parentItem;
    itemData.collections = [];
  } else {
    itemData.collections = options.collections ?? [];
  }

  const createResponse = await zoteroApi
    .library("user", userId)
    .items()
    .post([itemData]);

  if (!createResponse.isSuccess()) {
    const errors = createResponse.getErrors();
    const errorMsg = Object.values(errors).join("; ") || "Unknown error";
    return {
      success: false,
      error: `Failed to create attachment item: ${errorMsg}`,
    };
  }

  const created = createResponse.getData();
  const itemKey = created[0].key as string;

  // 5. Upload authorization
  const authUrl = `https://api.zotero.org/users/${userId}/items/${itemKey}/file`;
  const authBody = new URLSearchParams({
    md5,
    filename,
    filesize: String(buffer.length),
    mtime: String(Date.now()),
  });

  const authResponse = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Zotero-API-Key": apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      "If-None-Match": "*",
    },
    body: authBody.toString(),
  });

  if (!authResponse.ok) {
    return {
      success: false,
      itemKey,
      error: `Upload authorization failed (status ${authResponse.status})`,
    };
  }

  const authData = (await authResponse.json()) as UploadAuthResponse | { exists: 1 };

  // 6-7. Upload binary + register (skip if already exists)
  if (!("exists" in authData)) {
    const auth = authData as UploadAuthResponse;

    const prefix = Buffer.from(auth.prefix, "utf-8");
    const suffix = Buffer.from(auth.suffix, "utf-8");
    const uploadBody = Buffer.concat([prefix, buffer, suffix]);

    const uploadResponse = await fetch(auth.url, {
      method: "POST",
      headers: { "Content-Type": auth.contentType },
      body: uploadBody,
    });

    if (!uploadResponse.ok) {
      return {
        success: false,
        itemKey,
        error: `File upload failed (status ${uploadResponse.status})`,
      };
    }

    const registerResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Zotero-API-Key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "If-None-Match": "*",
      },
      body: `upload=${auth.uploadKey}`,
    });

    if (!registerResponse.ok) {
      return {
        success: false,
        itemKey,
        error: `Upload registration failed (status ${registerResponse.status})`,
      };
    }
  }

  // 8. Extract text and index fulltext
  let fulltextIndexed = false;
  let fulltextStatus: string;

  if (contentType === "application/pdf") {
    try {
      const { text, totalPages } = await extractPdfText(buffer);
      const putResult = await putFulltext(userId, itemKey, apiKey, text, totalPages);
      fulltextIndexed = putResult.success;
      fulltextStatus = putResult.success
        ? "Fulltext indexed successfully. Use get_item_fulltext to retrieve content."
        : `Fulltext PUT failed: ${putResult.error}. Sync with Zotero Desktop to index the PDF.`;
    } catch {
      fulltextStatus = "PDF text extraction failed. Sync with Zotero Desktop to index the PDF.";
    }
  } else {
    fulltextStatus = "Non-PDF content type, fulltext extraction skipped.";
  }

  logger.info("PDF uploaded successfully", { itemKey, filename, sizeBytes: buffer.length });

  return {
    success: true,
    itemKey,
    filename,
    sizeBytes: buffer.length,
    fulltextIndexed,
    fulltextStatus,
  };
}
