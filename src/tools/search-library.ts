import { z } from "zod";
import { ZoteroApiInterface, ZoteroItemData, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators } from "../utils/item-formatter.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "search_library",
  description: "Search your entire Zotero library",
  inputSchema: {
    query: z.string().describe("Search query"),
  },
} as const;

const SearchSchema = z.object(toolConfig.inputSchema);

export async function handleSearchLibrary(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { query } = SearchSchema.parse(args);
  if (!query?.trim()) {
    return formatErrorResponse("Search query is required");
  }

  try {
    const response = await zoteroApi
      .library("user", userId)
      .items()
      .get({ q: query });

    const items = response.getData();

    if (!Array.isArray(items) || items.length === 0) {
      return formatErrorResponse("No results found", {
        query,
        suggestion:
          "Try a different search term or verify your library contains matching items",
      });
    }

    const formatted = items.map((item: ZoteroItemData) => ({
      title: item.title || "Untitled",
      authors: formatCreators(item.creators),
      date: item.date || "No date",
      key: item.key,
      itemType: item.itemType,
      abstractNote: item.abstractNote || "No abstract available",
    }));

    return {
      content: [
        { type: "text", text: JSON.stringify(formatted, null, 2) },
      ],
    };
  } catch (err) {
    if (isZoteroApiError(err)) {
      logger.error("Tool execution failed", {
        tool: "search_library",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
