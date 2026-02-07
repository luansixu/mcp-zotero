import { describe, it, expect } from "vitest";
import {
  GetCollectionItemsSchema,
  GetItemDetailsSchema,
  SearchLibrarySchema,
  GetRecentSchema,
} from "./index.js";

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
