import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZoteroApiInterface } from "../types/zotero-types.js";
import { handleGetCollections, toolConfig as collectionsConfig } from "./get-collections.js";
import { handleGetCollectionItems, toolConfig as collectionItemsConfig } from "./get-collection-items.js";
import { handleGetItemsDetails, toolConfig as itemsDetailsConfig } from "./get-items-details.js";
import { handleSearchLibrary, toolConfig as searchConfig } from "./search-library.js";
import { handleGetRecent, toolConfig as recentConfig } from "./get-recent.js";
import { handleCreateCollection, toolConfig as createCollectionConfig } from "./create-collection.js";
import { handleAddItemsByDoi, toolConfig as addItemsByDoiConfig } from "./add-items-by-doi.js";
import { handleInjectCitations, toolConfig as injectCitationsConfig } from "./inject-citations.js";
import { handleGetUserId, toolConfig as getUserIdConfig } from "./get-user-id.js";

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ToolHandler = (
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
) => Promise<CallToolResult>;

const handlers: Record<string, ToolHandler> = {
  get_collections: handleGetCollections,
  get_collection_items: handleGetCollectionItems,
  get_items_details: handleGetItemsDetails,
  search_library: handleSearchLibrary,
  get_recent: handleGetRecent,
  create_collection: handleCreateCollection,
  add_items_by_doi: handleAddItemsByDoi,
  inject_citations: handleInjectCitations,
  get_user_id: handleGetUserId,
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  zoteroApi: ZoteroApiInterface,
  userId: string
): Promise<CallToolResult> {
  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(zoteroApi, userId, args);
}

const toolConfigs = [
  { config: collectionsConfig, handler: handleGetCollections },
  { config: collectionItemsConfig, handler: handleGetCollectionItems },
  { config: itemsDetailsConfig, handler: handleGetItemsDetails },
  { config: searchConfig, handler: handleSearchLibrary },
  { config: recentConfig, handler: handleGetRecent },
  { config: createCollectionConfig, handler: handleCreateCollection },
  { config: addItemsByDoiConfig, handler: handleAddItemsByDoi },
  { config: injectCitationsConfig, handler: handleInjectCitations },
  { config: getUserIdConfig, handler: handleGetUserId },
];

export function registerAllTools(
  server: McpServer,
  zoteroApi: ZoteroApiInterface,
  userId: string
): void {
  for (const { config, handler } of toolConfigs) {
    server.registerTool(config.name, {
      description: config.description,
      inputSchema: config.inputSchema,
    }, async (args: Record<string, unknown>) => {
      return handler(zoteroApi, userId, args);
    });
  }
}
