import { z } from "zod";
import { ZoteroApiInterface, ZoteroItemData, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { formatCreators } from "../utils/item-formatter.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "get_recent",
  description: "Get the most recently added items in your Zotero library, sorted by date added. Returns item keys, titles, and basic metadata. Useful for finding papers you just imported.",
  inputSchema: {
    limit: z.number().optional().default(10).describe("Number of papers to return (default 10)"),
  },
} as const;

const RecentSchema = z.object(toolConfig.inputSchema);

export async function handleGetRecent(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { limit } = RecentSchema.parse(args);
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

    if (!Array.isArray(items) || items.length === 0) {
      return formatErrorResponse("No recent items found", {
        suggestion: "Add some items to your Zotero library first",
      });
    }

    const formatted = items.map((item: ZoteroItemData) => ({
      title: item.title || "Untitled",
      authors: formatCreators(item.creators),
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
    if (isZoteroApiError(err)) {
      logger.error("Tool execution failed", {
        tool: "get_recent",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
