import { describe, it, expect, vi } from "vitest";
import { handleToolCall } from "./index.js";
import { formatErrorResponse } from "../utils/error-formatter.js";
import {
  createZoteroApiMock,
  fullItemFixture,
  minimalItemFixture,
  collectionFixture,
} from "../__mocks__/zotero-api.mock.js";

vi.mock("../utils/doi-resolver.js", () => ({
  resolveDois: vi.fn(),
}));

vi.mock("../citation-injector/injector.js", () => ({
  injectCitations: vi.fn(),
}));


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

// ─── get_items_details ──────────────────────────────────────────

describe("get_items_details", () => {
  it("returns metadata map for multiple items", async () => {
    const { mock } = createZoteroApiMock([fullItemFixture, minimalItemFixture]);
    const result = await handleToolCall(
      "get_items_details",
      { item_keys: ["ABC12345", "MIN00001"] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed["ABC12345"].title).toBe("Deep Learning for Natural Language Processing");
    expect(parsed["ABC12345"].authors).toBe("John Smith, Jane Doe");
    expect(parsed["ABC12345"].doi).toBe("10.1234/example.2024.001");
    expect(parsed["ABC12345"].itemType).toBe("journalArticle");
    expect(parsed["ABC12345"].publicationTitle).toBe("Journal of Machine Learning");
    expect(parsed["ABC12345"].url).toBe("https://example.com/paper");
    expect(parsed["MIN00001"].title).toBe("Untitled");
    expect(parsed["MIN00001"].authors).toBe("No authors listed");
    expect(parsed["MIN00001"].doi).toBeNull();
  });

  it("passes itemKey query param to API", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    await handleToolCall(
      "get_items_details",
      { item_keys: ["ABC12345", "DEF67890"] },
      mock,
      TEST_USER_ID
    );

    expect(getStub).toHaveBeenCalledWith({ itemKey: "ABC12345,DEF67890" });
  });

  it("excludes abstract from response", async () => {
    const { mock } = createZoteroApiMock([fullItemFixture]);
    const result = await handleToolCall(
      "get_items_details",
      { item_keys: ["ABC12345"] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed["ABC12345"]).not.toHaveProperty("abstract");
    expect(parsed["ABC12345"]).not.toHaveProperty("abstractNote");
  });

  it("returns error for empty item_keys array", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "get_items_details",
      { item_keys: [] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("At least one item key is required");
  });

  it("returns error when no items found", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "get_items_details",
      { item_keys: ["NONEXIST"] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("No items found for the given keys");
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

// ─── create_collection ─────────────────────────────────────────

describe("create_collection", () => {
  it("creates collection and returns key + name", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "NEW001", name: "Test Collection" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "create_collection",
      { name: "Test Collection" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.collection_key).toBe("NEW001");
    expect(parsed.name).toBe("Test Collection");
  });

  it("creates collection with parent_collection", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "SUB001", name: "Sub Collection", parentCollection: "PARENT01" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "create_collection",
      { name: "Sub Collection", parent_collection: "PARENT01" },
      mock,
      TEST_USER_ID
    );

    expect(postStub).toHaveBeenCalledWith([
      { name: "Sub Collection", parentCollection: "PARENT01" },
    ]);
  });

  it("returns error for empty name", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "create_collection",
      { name: "   " },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Collection name is required");
  });

  it("returns error when API POST fails", async () => {
    const writeData = {
      isSuccess: false,
      data: [],
      errors: { "0": "Invalid collection data" },
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "create_collection",
      { name: "Fail Collection" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Failed to create collection");
  });
});

// ─── add_items_by_doi ──────────────────────────────────────────

describe("add_items_by_doi", () => {
  it("resolves DOI and creates item successfully", async () => {
    const { resolveDois } = await import("../utils/doi-resolver.js");
    const resolveDoiMock = vi.mocked(resolveDois);
    resolveDoiMock.mockResolvedValueOnce({
      success: [
        {
          doi: "10.1234/test",
          data: {
            type: "article-journal",
            title: "Test Paper",
            author: [{ family: "Smith", given: "John" }],
            issued: { "date-parts": [["2023"]] },
            DOI: "10.1234/test",
          },
        },
      ],
      failed: [],
    });

    const writeData = {
      isSuccess: true,
      data: [{ key: "ITEM001", title: "Test Paper" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "add_items_by_doi",
      { dois: ["10.1234/test"] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toHaveLength(1);
    expect(parsed.success[0].doi).toBe("10.1234/test");
    expect(parsed.success[0].item_key).toBe("ITEM001");
    expect(parsed.failed).toHaveLength(0);
  });

  it("handles partially failed DOIs", async () => {
    const { resolveDois } = await import("../utils/doi-resolver.js");
    const resolveDoiMock = vi.mocked(resolveDois);
    resolveDoiMock.mockResolvedValueOnce({
      success: [
        {
          doi: "10.1234/good",
          data: {
            type: "article-journal",
            title: "Good Paper",
            DOI: "10.1234/good",
          },
        },
      ],
      failed: [{ doi: "10.9999/bad", error: "Not found" }],
    });

    const writeData = {
      isSuccess: true,
      data: [{ key: "GOOD01", title: "Good Paper" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "add_items_by_doi",
      { dois: ["10.1234/good", "10.9999/bad"] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toHaveLength(1);
    expect(parsed.failed).toHaveLength(1);
    expect(parsed.failed[0].doi).toBe("10.9999/bad");
  });

  it("returns error when all DOIs fail", async () => {
    const { resolveDois } = await import("../utils/doi-resolver.js");
    const resolveDoiMock = vi.mocked(resolveDois);
    resolveDoiMock.mockResolvedValueOnce({
      success: [],
      failed: [
        { doi: "10.9999/bad1", error: "Not found" },
        { doi: "10.9999/bad2", error: "Not found" },
      ],
    });

    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "add_items_by_doi",
      { dois: ["10.9999/bad1", "10.9999/bad2"] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("All DOI resolutions failed");
  });

  it("returns error for empty dois array", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "add_items_by_doi",
      { dois: [] },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("At least one DOI is required");
  });

  it("passes collection_key and tags to converter", async () => {
    const { resolveDois } = await import("../utils/doi-resolver.js");
    const resolveDoiMock = vi.mocked(resolveDois);
    resolveDoiMock.mockResolvedValueOnce({
      success: [
        {
          doi: "10.1234/test",
          data: {
            type: "article-journal",
            title: "Tagged Paper",
            DOI: "10.1234/test",
          },
        },
      ],
      failed: [],
    });

    const writeData = {
      isSuccess: true,
      data: [{ key: "TAG001", title: "Tagged Paper" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_items_by_doi",
      { dois: ["10.1234/test"], collection_key: "COL001", tags: ["ai"] },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("collections", ["COL001"]);
    expect(postedData[0]).toHaveProperty("tags", [{ tag: "ai" }]);
  });
});

// ─── inject_citations ──────────────────────────────────────────

describe("inject_citations", () => {
  it("returns error for missing file_path", async () => {
    const { mock } = createZoteroApiMock([]);
    await expect(
      handleToolCall("inject_citations", {}, mock, TEST_USER_ID)
    ).rejects.toThrow();
  });

  it("returns error for non-.docx file", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "inject_citations",
      { file_path: "/tmp/document.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("File must be a .docx file");
  });

  it("calls injectCitations and returns result", async () => {
    const { injectCitations: injectMock } = await import(
      "../citation-injector/injector.js"
    );
    vi.mocked(injectMock).mockResolvedValueOnce({
      outputPath: "/tmp/doc_cited.docx",
      found: 3,
      injected: 3,
    });

    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "inject_citations",
      { file_path: "/tmp/doc.docx", style: "apa" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.output_path).toBe("/tmp/doc_cited.docx");
    expect(parsed.citations_found).toBe(3);
    expect(parsed.citations_injected).toBe(3);
  });
});

// ─── get_user_id ────────────────────────────────────────────────

describe("get_user_id", () => {
  it("returns the configured user ID", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall("get_user_id", {}, mock, TEST_USER_ID);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.user_id).toBe(TEST_USER_ID);
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
