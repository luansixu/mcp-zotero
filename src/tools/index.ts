import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZoteroApiInterface } from "../types/zotero-types.js";
import { handleGetCollections, toolConfig as collectionsConfig } from "./get-collections.js";
import { handleGetCollectionItems, toolConfig as collectionItemsConfig } from "./get-collection-items.js";
import { handleGetItemDetails, toolConfig as itemDetailsConfig } from "./get-item-details.js";
import { handleSearchLibrary, toolConfig as searchConfig } from "./search-library.js";
import { handleGetRecent, toolConfig as recentConfig } from "./get-recent.js";

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ToolHandler = (
  zoteroApi: ZoteroApiInterface,
  userId: string,
  args: Record<string, unknown>
) => Promise<CallToolResult>;

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
  { config: itemDetailsConfig, handler: handleGetItemDetails },
  { config: searchConfig, handler: handleSearchLibrary },
  { config: recentConfig, handler: handleGetRecent },
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
