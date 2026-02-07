import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from "module";
import { handleToolCall, TOOL_DEFINITIONS } from "./tools/index.js";

// Re-export for backward compatibility with existing tests
export { GetCollectionItemsSchema, GetItemDetailsSchema, SearchLibrarySchema, GetRecentSchema } from "./schemas/index.js";
export { formatErrorResponse } from "./utils/error-formatter.js";
export { handleToolCall } from "./tools/index.js";

console.error("Starting MCP Zotero Server...");

export interface ZoteroServerOptions {
  userId?: string;
  apiKey?: string;
  zoteroApi?: unknown;
}

class ZoteroServer {
  private server: Server;
  private zoteroApi: unknown;
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

  private setupHandlers() {
    console.error("Setting up handlers...");

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error("🛠️ LIST TOOLS: Starting request handler");
      const response = { tools: TOOL_DEFINITIONS };
      console.error("📝 LIST TOOLS: Sending response");
      return response;
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(
        `[DEBUG] Received tool call request: ${request.params.name}`
      );
      console.error(`[DEBUG] Tool arguments:`, request.params.arguments);

      const { name, arguments: args } = request.params;

      try {
        return await handleToolCall(name, args ?? {}, this.zoteroApi as any, this.userId);
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
