import { z } from "zod";
import { createHash } from "node:crypto";
import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { logger } from "../utils/logger.js";
import { extractPdfText } from "../utils/pdf-text-extractor.js";
import { putFulltext } from "../utils/zotero-fulltext.js";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

interface UploadAuthResponse {
  url: string;
  contentType: string;
  prefix: string;
  suffix: string;
  uploadKey: string;
}

export const toolConfig = {
  name: "import_pdf_to_zotero",
  description:
    "Download a PDF from a URL and upload it to Zotero storage as an imported_url attachment. Unlike linked URL attachments, imported files are stored in Zotero's storage and become fulltext-indexed (searchable via get_item_fulltext). Use this when you need the PDF content to be indexed by Zotero.",
  inputSchema: {
    url: z.string().url().describe("URL of the PDF to download and import"),
    filename: z
      .string()
      .optional()
      .describe("Filename for the attachment (default: extracted from URL or document.pdf)"),
    title: z
      .string()
      .optional()
      .describe("Display title for the attachment (default: filename)"),
    content_type: z
      .string()
      .optional()
      .default("application/pdf")
      .describe('MIME type of the file (default: "application/pdf")'),
    parent_item: z
      .string()
      .optional()
      .describe("Item key of the parent item. If provided, the attachment becomes a child of that item."),
    collections: z
      .array(z.string())
      .optional()
      .describe("Collection keys (only used for standalone attachments, ignored when parent_item is set)"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags to apply to the attachment"),
  },
} as const;

const ImportPdfSchema = z.object(toolConfig.inputSchema);

export async function handleImportPdfToZotero(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { url, filename: filenameArg, title, content_type, parent_item, collections, tags } =
    ImportPdfSchema.parse(args);

  const apiKey = process.env.ZOTERO_API_KEY;
  if (!apiKey) {
    return formatErrorResponse("ZOTERO_API_KEY environment variable is not set");
  }

  try {
    // 1. Download the file
    let downloadResponse: Response;
    try {
      downloadResponse = await fetch(url);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return formatErrorResponse("Network error downloading file", {
        url,
        details: detail,
        suggestion:
          "The server may be blocking automated requests, the URL may redirect to an HTML page, or it may require authentication. Try a direct PDF link from another source (e.g. PubMed Central, Sci-Hub, or the publisher's direct PDF endpoint).",
      });
    }
    if (!downloadResponse.ok) {
      return formatErrorResponse("Failed to download file from URL", {
        url,
        status: downloadResponse.status,
      });
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      return formatErrorResponse("File exceeds 100 MB limit", {
        size_bytes: buffer.length,
      });
    }

    // 2. Compute md5 and derive filename
    const md5 = createHash("md5").update(buffer).digest("hex");
    const filename = filenameArg ?? extractFilename(url);

    // 3. Create attachment item via Zotero API
    const itemData: Record<string, unknown> = {
      itemType: "attachment",
      linkMode: "imported_url",
      title: title ?? filename,
      url,
      contentType: content_type,
      filename,
      tags: tags?.map((t) => ({ tag: t })) ?? [],
    };

    if (parent_item) {
      itemData.parentItem = parent_item;
      itemData.collections = [];
    } else {
      itemData.collections = collections ?? [];
    }

    const createResponse = await zoteroApi
      .library("user", userId)
      .items()
      .post([itemData]);

    if (!createResponse.isSuccess()) {
      const errors = createResponse.getErrors();
      const errorMsg = Object.values(errors).join("; ") || "Unknown error";
      return formatErrorResponse("Failed to create attachment item", {
        details: errorMsg,
      });
    }

    const created = createResponse.getData();
    const itemKey = created[0].key as string;

    // 4. Upload authorization
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
      return formatErrorResponse("Upload authorization failed", {
        status: authResponse.status,
      });
    }

    const authData = (await authResponse.json()) as UploadAuthResponse | { exists: 1 };

    // 5-6. Upload binary + register (skip if already exists)
    if (!("exists" in authData)) {
      const auth = authData as UploadAuthResponse;

      // Binary upload
      const prefix = Buffer.from(auth.prefix, "utf-8");
      const suffix = Buffer.from(auth.suffix, "utf-8");
      const uploadBody = Buffer.concat([prefix, buffer, suffix]);

      const uploadResponse = await fetch(auth.url, {
        method: "POST",
        headers: { "Content-Type": auth.contentType },
        body: uploadBody,
      });

      if (!uploadResponse.ok) {
        return formatErrorResponse("File upload failed", {
          status: uploadResponse.status,
        });
      }

      // Register upload
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
        return formatErrorResponse("Upload registration failed", {
          status: registerResponse.status,
        });
      }
    }

    // 7. Extract text and index fulltext
    let fulltextIndexed = false;
    let fulltextStatus: string;

    if (content_type === "application/pdf") {
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

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              item_key: itemKey,
              filename,
              title: title ?? filename,
              url,
              parent_item: parent_item ?? null,
              size_bytes: buffer.length,
              link_mode: "imported_url",
              fulltext_indexed: fulltextIndexed,
              fulltext_status: fulltextStatus,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err) {
    if (isZoteroApiError(err)) {
      logger.error("Tool execution failed", {
        tool: "import_pdf_to_zotero",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    return formatErrorResponse("import_pdf_to_zotero failed", {
      details: message,
    });
  }
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
