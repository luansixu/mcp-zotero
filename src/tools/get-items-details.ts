import { z } from "zod";
import { ZoteroApiInterface, ZoteroItemData, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators } from "../utils/item-formatter.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "get_items_details",
  description:
    "Get metadata for multiple Zotero items in a single call. Accepts an array of item keys and returns a map of key → metadata. Use this instead of calling get_item_details multiple times. Returns title, authors, date, DOI, item type, publication title, and URL for each item. Set include_abstract to include abstracts (excluded by default to keep responses lightweight).",
  inputSchema: {
    item_keys: z
      .array(z.string())
      .describe(
        'Array of Zotero item keys (e.g. ["EUHUT5K3", "F9UQM7N2"]). Get these from search_library, add_items_by_doi, or get_collection_items.'
      ),
    include_abstract: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include abstractNote in the response. Default false to keep responses lightweight."
      ),
  },
} as const;

const GetItemsDetailsSchema = z.object(toolConfig.inputSchema);

interface ItemMetadata {
  title: string;
  authors: string;
  date: string;
  doi: string | null;
  itemType: string;
  publicationTitle: string | null;
  url: string | null;
  abstractNote?: string;
}

export async function handleGetItemsDetails(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { item_keys, include_abstract } = GetItemsDetailsSchema.parse(args);

  if (item_keys.length === 0) {
    return formatErrorResponse("At least one item key is required");
  }

  try {
    const response = await zoteroApi
      .library("user", userId)
      .items()
      .get({ itemKey: item_keys.join(",") });

    const items = response.getData() as ZoteroItemData[];

    if (!items || (Array.isArray(items) && items.length === 0)) {
      return formatErrorResponse("No items found for the given keys", {
        item_keys,
      });
    }

    const itemList = Array.isArray(items) ? items : [items];

    const result: Record<string, ItemMetadata> = {};
    for (const item of itemList) {
      const key = item.key;
      if (!key) continue;
      result[key] = {
        title: item.title || "Untitled",
        authors: formatCreators(item.creators),
        date: item.date || "No date",
        doi: item.DOI || null,
        itemType: item.itemType || "document",
        publicationTitle: item.publicationTitle || null,
        url: item.url || null,
      };
      if (include_abstract && item.abstractNote) {
        result[key].abstractNote = item.abstractNote;
      }
    }

    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) },
      ],
    };
  } catch (err) {
    if (isZoteroApiError(err)) {
      logger.error("Tool execution failed", {
        tool: "get_items_details",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
