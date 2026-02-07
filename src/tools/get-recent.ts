import { ZoteroApiInterface } from "../types/zotero-types.js";
import { GetRecentSchema } from "../schemas/index.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators } from "../utils/item-formatter.js";

export async function handleGetRecent(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { limit } = GetRecentSchema.parse(args);
  try {
    const response = await zoteroApi
      .library("user", userId)
      .items()
      .get({
        sort: "dateAdded",
        direction: "desc",
        limit: Math.min(limit || 10, 100),
      });

    const items = response.getData();
    console.error(
      `[DEBUG] GET_RECENT: Found ${items?.length || 0} recent items`
    );

    if (!Array.isArray(items) || items.length === 0) {
      return formatErrorResponse("No recent items found", {
        suggestion: "Add some items to your Zotero library first",
      });
    }

    const formatted = items.map((item: Record<string, unknown>) => ({
      title: item.title || "Untitled",
      authors: formatCreators(item.creators as import("../types/zotero-types.js").ZoteroCreator[] | undefined),
      dateAdded: item.dateAdded || "No date",
      key: item.key,
      itemType: item.itemType,
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
    console.error(`[ERROR] GET_RECENT: Failed:`, {
      status: error.response?.status,
      message: error.message,
      userId: userId,
      url: error.response?.url,
    });
    throw error;
  }
}
