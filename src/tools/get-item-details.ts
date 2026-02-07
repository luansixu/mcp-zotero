import { ZoteroApiInterface } from "../types/zotero-types.js";
import { GetItemDetailsSchema } from "../schemas/index.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators, formatTags } from "../utils/item-formatter.js";

export async function handleGetItemDetails(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { itemKey } = GetItemDetailsSchema.parse(args);
  if (!itemKey?.trim()) {
    return formatErrorResponse("Item key is required");
  }

  try {
    const response = await zoteroApi
      .library("user", userId)
      .items(itemKey)
      .get();

    const item = response.getData();
    console.error(
      `[DEBUG] GET_ITEM_DETAILS: Raw response:`,
      JSON.stringify(item, null, 2)
    );

    if (!item) {
      return formatErrorResponse(
        "Item not found or inaccessible",
        {
          itemKey,
          suggestion:
            "Verify the item exists and you have permission to access it",
        }
      );
    }

    const formatted = {
      title: item.title || "Untitled",
      authors: formatCreators(item.creators),
      date: item.date || "No date",
      abstract: item.abstractNote || "No abstract available",
      publicationTitle:
        item.publicationTitle || "No publication title",
      doi: item.DOI || "No DOI",
      url: item.url || "No URL",
      tags: formatTags(item.tags),
      collections: item.collections || [],
    };

    return {
      content: [
        { type: "text", text: JSON.stringify(formatted, null, 2) },
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
    console.error(`[ERROR] GET_ITEM_DETAILS: Failed:`, {
      status: error.response?.status,
      message: error.message,
      userId: userId,
      url: error.response?.url,
    });
    throw error;
  }
}
