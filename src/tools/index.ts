import { ZoteroApiInterface } from "../types/zotero-types.js";
import { handleGetCollections } from "./get-collections.js";
import { handleGetCollectionItems } from "./get-collection-items.js";
import { handleGetItemDetails } from "./get-item-details.js";
import { handleSearchLibrary } from "./search-library.js";
import { handleGetRecent } from "./get-recent.js";

export { TOOL_DEFINITIONS } from "./tool-definitions.js";

type ToolHandler = (
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
) => Promise<{ content: Array<{ type: string; text: string }> }>;

const handlers: Record<string, ToolHandler> = {
  get_collections: handleGetCollections,
  get_collection_items: handleGetCollectionItems,
  get_item_details: handleGetItemDetails,
  search_library: handleSearchLibrary,
  get_recent: handleGetRecent,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  zoteroApi: ZoteroApiInterface,
  userId: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(zoteroApi, userId, args);
}
