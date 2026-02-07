import { vi } from "vitest";

// Provide mock env vars so ZoteroServer constructor doesn't crash
process.env.ZOTERO_API_KEY = "mock-api-key-for-testing";
process.env.ZOTERO_USER_ID = "mock-user-id-for-testing";

// Mock the MCP SDK to prevent actual stdio transport binding during tests.
// Uses function() syntax (not arrow) so mocks are constructable with `new`.
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: function () {
    return {
      setRequestHandler: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
    };
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: function () {
    return {};
  },
}));
