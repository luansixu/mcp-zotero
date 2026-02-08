import { describe, it, expect } from "vitest";
import { handleToolCall } from "./index.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import {
  createZoteroApiMock,
  fullItemFixture,
  minimalItemFixture,
  collectionFixture,
} from "../__mocks__/zotero-api.mock.js";

const TEST_USER_ID = "12345";

// ─── formatErrorResponse ────────────────────────────────────────

describe("formatErrorResponse", () => {
  it("returns MCP-formatted error with message", () => {
    const result = formatErrorResponse("Something went wrong");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Something went wrong");
  });

  it("includes additional details", () => {
    const result = formatErrorResponse("Not found", { itemKey: "XYZ", status: "not_found" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Not found");
    expect(parsed.itemKey).toBe("XYZ");
    expect(parsed.status).toBe("not_found");
  });
});

// ─── get_collections ────────────────────────────────────────────

describe("get_collections", () => {
  it("returns collections as JSON", async () => {
    const { mock } = createZoteroApiMock([collectionFixture]);
    const result = await handleToolCall("get_collections", {}, mock, TEST_USER_ID);

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual([collectionFixture]);
  });

  it("returns error with suggestion when no collections found", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall("get_collections", {}, mock, TEST_USER_ID);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("No collections found");
    expect(parsed.suggestion).toBeDefined();
  });
});

// ─── get_collection_items ───────────────────────────────────────

describe("get_collection_items", () => {
  it("formats items with all fields correctly", async () => {
    const { mock } = createZoteroApiMock([fullItemFixture]);
    const result = await handleToolCall(
      "get_collection_items",
      { collectionKey: "COL001" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Deep Learning for Natural Language Processing");
    expect(parsed[0].authors).toBe("John Smith, Jane Doe");
    expect(parsed[0].date).toBe("2024-01-15");
    expect(parsed[0].key).toBe("ABC12345");
    expect(parsed[0].doi).toBe("10.1234/example.2024.001");
    expect(parsed[0].tags).toEqual(["deep-learning", "NLP"]);
  });

  it("uses fallback values for minimal items", async () => {
    const { mock } = createZoteroApiMock([minimalItemFixture]);
    const result = await handleToolCall(
      "get_collection_items",
      { collectionKey: "COL001" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].title).toBe("Untitled");
    expect(parsed[0].authors).toBe("No authors listed");
    expect(parsed[0].date).toBe("No date");
    expect(parsed[0].abstractNote).toBe("No abstract available");
    expect(parsed[0].doi).toBeNull();
    expect(parsed[0].tags).toEqual([]);
  });

  it("returns error for empty collection", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "get_collection_items",
      { collectionKey: "EMPTY" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Collection is empty");
    expect(parsed.status).toBe("empty");
  });

  it("returns not_found error on 404", async () => {
    const { mock, getStub } = createZoteroApiMock([]);
    const error404 = new Error("Not found") as Error & { response?: { status: number } };
    error404.response = { status: 404 };
    getStub.mockRejectedValueOnce(error404);

    const result = await handleToolCall(
      "get_collection_items",
      { collectionKey: "MISSING" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Collection is empty or not accessible");
    expect(parsed.status).toBe("not_found");
  });
});

// ─── get_item_details ───────────────────────────────────────────

describe("get_item_details", () => {
  it("returns formatted item details", async () => {
    const { mock } = createZoteroApiMock(fullItemFixture);
    const result = await handleToolCall(
      "get_item_details",
      { itemKey: "ABC12345" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.title).toBe("Deep Learning for Natural Language Processing");
    expect(parsed.authors).toBe("John Smith, Jane Doe");
    expect(parsed.doi).toBe("10.1234/example.2024.001");
    expect(parsed.url).toBe("https://example.com/paper");
    expect(parsed.publicationTitle).toBe("Journal of Machine Learning");
    expect(parsed.tags).toEqual(["deep-learning", "NLP"]);
    expect(parsed.collections).toEqual(["COL001", "COL002"]);
  });

  it("uses fallback values for missing fields", async () => {
    const { mock } = createZoteroApiMock(minimalItemFixture);
    const result = await handleToolCall(
      "get_item_details",
      { itemKey: "MIN00001" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.title).toBe("Untitled");
    expect(parsed.authors).toBe("No authors listed");
    expect(parsed.doi).toBe("No DOI");
    expect(parsed.url).toBe("No URL");
    expect(parsed.publicationTitle).toBe("No publication title");
  });

  it("returns error for empty itemKey", async () => {
    const { mock } = createZoteroApiMock(null);
    const result = await handleToolCall(
      "get_item_details",
      { itemKey: "  " },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Item key is required");
  });

  it("returns error when item is null", async () => {
    const { mock } = createZoteroApiMock(null);
    const result = await handleToolCall(
      "get_item_details",
      { itemKey: "NONEXIST" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Item not found or inaccessible");
  });
});

// ─── search_library ─────────────────────────────────────────────

describe("search_library", () => {
  it("returns formatted search results", async () => {
    const { mock } = createZoteroApiMock([fullItemFixture]);
    const result = await handleToolCall(
      "search_library",
      { query: "deep learning" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Deep Learning for Natural Language Processing");
    expect(parsed[0].authors).toBe("John Smith, Jane Doe");
    expect(parsed[0].key).toBe("ABC12345");
  });

  it("passes query parameter to API", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    await handleToolCall("search_library", { query: "test query" }, mock, TEST_USER_ID);

    expect(getStub).toHaveBeenCalledWith({ q: "test query" });
  });

  it("returns error for empty query", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "search_library",
      { query: "   " },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Search query is required");
  });

  it("returns error when no results found", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "search_library",
      { query: "nonexistent topic" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("No results found");
    expect(parsed.query).toBe("nonexistent topic");
  });
});

// ─── get_recent ─────────────────────────────────────────────────

describe("get_recent", () => {
  it("returns formatted recent items with default limit", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    const result = await handleToolCall("get_recent", {}, mock, TEST_USER_ID);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Deep Learning for Natural Language Processing");
    expect(parsed[0].dateAdded).toBe("2024-02-01T10:30:00Z");

    expect(getStub).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it("caps limit at 100", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    await handleToolCall("get_recent", { limit: 500 }, mock, TEST_USER_ID);

    expect(getStub).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  it("returns error when no recent items found", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall("get_recent", {}, mock, TEST_USER_ID);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("No recent items found");
    expect(parsed.suggestion).toBeDefined();
  });
});

// ─── Unknown tool ───────────────────────────────────────────────

describe("Unknown tool", () => {
  it("throws Error for unknown tool name", async () => {
    const { mock } = createZoteroApiMock([]);
    await expect(
      handleToolCall("nonexistent_tool", {}, mock, TEST_USER_ID)
    ).rejects.toThrow("Unknown tool: nonexistent_tool");
  });
});
