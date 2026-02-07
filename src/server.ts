import "dotenv/config"; // Add this at the top of the file
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ZoteroCreator, ZoteroTag, ZoteroItem } from "./types/zotero-types.js";
import { z } from "zod";
import { createRequire } from "module";

// At the very top of the file after imports
console.error("Starting MCP Zotero Server...");

// Validation schemas
export const GetCollectionItemsSchema = z.object({
  collectionKey: z.string(),
});

export const GetItemDetailsSchema = z.object({
  itemKey: z.string(),
});

export const SearchLibrarySchema = z.object({
  query: z.string(),
});

export const GetRecentSchema = z.object({
  limit: z.number().optional().default(10),
});

// Standalone helper for consistent error responses
export function formatErrorResponse(message: string, details: Record<string, unknown> = {}) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error: message,
            ...details,
          },
          null,
          2
        ),
      },
    ],
  };
}

// Extracted tool call handler for testability
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  zoteroApi: any,
  userId: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case "get_collections": {
      console.error(
        `[DEBUG] GET_COLLECTIONS: Starting with userId ${userId}`
      );
      try {
        // Test API connection first
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

    case "get_collection_items": {
      const { collectionKey } = GetCollectionItemsSchema.parse(args);
      console.error(
        `[DEBUG] GET_COLLECTION_ITEMS: Fetching items for collection ${collectionKey}`
      );

      try {
        const response = await zoteroApi
          .library("user", userId)
          .collections(collectionKey)
          .items()
          .get();

        const items = response.getData();
        console.error(
          `[DEBUG] GET_COLLECTION_ITEMS: Raw response:`,
          JSON.stringify(items, null, 2)
        );

        if (!items || !Array.isArray(items) || items.length === 0) {
          return formatErrorResponse("Collection is empty", {
            collectionKey,
            suggestion: "Add some items to this collection in Zotero",
            status: "empty",
          });
        }

        const formatted = items
          .filter((item) => item)
          .map((item: any) => ({
            title: item.title || "Untitled",
            authors:
              item.creators
                ?.map((c: ZoteroCreator) =>
                  `${c.firstName || ""} ${c.lastName || ""}`.trim()
                )
                .filter(Boolean)
                .join(", ") || "No authors listed",
            date: item.date || "No date",
            key: item.key || "No key",
            itemType: item.itemType || "Unknown type",
            abstractNote: item.abstractNote || "No abstract available",
            tags:
              item.tags?.map((t: ZoteroTag) => t.tag).filter(Boolean) ||
              [],
            doi: item.DOI || null,
            url: item.url || null,
            publicationTitle: item.publicationTitle || null,
          }));

        console.error(
          `[DEBUG] GET_COLLECTION_ITEMS: Formatted ${formatted.length} items`
        );

        if (formatted.length === 0) {
          return formatErrorResponse(
            "No valid items found in collection",
            {
              collectionKey,
              suggestion:
                "Check that items in this collection have the expected metadata",
              status: "invalid_items",
            }
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatted, null, 2),
            },
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

        if (error.response?.status === 404) {
          return formatErrorResponse(
            "Collection is empty or not accessible",
            {
              collectionKey,
              suggestion:
                "Verify the collection exists and try adding some items to it",
              status: "not_found",
            }
          );
        }

        console.error(`[ERROR] GET_COLLECTION_ITEMS: Failed:`, {
          status: error.response?.status,
          message: error.message,
          collectionKey,
          url: error.response?.url,
        });
        throw error;
      }
    }

    case "get_item_details": {
      const { itemKey } = GetItemDetailsSchema.parse(args);
      if (!itemKey?.trim()) {
        return formatErrorResponse("Item key is required");
      }

      try {
        const response = await zoteroApi
          .library("user", userId)
          .items(itemKey)
          .get();

        const item = response.getData();
        console.error(
          `[DEBUG] GET_ITEM_DETAILS: Raw response:`,
          JSON.stringify(item, null, 2)
        );

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
          authors:
            item.creators
              ?.map((c: ZoteroCreator) =>
                `${c.firstName || ""} ${c.lastName || ""}`.trim()
              )
              .filter(Boolean)
              .join(", ") || "No authors listed",
          date: item.date || "No date",
          abstract: item.abstractNote || "No abstract available",
          publicationTitle:
            item.publicationTitle || "No publication title",
          doi: item.DOI || "No DOI",
          url: item.url || "No URL",
          tags: item.tags?.map((t: ZoteroTag) => t.tag) || [],
          collections: item.collections || [],
        };

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
        console.error(`[ERROR] GET_ITEM_DETAILS: Failed:`, {
          status: error.response?.status,
          message: error.message,
          userId: userId,
          url: error.response?.url,
        });
        throw error;
      }
    }

    case "search_library": {
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

        const formatted = items.map((item) => ({
          title: item.title || "Untitled",
          authors:
            item.creators
              ?.map((c: ZoteroCreator) =>
                `${c.firstName || ""} ${c.lastName || ""}`.trim()
              )
              .filter(Boolean)
              .join(", ") || "No authors listed",
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

    case "get_recent": {
      const { limit } = GetRecentSchema.parse(args);
      try {
        const response = await zoteroApi
          .library("user", userId)
          .items()
          .get({
            sort: "dateAdded",
            direction: "desc",
            limit: Math.min(limit || 10, 100), // Cap at 100 items
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

        const formatted = items.map((item) => ({
          title: item.title || "Untitled",
          authors:
            item.creators
              ?.map((c: ZoteroCreator) =>
                `${c.firstName || ""} ${c.lastName || ""}`.trim()
              )
              .filter(Boolean)
              .join(", ") || "No authors listed",
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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export interface ZoteroServerOptions {
  userId?: string;
  apiKey?: string;
  zoteroApi?: any;
}

class ZoteroServer {
  private server: Server;
  private zoteroApi: any;
  private userId: string;
  private apiKey: string;

  constructor(options: ZoteroServerOptions = {}) {
    console.error("Initializing ZoteroServer...");
    this.server = new Server(
      { name: "zotero", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    console.error("MCP Server initialized");

    if (options.zoteroApi) {
      this.userId = options.userId || "";
      this.apiKey = options.apiKey || "";
      this.zoteroApi = options.zoteroApi;
    } else {
      this.userId = process.env.ZOTERO_USER_ID || "";
      this.apiKey = process.env.ZOTERO_API_KEY || "";
      if (!this.apiKey || !this.userId) {
        throw new Error(
          "Missing ZOTERO_API_KEY or ZOTERO_USER_ID environment variables"
        );
      }

      const require = createRequire(import.meta.url);
      const zoteroApi = require("zotero-api-client/lib/main-node.cjs").default;
      this.zoteroApi = zoteroApi(this.apiKey);
    }
    console.error("Zotero API client initialized");
  }

  private async setupHandlers() {
    console.error("Setting up handlers...");

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error("🛠️ LIST TOOLS: Starting request handler");
      const response = {
        tools: [
          {
            name: "get_collections",
            description: "List all collections in your Zotero library",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_collection_items",
            description: "Get all items in a specific collection",
            inputSchema: {
              type: "object",
              properties: {
                collectionKey: {
                  type: "string",
                  description: "The collection key/ID",
                },
              },
              required: ["collectionKey"],
            },
          },
          {
            name: "get_item_details",
            description: "Get detailed information about a specific paper",
            inputSchema: {
              type: "object",
              properties: {
                itemKey: {
                  type: "string",
                  description: "The paper's item key/ID",
                },
              },
              required: ["itemKey"],
            },
          },
          {
            name: "search_library",
            description: "Search your entire Zotero library",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_recent",
            description: "Get recently added papers to your library",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Number of papers to return (default 10)",
                },
              },
            },
          },
        ],
      };
      console.error("📝 LIST TOOLS: Sending response");
      return response;
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(
        `[DEBUG] Received tool call request: ${request.params.name}`
      );
      console.error(`[DEBUG] Tool arguments:`, request.params.arguments);

      const { name, arguments: args } = request.params;

      try {
        return await handleToolCall(name, args ?? {}, this.zoteroApi, this.userId);
      } catch (error) {
        console.error(`[ERROR] Tool execution failed:`, error);
        throw error;
      }
    });

    console.error("Handlers setup complete");
  }

  async start() {
    console.error("Starting server...");
    await this.setupHandlers();
    const transport = new StdioServerTransport();
    console.error("Connecting to transport...");
    await this.server
      .connect(transport)
      .then(() => {
        console.error("🔌 TRANSPORT: Connection established");
      })
      .catch((error) => {
        console.error("❌ TRANSPORT: Connection failed:", error);
      });
    console.error("Zotero MCP Server running on stdio");
  }
}

// Start the server
async function main() {
  try {
    const server = new ZoteroServer();
    await server.start();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();

console.error("Server module loaded");
