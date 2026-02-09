import { z } from "zod";
import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { logger } from "../utils/logger.js";
import { downloadAndUploadPdf } from "../utils/pdf-uploader.js";

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
  const { url, filename, title, content_type, parent_item, collections, tags } =
    ImportPdfSchema.parse(args);

  const apiKey = process.env.ZOTERO_API_KEY;
  if (!apiKey) {
    return formatErrorResponse("ZOTERO_API_KEY environment variable is not set");
  }

  try {
    const result = await downloadAndUploadPdf(zoteroApi, userId, apiKey, {
      url,
      parentItem: parent_item,
      collections,
      tags,
      filename,
      title,
      contentType: content_type,
    });

    if (!result.success) {
      // Map specific error messages to the original error format for backward compatibility
      const errorMsg = result.error ?? "Unknown error";
      if (errorMsg.startsWith("Network error downloading file")) {
        return formatErrorResponse("Network error downloading file", {
          url,
          details: errorMsg.replace("Network error downloading file: ", "").split(". ")[0],
          suggestion:
            "The server may be blocking automated requests, the URL may redirect to an HTML page, or it may require authentication. Try a direct PDF link from another source (e.g. PubMed Central, Sci-Hub, or the publisher's direct PDF endpoint).",
        });
      }
      if (errorMsg.includes("Failed to download file from URL")) {
        const statusMatch = errorMsg.match(/status (\d+)/);
        return formatErrorResponse("Failed to download file from URL", {
          url,
          status: statusMatch ? Number(statusMatch[1]) : undefined,
        });
      }
      if (errorMsg.includes("exceeds 100 MB limit")) {
        const sizeMatch = errorMsg.match(/\((\d+) bytes\)/);
        return formatErrorResponse("File exceeds 100 MB limit", {
          size_bytes: sizeMatch ? Number(sizeMatch[1]) : undefined,
        });
      }
      if (errorMsg.includes("Upload authorization failed")) {
        const statusMatch = errorMsg.match(/status (\d+)/);
        return formatErrorResponse("Upload authorization failed", {
          status: statusMatch ? Number(statusMatch[1]) : undefined,
        });
      }
      if (errorMsg.includes("File upload failed")) {
        const statusMatch = errorMsg.match(/status (\d+)/);
        return formatErrorResponse("File upload failed", {
          status: statusMatch ? Number(statusMatch[1]) : undefined,
        });
      }
      if (errorMsg.includes("not a valid PDF") || errorMsg.includes("HTML page instead of a PDF")) {
        return formatErrorResponse("Downloaded file is not a valid PDF", {
          url,
          details: errorMsg,
          suggestion: "The URL may redirect to an HTML page or require browser access. Try a direct PDF link.",
        });
      }
      if (errorMsg.includes("Upload registration failed")) {
        const statusMatch = errorMsg.match(/status (\d+)/);
        return formatErrorResponse("Upload registration failed", {
          status: statusMatch ? Number(statusMatch[1]) : undefined,
        });
      }
      return formatErrorResponse("import_pdf_to_zotero failed", { details: errorMsg });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              item_key: result.itemKey,
              filename: result.filename,
              title: title ?? result.filename,
              url,
              parent_item: parent_item ?? null,
              size_bytes: result.sizeBytes,
              link_mode: "imported_url",
              fulltext_indexed: result.fulltextIndexed,
              fulltext_status: result.fulltextStatus,
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
