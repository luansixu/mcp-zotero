import { describe, it, expect } from "vitest";
import { z } from "zod";
import { toolConfig as collectionItemsConfig } from "../tools/get-collection-items.js";
import { toolConfig as itemsDetailsConfig } from "../tools/get-items-details.js";
import { toolConfig as searchConfig } from "../tools/search-library.js";
import { toolConfig as recentConfig } from "../tools/get-recent.js";
import { toolConfig as createCollectionConfig } from "../tools/create-collection.js";
import { toolConfig as addItemsByDoiConfig } from "../tools/add-items-by-doi.js";
import { toolConfig as injectCitationsConfig } from "../tools/inject-citations.js";

const GetCollectionItemsSchema = z.object(collectionItemsConfig.inputSchema);
const GetItemsDetailsSchema = z.object(itemsDetailsConfig.inputSchema);
const SearchLibrarySchema = z.object(searchConfig.inputSchema);
const GetRecentSchema = z.object(recentConfig.inputSchema);
const CreateCollectionSchema = z.object(createCollectionConfig.inputSchema);
const AddItemsByDoiSchema = z.object(addItemsByDoiConfig.inputSchema);
const InjectCitationsSchema = z.object(injectCitationsConfig.inputSchema);

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

describe("GetItemsDetailsSchema", () => {
  it("accepts valid item_keys array", () => {
    const result = GetItemsDetailsSchema.parse({ item_keys: ["ITEM001", "ITEM002"] });
    expect(result.item_keys).toEqual(["ITEM001", "ITEM002"]);
  });

  it("accepts single item key", () => {
    const result = GetItemsDetailsSchema.parse({ item_keys: ["ITEM001"] });
    expect(result.item_keys).toHaveLength(1);
  });

  it("rejects missing item_keys", () => {
    expect(() => GetItemsDetailsSchema.parse({})).toThrow();
  });

  it("rejects non-array item_keys", () => {
    expect(() => GetItemsDetailsSchema.parse({ item_keys: "ITEM001" })).toThrow();
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

describe("CreateCollectionSchema", () => {
  it("accepts valid name", () => {
    const result = CreateCollectionSchema.parse({ name: "My Collection" });
    expect(result.name).toBe("My Collection");
  });

  it("rejects missing name", () => {
    expect(() => CreateCollectionSchema.parse({})).toThrow();
  });

  it("accepts optional parent_collection", () => {
    const result = CreateCollectionSchema.parse({
      name: "Sub Collection",
      parent_collection: "PARENT01",
    });
    expect(result.parent_collection).toBe("PARENT01");
  });
});

describe("AddItemsByDoiSchema", () => {
  it("accepts array of DOIs", () => {
    const result = AddItemsByDoiSchema.parse({
      dois: ["10.1038/s41586-023-06647-8"],
    });
    expect(result.dois).toHaveLength(1);
  });

  it("rejects missing dois", () => {
    expect(() => AddItemsByDoiSchema.parse({})).toThrow();
  });

  it("accepts optional collection_key and tags", () => {
    const result = AddItemsByDoiSchema.parse({
      dois: ["10.1234/test"],
      collection_key: "COL001",
      tags: ["ai", "nlp"],
    });
    expect(result.collection_key).toBe("COL001");
    expect(result.tags).toEqual(["ai", "nlp"]);
  });
});

describe("InjectCitationsSchema", () => {
  it("accepts valid file_path", () => {
    const result = InjectCitationsSchema.parse({
      file_path: "/tmp/doc.docx",
    });
    expect(result.file_path).toBe("/tmp/doc.docx");
  });

  it("accepts valid style enum values", () => {
    for (const style of ["apa", "ieee", "vancouver", "harvard", "chicago"]) {
      const result = InjectCitationsSchema.parse({
        file_path: "/tmp/doc.docx",
        style,
      });
      expect(result.style).toBe(style);
    }
  });

  it("defaults style to apa", () => {
    const result = InjectCitationsSchema.parse({
      file_path: "/tmp/doc.docx",
    });
    expect(result.style).toBe("apa");
  });

  it("rejects invalid style", () => {
    expect(() =>
      InjectCitationsSchema.parse({
        file_path: "/tmp/doc.docx",
        style: "invalid",
      })
    ).toThrow();
  });
});
