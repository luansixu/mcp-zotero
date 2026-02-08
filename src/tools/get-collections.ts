import { ZoteroApiInterface, isZoteroApiError } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import { logger } from "../utils/logger.js";

export const toolConfig = {
  name: "get_collections",
  description: "List all collections in your Zotero library",
  inputSchema: {},
} as const;

export async function handleGetCollections(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  _args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const response = await zoteroApi
      .library("user", userId)
      .collections()
      .get();

    const collections = response.getData();

    if (!Array.isArray(collections) || collections.length === 0) {
      return formatErrorResponse("No collections found", {
        suggestion:
          "Create a collection in your Zotero library first",
        helpUrl: "https://www.zotero.org/support/collections",
      });
    }

    return {
      content: [
        { type: "text", text: JSON.stringify(collections, null, 2) },
      ],
    };
  } catch (err) {
    if (isZoteroApiError(err)) {
      logger.error("Tool execution failed", {
        tool: "get_collections",
        status: err.response?.status,
        errorMessage: err.message,
        url: err.response?.url,
      });
    }
    throw err;
  }
}
