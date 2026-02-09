import { z } from "zod";
import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { resolveDois } from "../utils/doi-resolver.js";
import { cslToZoteroItem } from "../utils/csl-to-zotero.js";
import { logger } from "../utils/logger.js";
import { lookupOaPdf } from "../utils/unpaywall.js";
import { downloadAndUploadPdf } from "../utils/pdf-uploader.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

export const toolConfig = {
  name: "add_items_by_doi",
  description: `Add papers to your Zotero library by resolving DOIs. For each DOI, resolves metadata via content negotiation and creates the item in Zotero. Returns a list of successfully added items (with item_key and title) and any failures.

WORKFLOW TIPS:
- To collect metadata for all added items, call get_items_details with the returned item_keys (single batch call).
- To create a cited Word document, use the returned item_keys as <zcite keys="ITEMKEY"/> placeholders in a .docx, then call inject_citations. See inject_citations description for the full workflow.`,
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
        "Attach freely available OA PDFs via Unpaywall (default: true). This is lightweight and adds no cost — leave enabled. Only set to false if PDF attachment is causing errors."
      ),
  },
} as const;

const AddItemsByDoiSchema = z.object(toolConfig.inputSchema);

interface PdfAttachResult {
  item_key: string;
  doi: string;
  pdf_attached: boolean;
  source: string | null;
  oa_status?: string;
  landing_url?: string;
  error?: string;
}

interface CreatedItem {
  doi: string;
  item_key: string;
  title: string;
}

async function attachPdfsToItems(
  items: CreatedItem[],
  zoteroApi: ZoteroApiInterface,
  userId: string,
  apiKey: string
): Promise<PdfAttachResult[]> {
  const itemsWithDoi = items.filter((item) => item.doi);
  if (itemsWithDoi.length === 0) return [];

  // Probe Unpaywall config with the first DOI — if email is bad, skip entirely
  const probe = await lookupOaPdf(itemsWithDoi[0].doi);
  if (probe.warning) {
    return [{
      item_key: itemsWithDoi[0].item_key,
      doi: itemsWithDoi[0].doi,
      pdf_attached: false,
      source: null,
      error: probe.warning,
    }];
  }

  // Email is valid — process all items in parallel (reuse probe for first)
  const settled = await mapWithConcurrency(itemsWithDoi, async (item, i): Promise<PdfAttachResult> => {
    const oaResult = i === 0 ? probe : await lookupOaPdf(item.doi);
    if (oaResult.found && oaResult.pdf_url) {
      const uploadResult = await downloadAndUploadPdf(zoteroApi, userId, apiKey, {
        url: oaResult.pdf_url,
        parentItem: item.item_key,
      });
      return {
        item_key: item.item_key,
        doi: item.doi,
        pdf_attached: uploadResult.success,
        source: oaResult.source,
        error: uploadResult.success ? undefined : uploadResult.error,
      };
    }
    return {
      item_key: item.item_key,
      doi: item.doi,
      pdf_attached: false,
      source: null,
      oa_status: oaResult.oa_status ?? undefined,
      landing_url: oaResult.landing_url ?? undefined,
      error: oaResult.landing_url
        ? "Open access copy exists at a repository but no direct PDF link is available. The user can download it manually from the landing page and use import_pdf_to_zotero to attach it."
        : "No open access PDF found",
    };
  });

  return settled
    .filter((r): r is PromiseFulfilledResult<PdfAttachResult> => r.status === "fulfilled")
    .map((r) => r.value);
}

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

    let pdf_results: PdfAttachResult[] | undefined;
    if (auto_attach_pdf) {
      const apiKey = process.env.ZOTERO_API_KEY;
      if (apiKey) {
        pdf_results = await attachPdfsToItems(success, zoteroApi, userId, apiKey);
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
