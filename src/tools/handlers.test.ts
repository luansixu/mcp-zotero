import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

vi.mock("../utils/pdf-text-extractor.js", () => ({
  extractPdfText: vi.fn(),
}));

vi.mock("../utils/zotero-fulltext.js", () => ({
  putFulltext: vi.fn(),
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

  it("filters out attachments and notes client-side when excludeAttachments is true", async () => {
    const attachmentItem = { key: "ATT001", itemType: "attachment", title: "PDF" };
    const noteItem = { key: "NOTE01", itemType: "note", title: "My note" };
    const { mock } = createZoteroApiMock([fullItemFixture, attachmentItem, noteItem]);
    const result = await handleToolCall(
      "get_collection_items",
      { collectionKey: "COL001" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe("ABC12345");
  });

  it("includes attachments and notes when excludeAttachments is false", async () => {
    const attachmentItem = { key: "ATT001", itemType: "attachment", title: "PDF" };
    const { mock } = createZoteroApiMock([fullItemFixture, attachmentItem]);
    const result = await handleToolCall(
      "get_collection_items",
      { collectionKey: "COL001", excludeAttachments: false },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
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

  it("passes query and default sort params to API", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    await handleToolCall("search_library", { query: "test query" }, mock, TEST_USER_ID);

    expect(getStub).toHaveBeenCalledWith({
      q: "test query",
      sort: "dateAdded",
      direction: "desc",
      limit: 25,
    });
  });

  it("returns recent items when query is omitted (replaces get_recent)", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    const result = await handleToolCall("search_library", {}, mock, TEST_USER_ID);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Deep Learning for Natural Language Processing");
    expect(parsed[0].dateAdded).toBe("2024-02-01T10:30:00Z");

    expect(getStub).toHaveBeenCalledWith({
      sort: "dateAdded",
      direction: "desc",
      limit: 25,
    });
  });

  it("caps limit at 100", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    await handleToolCall("search_library", { limit: 500 }, mock, TEST_USER_ID);

    expect(getStub).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  it("passes custom sort and direction", async () => {
    const { mock, getStub } = createZoteroApiMock([fullItemFixture]);
    await handleToolCall(
      "search_library",
      { sort: "title", direction: "asc", limit: 5 },
      mock,
      TEST_USER_ID
    );

    expect(getStub).toHaveBeenCalledWith({
      sort: "title",
      direction: "asc",
      limit: 5,
    });
  });

  it("does not include dateAdded when sort is not dateAdded", async () => {
    const { mock } = createZoteroApiMock([fullItemFixture]);
    const result = await handleToolCall(
      "search_library",
      { sort: "title" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0]).not.toHaveProperty("dateAdded");
  });

  it("returns error when no results found (with query)", async () => {
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

  it("returns error when no items found (without query)", async () => {
    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall("search_library", {}, mock, TEST_USER_ID);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("No items found");
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

// ─── get_item_fulltext ─────────────────────────────────────────

describe("get_item_fulltext", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ZOTERO_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("returns fulltext successfully", async () => {
    const parentItem = { ...fullItemFixture, itemType: "journalArticle" };
    const pdfChild = {
      key: "ATTACH01",
      itemType: "attachment",
      contentType: "application/pdf",
      title: "Full Text PDF",
    };

    const { mock, getStub } = createZoteroApiMock([]);
    // First call: parent item metadata
    getStub.mockResolvedValueOnce({ getData: () => parentItem });
    // Second call: children
    getStub.mockResolvedValueOnce({ getData: () => [pdfChild] });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            content: "This is the full text of the paper.",
            indexedPages: 10,
            totalPages: 10,
          }),
      })
    );

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "ABC12345" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("ABC12345");
    expect(parsed.attachment_key).toBe("ATTACH01");
    expect(parsed.text).toBe("This is the full text of the paper.");
    expect(parsed.truncated).toBe(false);
    expect(parsed.pages).toBe(10);
  });

  it("returns error when fulltext not indexed (404)", async () => {
    const parentItem = { ...fullItemFixture, itemType: "journalArticle" };
    const pdfChild = {
      key: "ATTACH01",
      itemType: "attachment",
      contentType: "application/pdf",
    };

    const { mock, getStub } = createZoteroApiMock([]);
    getStub.mockResolvedValueOnce({ getData: () => parentItem });
    getStub.mockResolvedValueOnce({ getData: () => [pdfChild] });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 404 })
    );

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "ABC12345" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("Full text not indexed");
  });

  it("returns error when no PDF attachment found", async () => {
    const parentItem = { ...fullItemFixture, itemType: "journalArticle", url: undefined };
    const noteChild = { key: "NOTE01", itemType: "note", title: "My notes" };

    const { mock, getStub } = createZoteroApiMock([]);
    getStub.mockResolvedValueOnce({ getData: () => ({ ...parentItem, url: undefined }) });
    getStub.mockResolvedValueOnce({ getData: () => [noteChild] });

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "ABC12345" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("No PDF attachment found");
  });

  it("returns URL suggestion for items with URL but no PDF", async () => {
    const parentItem = {
      ...fullItemFixture,
      itemType: "journalArticle",
      url: "https://example.com/paper",
    };

    const { mock, getStub } = createZoteroApiMock([]);
    getStub.mockResolvedValueOnce({ getData: () => parentItem });
    getStub.mockResolvedValueOnce({ getData: () => [] });

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "ABC12345" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("URL");
    expect(parsed.url).toBe("https://example.com/paper");
  });

  it("returns URL suggestion for webpage itemType", async () => {
    const webpageItem = {
      key: "WEB001",
      itemType: "webpage",
      title: "Some Blog Post",
      url: "https://example.com/blog",
    };

    const { mock, getStub } = createZoteroApiMock([]);
    getStub.mockResolvedValueOnce({ getData: () => webpageItem });
    getStub.mockResolvedValueOnce({ getData: () => [] });

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "WEB001" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain("web page");
  });

  it("handles direct attachment key", async () => {
    const attachmentItem = {
      key: "ATTACH01",
      itemType: "attachment",
      contentType: "application/pdf",
      title: "Full Text PDF",
    };

    const { mock, getStub } = createZoteroApiMock([]);
    getStub.mockResolvedValueOnce({ getData: () => attachmentItem });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: "Direct attachment text." }),
      })
    );

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "ATTACH01" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("ATTACH01");
    expect(parsed.attachment_key).toBe("ATTACH01");
    expect(parsed.text).toBe("Direct attachment text.");
  });

  it("truncates text when exceeding max_characters", async () => {
    const parentItem = { ...fullItemFixture, itemType: "journalArticle" };
    const pdfChild = {
      key: "ATTACH01",
      itemType: "attachment",
      contentType: "application/pdf",
    };

    const { mock, getStub } = createZoteroApiMock([]);
    getStub.mockResolvedValueOnce({ getData: () => parentItem });
    getStub.mockResolvedValueOnce({ getData: () => [pdfChild] });

    const longText = "A".repeat(200);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: longText }),
      })
    );

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "ABC12345", max_characters: 100 },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.truncated).toBe(true);
    expect(parsed.characters).toBe(100);
    expect(parsed.text).toHaveLength(100);
  });

  it("returns error for non-existent item (404)", async () => {
    const { mock, getStub } = createZoteroApiMock([]);
    const error404 = new Error("Not found") as Error & { response?: { status: number } };
    error404.response = { status: 404 };
    getStub.mockRejectedValueOnce(error404);

    const result = await handleToolCall(
      "get_item_fulltext",
      { item_key: "NONEXIST" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Item not found");
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
      warnings: [],
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

// ─── add_linked_url_attachment ──────────────────────────────────

describe("add_linked_url_attachment", () => {
  it("creates standalone attachment with minimal args (url only)", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "ATT001", title: "https://arxiv.org/abs/2301.00001" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "add_linked_url_attachment",
      { url: "https://arxiv.org/abs/2301.00001" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("ATT001");
    expect(parsed.url).toBe("https://arxiv.org/abs/2301.00001");
    expect(parsed.parent_item).toBeNull();
    expect(parsed.link_mode).toBe("linked_url");
  });

  it("creates child attachment with parent_item and content_type", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "ATT002", title: "Paper PDF" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "add_linked_url_attachment",
      {
        url: "https://arxiv.org/pdf/2301.00001.pdf",
        title: "Paper PDF",
        parent_item: "PARENT1",
        content_type: "application/pdf",
      },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("ATT002");
    expect(parsed.parent_item).toBe("PARENT1");

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("parentItem", "PARENT1");
    expect(postedData[0]).toHaveProperty("contentType", "application/pdf");
    expect(postedData[0]).toHaveProperty("linkMode", "linked_url");
  });

  it("uses url as title when title is not provided", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "ATT003" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_linked_url_attachment",
      { url: "https://example.com/resource" },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("title", "https://example.com/resource");
  });

  it("sets collections for standalone attachment", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "ATT004" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_linked_url_attachment",
      { url: "https://example.com", collections: ["COL001", "COL002"] },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("collections", ["COL001", "COL002"]);
  });

  it("forces collections=[] when parent_item is present", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "ATT005" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_linked_url_attachment",
      {
        url: "https://example.com",
        parent_item: "PARENT1",
        collections: ["COL001"],
      },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("collections", []);
    expect(postedData[0]).toHaveProperty("parentItem", "PARENT1");
  });

  it("converts tags to Zotero format", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "ATT006" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_linked_url_attachment",
      { url: "https://example.com", tags: ["ai", "nlp"] },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("tags", [{ tag: "ai" }, { tag: "nlp" }]);
  });

  it("returns error when POST fails", async () => {
    const writeData = {
      isSuccess: false,
      data: [],
      errors: { "0": "Invalid attachment data" },
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "add_linked_url_attachment",
      { url: "https://example.com" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Failed to create linked URL attachment");
  });
});

// ─── add_web_item ───────────────────────────────────────────────

describe("add_web_item", () => {
  it("creates webpage with minimal args (url + title)", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "WEB001", title: "AI in 2024" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "add_web_item",
      { url: "https://www.nature.com/articles/123", title: "AI in 2024" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("WEB001");
    expect(parsed.title).toBe("AI in 2024");
    expect(parsed.url).toBe("https://www.nature.com/articles/123");
    expect(parsed.item_type).toBe("webpage");
  });

  it("sets websiteTitle and date", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "WEB002", title: "Test" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_web_item",
      {
        url: "https://example.com",
        title: "Test",
        website_title: "Nature News",
        date: "2024-03-15",
      },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("websiteTitle", "Nature News");
    expect(postedData[0]).toHaveProperty("date", "2024-03-15");
  });

  it("sets accessDate automatically", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "WEB003", title: "Test" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_web_item",
      { url: "https://example.com", title: "Test" },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("accessDate");
    // Should be YYYY-MM-DD format
    expect(postedData[0].accessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("adds to collection with collection_key", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "WEB004", title: "Test" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_web_item",
      { url: "https://example.com", title: "Test", collection_key: "COL001" },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("collections", ["COL001"]);
  });

  it("converts creators with creatorType author", async () => {
    const writeData = {
      isSuccess: true,
      data: [{ key: "WEB005", title: "Test" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "add_web_item",
      {
        url: "https://example.com",
        title: "Test",
        creators: [{ firstName: "John", lastName: "Smith" }],
      },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("creators", [
      { firstName: "John", lastName: "Smith", creatorType: "author" },
    ]);
  });

  it("returns error when POST fails", async () => {
    const writeData = {
      isSuccess: false,
      data: [],
      errors: { "0": "Invalid item data" },
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "add_web_item",
      { url: "https://example.com", title: "Test" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Failed to create web page item");
  });
});

// ─── import_pdf_to_zotero ───────────────────────────────────────

describe("import_pdf_to_zotero", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ZOTERO_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  const pdfBuffer = Buffer.from("fake-pdf-content");

  function mockFetchChain(overrides?: {
    download?: Partial<Response>;
    auth?: Record<string, unknown>;
    upload?: Partial<Response>;
    register?: Partial<Response>;
  }) {
    const fetchMock = vi.fn();
    // 1. Download
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)),
      ...overrides?.download,
    });
    // 2. Upload auth
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(
          overrides?.auth ?? {
            url: "https://storage.zotero.org/upload",
            contentType: "application/octet-stream",
            prefix: "PREFIX",
            suffix: "SUFFIX",
            uploadKey: "UPLOAD_KEY_123",
          }
        ),
    });
    // 3. Binary upload
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      ...overrides?.upload,
    });
    // 4. Register
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      ...overrides?.register,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  /** Set up extractPdfText + putFulltext mocks for successful fulltext indexing */
  async function mockFulltextSuccess() {
    const { extractPdfText } = await import("../utils/pdf-text-extractor.js");
    const { putFulltext } = await import("../utils/zotero-fulltext.js");
    vi.mocked(extractPdfText).mockResolvedValueOnce({ text: "Extracted PDF text", totalPages: 5 });
    vi.mocked(putFulltext).mockResolvedValueOnce({ success: true });
  }

  it("downloads and uploads with minimal args (url only)", async () => {
    mockFetchChain();
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP001", title: "2301.00001.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://arxiv.org/pdf/2301.00001.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("IMP001");
    expect(parsed.filename).toBe("2301.00001.pdf");
    expect(parsed.link_mode).toBe("imported_url");
    expect(parsed.size_bytes).toBe(pdfBuffer.length);
    expect(parsed.parent_item).toBeNull();
    expect(parsed.fulltext_indexed).toBe(true);
  });

  it("creates child attachment with parent_item", async () => {
    mockFetchChain();
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP002", title: "paper.pdf" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "import_pdf_to_zotero",
      {
        url: "https://example.com/paper.pdf",
        parent_item: "PARENT1",
      },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("parentItem", "PARENT1");
    expect(postedData[0]).toHaveProperty("collections", []);
    expect(postedData[0]).toHaveProperty("linkMode", "imported_url");
  });

  it("extracts filename from URL when not provided", async () => {
    mockFetchChain();
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP003", title: "my-paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/files/my-paper.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.filename).toBe("my-paper.pdf");
  });

  it("forces collections=[] when parent_item is present", async () => {
    mockFetchChain();
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP004", title: "paper.pdf" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);
    await handleToolCall(
      "import_pdf_to_zotero",
      {
        url: "https://example.com/paper.pdf",
        parent_item: "PARENT1",
        collections: ["COL001"],
      },
      mock,
      TEST_USER_ID
    );

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("collections", []);
    expect(postedData[0]).toHaveProperty("parentItem", "PARENT1");
  });

  it("returns error when download fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      })
    );

    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/forbidden.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Failed to download file from URL");
    expect(parsed.status).toBe(403);
  });

  it("returns error when file exceeds 100 MB", async () => {
    const hugeBuffer = Buffer.alloc(101 * 1024 * 1024);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(hugeBuffer.buffer.slice(hugeBuffer.byteOffset, hugeBuffer.byteOffset + hugeBuffer.byteLength)),
      })
    );

    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/huge.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("File exceeds 100 MB limit");
    expect(parsed.size_bytes).toBeGreaterThan(100 * 1024 * 1024);
  });

  it("skips binary upload when file already exists", async () => {
    const fetchMock = mockFetchChain({ auth: { exists: 1 } });
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP005", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/paper.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("IMP005");
    // Only 2 fetch calls: download + auth (no binary upload or register)
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns error when upload authorization fails", async () => {
    const fetchMock = vi.fn();
    // Download OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)),
    });
    // Auth fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });
    vi.stubGlobal("fetch", fetchMock);

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP006", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/paper.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Upload authorization failed");
    expect(parsed.status).toBe(403);
  });

  it("returns descriptive error when download fetch throws (network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"))
    );

    const { mock } = createZoteroApiMock([]);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://www.frontiersin.org/articles/10.3389/fmed.2022.943631/pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Network error downloading file");
    expect(parsed.details).toBe("fetch failed");
    expect(parsed.url).toContain("frontiersin.org");
    expect(parsed.suggestion).toBeDefined();
  });

  it("indexes fulltext successfully after PDF upload", async () => {
    mockFetchChain();

    const { extractPdfText } = await import("../utils/pdf-text-extractor.js");
    const { putFulltext } = await import("../utils/zotero-fulltext.js");
    vi.mocked(extractPdfText).mockResolvedValueOnce({ text: "Paper content here", totalPages: 10 });
    vi.mocked(putFulltext).mockResolvedValueOnce({ success: true });

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP010", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/paper.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.fulltext_indexed).toBe(true);
    expect(parsed.fulltext_status).toContain("Fulltext indexed successfully");

    expect(vi.mocked(extractPdfText)).toHaveBeenCalledWith(expect.any(Buffer));
    expect(vi.mocked(putFulltext)).toHaveBeenCalledWith(
      TEST_USER_ID,
      "IMP010",
      "test-api-key",
      "Paper content here",
      10
    );
  });

  it("handles PDF text extraction failure gracefully", async () => {
    mockFetchChain();

    const { extractPdfText } = await import("../utils/pdf-text-extractor.js");
    vi.mocked(extractPdfText).mockRejectedValueOnce(new Error("Corrupt PDF"));

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP011", title: "corrupt.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/corrupt.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("IMP011");
    expect(parsed.fulltext_indexed).toBe(false);
    expect(parsed.fulltext_status).toContain("PDF text extraction failed");
  });

  it("handles fulltext PUT failure gracefully", async () => {
    mockFetchChain();

    const { extractPdfText } = await import("../utils/pdf-text-extractor.js");
    const { putFulltext } = await import("../utils/zotero-fulltext.js");
    vi.mocked(extractPdfText).mockResolvedValueOnce({ text: "Some text", totalPages: 3 });
    vi.mocked(putFulltext).mockResolvedValueOnce({
      success: false,
      error: "Fulltext PUT failed with status 500",
    });

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP012", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/paper.pdf" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("IMP012");
    expect(parsed.fulltext_indexed).toBe(false);
    expect(parsed.fulltext_status).toContain("Fulltext PUT failed");
  });

  it("skips fulltext extraction for non-PDF content types", async () => {
    mockFetchChain();

    const { extractPdfText } = await import("../utils/pdf-text-extractor.js");
    const extractMock = vi.mocked(extractPdfText);
    extractMock.mockClear();

    const writeData = {
      isSuccess: true,
      data: [{ key: "IMP013", title: "image.png" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);
    const result = await handleToolCall(
      "import_pdf_to_zotero",
      { url: "https://example.com/image.png", content_type: "image/png", filename: "image.png" },
      mock,
      TEST_USER_ID
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.item_key).toBe("IMP013");
    expect(parsed.fulltext_indexed).toBe(false);
    expect(parsed.fulltext_status).toContain("Non-PDF content type");
    expect(extractMock).not.toHaveBeenCalled();
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
