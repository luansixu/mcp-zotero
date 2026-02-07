import { ZoteroApiInterface } from "../types/zotero-types.js";
import { SearchLibrarySchema } from "../schemas/index.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators } from "../utils/item-formatter.js";

export async function handleSearchLibrary(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { query } = SearchLibrarySchema.parse(args);
  if (!query?.trim()) {
    return formatErrorResponse("Search query is required");
  }

  try {
    const response = await zoteroApi
      .library("user", userId)
      .items()
      .get({ q: query });

    const items = response.getData();
    console.error(
      `[DEBUG] SEARCH_LIBRARY: Found ${
        items?.length || 0
      } items for query "${query}"`
    );

    if (!Array.isArray(items) || items.length === 0) {
      return formatErrorResponse("No results found", {
        query,
        suggestion:
          "Try a different search term or verify your library contains matching items",
      });
    }

    const formatted = items.map((item: Record<string, unknown>) => ({
      title: item.title || "Untitled",
      authors: formatCreators(item.creators as import("../types/zotero-types.js").ZoteroCreator[] | undefined),
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
    const error = err as {
      response?: {
        status: number;
        url?: string;
      };
      message: string;
    };
    console.error(`[ERROR] SEARCH_LIBRARY: Failed:`, {
      status: error.response?.status,
      message: error.message,
      userId: userId,
      url: error.response?.url,
    });
    throw error;
  }
}
