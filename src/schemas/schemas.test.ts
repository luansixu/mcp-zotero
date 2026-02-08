import { describe, it, expect } from "vitest";
import { z } from "zod";
import { toolConfig as collectionItemsConfig } from "../tools/get-collection-items.js";
import { toolConfig as itemDetailsConfig } from "../tools/get-item-details.js";
import { toolConfig as searchConfig } from "../tools/search-library.js";
import { toolConfig as recentConfig } from "../tools/get-recent.js";

const GetCollectionItemsSchema = z.object(collectionItemsConfig.inputSchema);
const GetItemDetailsSchema = z.object(itemDetailsConfig.inputSchema);
const SearchLibrarySchema = z.object(searchConfig.inputSchema);
const GetRecentSchema = z.object(recentConfig.inputSchema);

describe("GetCollectionItemsSchema", () => {
  it("accepts valid collectionKey", () => {
    const result = GetCollectionItemsSchema.parse({ collectionKey: "ABC123" });
    expect(result.collectionKey).toBe("ABC123");
  });

  it("rejects missing collectionKey", () => {
    expect(() => GetCollectionItemsSchema.parse({})).toThrow();
  });

  it("rejects non-string collectionKey", () => {
    expect(() => GetCollectionItemsSchema.parse({ collectionKey: 123 })).toThrow();
  });
});

describe("GetItemDetailsSchema", () => {
  it("accepts valid itemKey", () => {
    const result = GetItemDetailsSchema.parse({ itemKey: "ITEM001" });
    expect(result.itemKey).toBe("ITEM001");
  });

  it("rejects missing itemKey", () => {
    expect(() => GetItemDetailsSchema.parse({})).toThrow();
  });

  it("rejects non-string itemKey", () => {
    expect(() => GetItemDetailsSchema.parse({ itemKey: 42 })).toThrow();
  });
});

describe("SearchLibrarySchema", () => {
  it("accepts valid query", () => {
    const result = SearchLibrarySchema.parse({ query: "machine learning" });
    expect(result.query).toBe("machine learning");
  });

  it("rejects missing query", () => {
    expect(() => SearchLibrarySchema.parse({})).toThrow();
  });

  it("rejects non-string query", () => {
    expect(() => SearchLibrarySchema.parse({ query: true })).toThrow();
  });
});

describe("GetRecentSchema", () => {
  it("accepts valid limit", () => {
    const result = GetRecentSchema.parse({ limit: 25 });
    expect(result.limit).toBe(25);
  });

  it("defaults limit to 10 when omitted", () => {
    const result = GetRecentSchema.parse({});
    expect(result.limit).toBe(10);
  });

  it("rejects non-number limit", () => {
    expect(() => GetRecentSchema.parse({ limit: "ten" })).toThrow();
  });
});
