export const TOOL_DEFINITIONS = [
  {
    name: "get_collections",
    description: "List all collections in your Zotero library",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_collection_items",
    description: "Get all items in a specific collection",
    inputSchema: {
      type: "object" as const,
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
      type: "object" as const,
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
      type: "object" as const,
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
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of papers to return (default 10)",
        },
      },
    },
  },
];
