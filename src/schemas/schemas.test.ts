import { describe, it, expect } from "vitest";
import { z } from "zod";
import { toolConfig as collectionItemsConfig } from "../tools/get-collection-items.js";
import { toolConfig as itemsDetailsConfig } from "../tools/get-items-details.js";
import { toolConfig as searchConfig } from "../tools/search-library.js";
import { toolConfig as createCollectionConfig } from "../tools/create-collection.js";
import { toolConfig as addItemsByDoiConfig } from "../tools/add-items-by-doi.js";
import { toolConfig as injectCitationsConfig } from "../tools/inject-citations.js";
import { toolConfig as getItemFulltextConfig } from "../tools/get-item-fulltext.js";
import { toolConfig as addLinkedUrlAttachmentConfig } from "../tools/add-linked-url-attachment.js";
import { toolConfig as addWebItemConfig } from "../tools/add-web-item.js";
import { toolConfig as importPdfToZoteroConfig } from "../tools/import-pdf-to-zotero.js";

const GetCollectionItemsSchema = z.object(collectionItemsConfig.inputSchema);
const GetItemsDetailsSchema = z.object(itemsDetailsConfig.inputSchema);
const SearchLibrarySchema = z.object(searchConfig.inputSchema);
const CreateCollectionSchema = z.object(createCollectionConfig.inputSchema);
const AddItemsByDoiSchema = z.object(addItemsByDoiConfig.inputSchema);
const InjectCitationsSchema = z.object(injectCitationsConfig.inputSchema);
const GetItemFulltextSchema = z.object(getItemFulltextConfig.inputSchema);
const AddLinkedUrlAttachmentSchema = z.object(addLinkedUrlAttachmentConfig.inputSchema);
const AddWebItemSchema = z.object(addWebItemConfig.inputSchema);
const ImportPdfToZoteroSchema = z.object(importPdfToZoteroConfig.inputSchema);

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

  it("defaults excludeAttachments to true", () => {
    const result = GetCollectionItemsSchema.parse({ collectionKey: "ABC123" });
    expect(result.excludeAttachments).toBe(true);
  });

  it("accepts excludeAttachments as boolean", () => {
    const result = GetCollectionItemsSchema.parse({
      collectionKey: "ABC123",
      excludeAttachments: false,
    });
    expect(result.excludeAttachments).toBe(false);
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

  it("defaults include_abstract to false", () => {
    const result = GetItemsDetailsSchema.parse({ item_keys: ["ITEM001"] });
    expect(result.include_abstract).toBe(false);
  });

  it("accepts include_abstract as true", () => {
    const result = GetItemsDetailsSchema.parse({ item_keys: ["ITEM001"], include_abstract: true });
    expect(result.include_abstract).toBe(true);
  });

  it("rejects non-boolean include_abstract", () => {
    expect(() => GetItemsDetailsSchema.parse({ item_keys: ["ITEM001"], include_abstract: "yes" })).toThrow();
  });
});

describe("SearchLibrarySchema", () => {
  it("accepts valid query", () => {
    const result = SearchLibrarySchema.parse({ query: "machine learning" });
    expect(result.query).toBe("machine learning");
  });

  it("accepts omitted query (for listing mode)", () => {
    const result = SearchLibrarySchema.parse({});
    expect(result.query).toBeUndefined();
  });

  it("rejects non-string query", () => {
    expect(() => SearchLibrarySchema.parse({ query: true })).toThrow();
  });

  it("defaults sort to dateAdded", () => {
    const result = SearchLibrarySchema.parse({});
    expect(result.sort).toBe("dateAdded");
  });

  it("accepts valid sort values", () => {
    for (const sort of ["dateAdded", "dateModified", "title", "creator", "date"]) {
      const result = SearchLibrarySchema.parse({ sort });
      expect(result.sort).toBe(sort);
    }
  });

  it("rejects invalid sort value", () => {
    expect(() => SearchLibrarySchema.parse({ sort: "invalid" })).toThrow();
  });

  it("defaults direction to desc", () => {
    const result = SearchLibrarySchema.parse({});
    expect(result.direction).toBe("desc");
  });

  it("accepts asc direction", () => {
    const result = SearchLibrarySchema.parse({ direction: "asc" });
    expect(result.direction).toBe("asc");
  });

  it("defaults limit to 25", () => {
    const result = SearchLibrarySchema.parse({});
    expect(result.limit).toBe(25);
  });

  it("accepts custom limit", () => {
    const result = SearchLibrarySchema.parse({ limit: 50 });
    expect(result.limit).toBe(50);
  });

  it("rejects non-number limit", () => {
    expect(() => SearchLibrarySchema.parse({ limit: "ten" })).toThrow();
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

describe("GetItemFulltextSchema", () => {
  it("accepts valid item_key", () => {
    const result = GetItemFulltextSchema.parse({ item_key: "ABC12345" });
    expect(result.item_key).toBe("ABC12345");
  });

  it("rejects missing item_key", () => {
    expect(() => GetItemFulltextSchema.parse({})).toThrow();
  });

  it("defaults max_characters to 50000", () => {
    const result = GetItemFulltextSchema.parse({ item_key: "ABC12345" });
    expect(result.max_characters).toBe(50000);
  });
});

describe("AddLinkedUrlAttachmentSchema", () => {
  it("accepts valid URL (only required field)", () => {
    const result = AddLinkedUrlAttachmentSchema.parse({
      url: "https://arxiv.org/abs/2301.00001",
    });
    expect(result.url).toBe("https://arxiv.org/abs/2301.00001");
  });

  it("rejects missing url", () => {
    expect(() => AddLinkedUrlAttachmentSchema.parse({})).toThrow();
  });

  it("rejects invalid url", () => {
    expect(() =>
      AddLinkedUrlAttachmentSchema.parse({ url: "not-a-url" })
    ).toThrow();
  });

  it("accepts optional title and content_type", () => {
    const result = AddLinkedUrlAttachmentSchema.parse({
      url: "https://example.com/paper.pdf",
      title: "My Paper",
      content_type: "application/pdf",
    });
    expect(result.title).toBe("My Paper");
    expect(result.content_type).toBe("application/pdf");
  });

  it("accepts optional parent_item", () => {
    const result = AddLinkedUrlAttachmentSchema.parse({
      url: "https://example.com/paper.pdf",
      parent_item: "ITEM001",
    });
    expect(result.parent_item).toBe("ITEM001");
  });

  it("accepts optional collections", () => {
    const result = AddLinkedUrlAttachmentSchema.parse({
      url: "https://example.com/paper.pdf",
      collections: ["COL001", "COL002"],
    });
    expect(result.collections).toEqual(["COL001", "COL002"]);
  });

  it("accepts optional tags", () => {
    const result = AddLinkedUrlAttachmentSchema.parse({
      url: "https://example.com/paper.pdf",
      tags: ["ai", "nlp"],
    });
    expect(result.tags).toEqual(["ai", "nlp"]);
  });
});

describe("AddWebItemSchema", () => {
  it("accepts url + title (required fields)", () => {
    const result = AddWebItemSchema.parse({
      url: "https://www.nature.com/articles/123",
      title: "AI in 2024",
    });
    expect(result.url).toBe("https://www.nature.com/articles/123");
    expect(result.title).toBe("AI in 2024");
  });

  it("rejects missing url", () => {
    expect(() =>
      AddWebItemSchema.parse({ title: "AI in 2024" })
    ).toThrow();
  });

  it("rejects missing title", () => {
    expect(() =>
      AddWebItemSchema.parse({ url: "https://example.com" })
    ).toThrow();
  });

  it("accepts optional website_title, date, and collection_key", () => {
    const result = AddWebItemSchema.parse({
      url: "https://www.nature.com/articles/123",
      title: "AI in 2024",
      website_title: "Nature News",
      date: "2024-03-15",
      collection_key: "COL001",
    });
    expect(result.website_title).toBe("Nature News");
    expect(result.date).toBe("2024-03-15");
    expect(result.collection_key).toBe("COL001");
  });

  it("accepts optional creators", () => {
    const result = AddWebItemSchema.parse({
      url: "https://example.com",
      title: "Test",
      creators: [{ firstName: "John", lastName: "Smith" }],
    });
    expect(result.creators).toEqual([{ firstName: "John", lastName: "Smith" }]);
  });

  it("accepts optional tags", () => {
    const result = AddWebItemSchema.parse({
      url: "https://example.com",
      title: "Test",
      tags: ["ai"],
    });
    expect(result.tags).toEqual(["ai"]);
  });
});

describe("ImportPdfToZoteroSchema", () => {
  it("accepts valid URL (only required field)", () => {
    const result = ImportPdfToZoteroSchema.parse({
      url: "https://arxiv.org/pdf/2301.00001.pdf",
    });
    expect(result.url).toBe("https://arxiv.org/pdf/2301.00001.pdf");
  });

  it("rejects missing url", () => {
    expect(() => ImportPdfToZoteroSchema.parse({})).toThrow();
  });

  it("rejects invalid url", () => {
    expect(() =>
      ImportPdfToZoteroSchema.parse({ url: "not-a-url" })
    ).toThrow();
  });

  it("accepts optional filename and title", () => {
    const result = ImportPdfToZoteroSchema.parse({
      url: "https://example.com/paper.pdf",
      filename: "my-paper.pdf",
      title: "My Paper",
    });
    expect(result.filename).toBe("my-paper.pdf");
    expect(result.title).toBe("My Paper");
  });

  it("defaults content_type to application/pdf", () => {
    const result = ImportPdfToZoteroSchema.parse({
      url: "https://example.com/paper.pdf",
    });
    expect(result.content_type).toBe("application/pdf");
  });

  it("accepts optional parent_item, collections, and tags", () => {
    const result = ImportPdfToZoteroSchema.parse({
      url: "https://example.com/paper.pdf",
      parent_item: "PARENT01",
      collections: ["COL001"],
      tags: ["ai", "nlp"],
    });
    expect(result.parent_item).toBe("PARENT01");
    expect(result.collections).toEqual(["COL001"]);
    expect(result.tags).toEqual(["ai", "nlp"]);
  });
});
