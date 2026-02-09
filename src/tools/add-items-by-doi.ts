import { z } from "zod";
import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { resolveDois } from "../utils/doi-resolver.js";
import { cslToZoteroItem } from "../utils/csl-to-zotero.js";
import { logger } from "../utils/logger.js";
import { lookupOaPdf } from "../utils/unpaywall.js";
import { downloadAndUploadPdf } from "../utils/pdf-uploader.js";

export const toolConfig = {
  name: "add_items_by_doi",
  description: `Add papers to your Zotero library by resolving DOIs. For each DOI, resolves metadata via content negotiation and creates the item in Zotero. Returns a list of successfully added items (with item_key and title) and any failures. Use the returned item_key values with inject_citations.

WORKFLOW TIP:
After adding items, use get_items_details to collect metadata for all returned item_keys in a single batch call.
If the inject-citations skill is available, Claude can inject citations directly in the sandbox without needing the inject_citations tool.`,
  inputSchema: {
    dois: z
      .array(z.string())
      .describe(
        'Array of DOI strings (e.g. ["10.1038/s41586-023-06647-8"]). Each DOI will be resolved and added to Zotero.'
      ),
    collection_key: z
      .string()
      .optional()
      .describe(
        "Zotero collection key to add items to. Get this from create_collection or get_collections."
      ),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags to apply to all added items"),
    auto_attach_pdf: z
      .boolean()
      .default(true)
      .describe(
        "Automatically check Unpaywall and attach OA PDFs for added items (default: true)"
      ),
  },
} as const;

const AddItemsByDoiSchema = z.object(toolConfig.inputSchema);

export async function handleAddItemsByDoi(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { dois, collection_key, tags, auto_attach_pdf } = AddItemsByDoiSchema.parse(args);

  if (dois.length === 0) {
    return formatErrorResponse("At least one DOI is required");
  }

  try {
    const resolved = await resolveDois(dois);

    if (resolved.success.length === 0) {
      return formatErrorResponse("All DOI resolutions failed", {
        failed: resolved.failed,
      });
    }

    const zoteroItems = resolved.success.map((r) =>
      cslToZoteroItem(r.data, {
        collectionKey: collection_key,
        tags,
      })
    );

    const response = await zoteroApi
      .library("user", userId)
      .items()
      .post(zoteroItems);

    const createdItems = response.getData();
    const success = resolved.success.map((r, i) => ({
      doi: r.doi,
      item_key: createdItems[i]?.key ?? "unknown",
      title: createdItems[i]?.title ?? r.data.title ?? "Untitled",
    }));

    // Auto-attach OA PDFs if enabled
    interface PdfAttachResult {
      item_key: string;
      doi: string;
      pdf_attached: boolean;
      source: string | null;
      oa_status?: string;
      landing_url?: string;
      error?: string;
    }
    let pdf_results: PdfAttachResult[] | undefined;

    if (auto_attach_pdf) {
      const apiKey = process.env.ZOTERO_API_KEY;
      if (apiKey) {
        pdf_results = [];
        for (const item of success) {
          if (!item.doi) continue;
          const oaResult = await lookupOaPdf(item.doi);
          if (oaResult.warning) {
            // Email not configured — skip all remaining items
            pdf_results.push({
              item_key: item.item_key,
              doi: item.doi,
              pdf_attached: false,
              source: null,
              error: oaResult.warning,
            });
            break;
          }
          if (oaResult.found && oaResult.pdf_url) {
            const uploadResult = await downloadAndUploadPdf(zoteroApi, userId, apiKey, {
              url: oaResult.pdf_url,
              parentItem: item.item_key,
            });
            pdf_results.push({
              item_key: item.item_key,
              doi: item.doi,
              pdf_attached: uploadResult.success,
              source: oaResult.source,
              error: uploadResult.success ? undefined : uploadResult.error,
            });
          } else {
            // No PDF URL available — report outcome for every DOI
            pdf_results.push({
              item_key: item.item_key,
              doi: item.doi,
              pdf_attached: false,
              source: null,
              oa_status: oaResult.oa_status ?? undefined,
              landing_url: oaResult.landing_url ?? undefined,
              error: oaResult.landing_url
                ? "Open access copy exists at a repository but no direct PDF link is available. The user can download it manually from the landing page and use import_pdf_to_zotero to attach it."
                : "No open access PDF found",
            });
          }
        }
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success,
              failed: resolved.failed,
              ...(pdf_results !== undefined ? { pdf_results } : {}),
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
        tool: "add_items_by_doi",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
