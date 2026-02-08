import { z } from "zod";
import { ZoteroApiInterface, ZoteroItemData, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators, formatTags } from "../utils/item-formatter.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "get_item_details",
  description: "Get detailed information about a specific paper",
  inputSchema: {
    itemKey: z.string().describe("The paper's item key/ID"),
  },
} as const;

const ItemDetailsSchema = z.object(toolConfig.inputSchema);

export async function handleGetItemDetails(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { itemKey } = ItemDetailsSchema.parse(args);
  if (!itemKey?.trim()) {
    return formatErrorResponse("Item key is required");
  }

  try {
    const response = await zoteroApi
      .library("user", userId)
      .items(itemKey)
      .get();

    const item = response.getData() as ZoteroItemData;

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
    if (isZoteroApiError(err)) {
      logger.error("Tool execution failed", {
        tool: "get_item_details",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
