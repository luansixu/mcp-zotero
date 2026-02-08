import { z } from "zod";
import { ZoteroApiInterface, ZoteroItemData, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators, formatTags } from "../utils/item-formatter.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "get_collection_items",
  description: "Get all items in a specific Zotero collection. Returns item keys, titles, authors, and dates. Use the collectionKey from get_collections.",
  inputSchema: {
    collectionKey: z.string().describe("The collection key/ID"),
  },
} as const;

const CollectionItemsSchema = z.object(toolConfig.inputSchema);

export async function handleGetCollectionItems(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { collectionKey } = CollectionItemsSchema.parse(args);

  try {
    const response = await zoteroApi
      .library("user", userId)
      .collections(collectionKey)
      .items()
      .get();

    const items = response.getData();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return formatErrorResponse("Collection is empty", {
        collectionKey,
        suggestion: "Add some items to this collection in Zotero",
        status: "empty",
      });
    }

    const formatted = items
      .filter((item) => item)
      .map((item: ZoteroItemData) => ({
        title: item.title || "Untitled",
        authors: formatCreators(item.creators),
        date: item.date || "No date",
        key: item.key || "No key",
        itemType: item.itemType || "Unknown type",
        abstractNote: item.abstractNote || "No abstract available",
        tags: formatTags(item.tags),
        doi: item.DOI || null,
        url: item.url || null,
        publicationTitle: item.publicationTitle || null,
      }));

    if (formatted.length === 0) {
      return formatErrorResponse(
        "No valid items found in collection",
        {
          collectionKey,
          suggestion:
            "Check that items in this collection have the expected metadata",
          status: "invalid_items",
        }
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formatted, null, 2),
        },
      ],
    };
  } catch (err) {
    if (isZoteroApiError(err)) {
      if (err.response?.status === 404) {
        return formatErrorResponse(
          "Collection is empty or not accessible",
          {
            collectionKey,
            suggestion:
              "Verify the collection exists and try adding some items to it",
            status: "not_found",
          }
        );
      }

      logger.error("Tool execution failed", {
        tool: "get_collection_items",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
