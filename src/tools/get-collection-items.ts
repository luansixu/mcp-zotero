import { ZoteroApiInterface } from "../types/zotero-types.js";
import { GetCollectionItemsSchema } from "../schemas/index.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators, formatTags } from "../utils/item-formatter.js";

export async function handleGetCollectionItems(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { collectionKey } = GetCollectionItemsSchema.parse(args);
  console.error(
    `[DEBUG] GET_COLLECTION_ITEMS: Fetching items for collection ${collectionKey}`
  );

  try {
    const response = await zoteroApi
      .library("user", userId)
      .collections(collectionKey)
      .items()
      .get();

    const items = response.getData();
    console.error(
      `[DEBUG] GET_COLLECTION_ITEMS: Raw response:`,
      JSON.stringify(items, null, 2)
    );

    if (!items || !Array.isArray(items) || items.length === 0) {
      return formatErrorResponse("Collection is empty", {
        collectionKey,
        suggestion: "Add some items to this collection in Zotero",
        status: "empty",
      });
    }

    const formatted = items
      .filter((item) => item)
      .map((item: Record<string, unknown>) => ({
        title: item.title || "Untitled",
        authors: formatCreators(item.creators as import("../types/zotero-types.js").ZoteroCreator[] | undefined),
        date: item.date || "No date",
        key: item.key || "No key",
        itemType: item.itemType || "Unknown type",
        abstractNote: item.abstractNote || "No abstract available",
        tags: formatTags(item.tags as import("../types/zotero-types.js").ZoteroTag[] | undefined),
        doi: item.DOI || null,
        url: item.url || null,
        publicationTitle: item.publicationTitle || null,
      }));

    console.error(
      `[DEBUG] GET_COLLECTION_ITEMS: Formatted ${formatted.length} items`
    );

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
    const error = err as {
      response?: {
        status: number;
        url?: string;
      };
      message: string;
    };

    if (error.response?.status === 404) {
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

    console.error(`[ERROR] GET_COLLECTION_ITEMS: Failed:`, {
      status: error.response?.status,
      message: error.message,
      collectionKey,
      url: error.response?.url,
    });
    throw error;
  }
}
