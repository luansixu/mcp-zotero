import { ZoteroApiInterface } from "../types/zotero-types.js";
import { formatErrorResponse } from "../utils/error-formatter.js";

export async function handleGetCollections(
  zoteroApi: ZoteroApiInterface,
  userId: string,
  _args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  console.error(
    `[DEBUG] GET_COLLECTIONS: Starting with userId ${userId}`
  );
  try {
    console.error(
      `[DEBUG] GET_COLLECTIONS: Testing API connection...`
    );
    const response = await zoteroApi
      .library("user", userId)
      .collections()
      .get();

    const collections = response.getData();
    console.error(
      `[DEBUG] GET_COLLECTIONS: Found ${collections.length} collections`
    );

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
    const error = err as {
      response?: {
        status: number;
        url?: string;
      };
      message: string;
    };
    console.error(`[ERROR] GET_COLLECTIONS: Failed:`, {
      status: error.response?.status,
      message: error.message,
      userId: userId,
      url: error.response?.url,
    });
    throw error;
  }
}
