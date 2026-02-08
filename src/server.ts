import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { ZoteroApiInterface } from "./types/zotero-types.js";
import { registerAllTools } from "./tools/index.js";
import { logger } from "./utils/logger.js";

// Re-export for backward compatibility with existing tests
export { formatErrorResponse } from "./utils/error-formatter.js";
export { handleToolCall } from "./tools/index.js";

export interface ZoteroServerOptions {
  userId?: string;
  apiKey?: string;
  zoteroApi?: ZoteroApiInterface;
}

class ZoteroServer {
  private server: McpServer;
  private zoteroApi: ZoteroApiInterface;
  private userId: string;

  constructor(options: ZoteroServerOptions = {}) {
    this.server = new McpServer(
      { name: "zotero", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    if (options.zoteroApi) {
      this.userId = options.userId || "";
      this.zoteroApi = options.zoteroApi;
    } else {
      this.userId = process.env.ZOTERO_USER_ID || "";
      const apiKey = process.env.ZOTERO_API_KEY || "";
      if (!apiKey || !this.userId) {
        throw new Error(
          "Missing ZOTERO_API_KEY or ZOTERO_USER_ID environment variables"
        );
      }

      const require = createRequire(import.meta.url);
      const zoteroApiFactory = require("zotero-api-client/lib/main-node.cjs").default;
      this.zoteroApi = zoteroApiFactory(apiKey) as ZoteroApiInterface;
    }
  }

  private setupHandlers() {
    registerAllTools(this.server, this.zoteroApi, this.userId);
  }

  async start() {
    this.setupHandlers();
    const transport = new StdioServerTransport();
    logger.info("Starting Zotero MCP Server", { transport: "stdio" });
    try {
      await this.server.connect(transport);
      logger.info("Server connected");
    } catch (error) {
      logger.error("Connection failed", { error: String(error) });
      throw error;
    }
  }
}

async function main() {
  try {
    const server = new ZoteroServer();
    await server.start();
  } catch (error) {
    logger.error("Fatal error", { error: String(error) });
    process.exit(1);
  }
}

main();
