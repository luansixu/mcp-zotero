import { z } from "zod";
import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { resolveDois } from "../utils/doi-resolver.js";
import { cslToZoteroItem } from "../utils/csl-to-zotero.js";
import { logger } from "../utils/logger.js";

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
  },
} as const;

const AddItemsByDoiSchema = z.object(toolConfig.inputSchema);

export async function handleAddItemsByDoi(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { dois, collection_key, tags } = AddItemsByDoiSchema.parse(args);

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

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success,
              failed: resolved.failed,
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
