import { describe, it, expect } from "vitest";
import { cslToZoteroItem } from "./csl-to-zotero.js";
import { CslItemData } from "../types/csl-types.js";

describe("cslToZoteroItem", () => {
  it("converts article-journal to journalArticle", () => {
    const csl: CslItemData = {
      type: "article-journal",
      title: "Test Paper",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [["2023"]] },
      DOI: "10.1234/test",
      "container-title": "Test Journal",
      volume: "42",
      issue: "3",
      page: "100-120",
    };

    const result = cslToZoteroItem(csl);
    expect(result.itemType).toBe("journalArticle");
    expect(result.title).toBe("Test Paper");
    expect(result.DOI).toBe("10.1234/test");
    expect(result.publicationTitle).toBe("Test Journal");
    expect(result.volume).toBe("42");
    expect(result.issue).toBe("3");
    expect(result.pages).toBe("100-120");
    expect(result.date).toBe("2023");
    expect(result.creators).toEqual([
      { firstName: "John", lastName: "Smith", creatorType: "author" },
    ]);
  });

  it("converts book to book", () => {
    const csl: CslItemData = {
      type: "book",
      title: "A Great Book",
      publisher: "Test Publisher",
      "publisher-place": "New York",
    };

    const result = cslToZoteroItem(csl);
    expect(result.itemType).toBe("book");
    expect(result.publisher).toBe("Test Publisher");
    expect(result.place).toBe("New York");
  });

  it("defaults unknown type to journalArticle", () => {
    const csl: CslItemData = {
      type: "unknown-type",
      title: "Mystery Item",
    };

    const result = cslToZoteroItem(csl);
    expect(result.itemType).toBe("journalArticle");
  });

  it("adds collectionKey and tags when specified", () => {
    const csl: CslItemData = {
      type: "article-journal",
      title: "Tagged Paper",
    };

    const result = cslToZoteroItem(csl, {
      collectionKey: "COL001",
      tags: ["ai", "nlp"],
    });
    expect(result.collections).toEqual(["COL001"]);
    expect(result.tags).toEqual([{ tag: "ai" }, { tag: "nlp" }]);
  });

  it("handles missing optional fields gracefully", () => {
    const csl: CslItemData = {
      type: "article-journal",
    };

    const result = cslToZoteroItem(csl);
    expect(result.title).toBe("");
    expect(result.creators).toEqual([]);
    expect(result.date).toBe("");
    expect(result.DOI).toBe("");
    expect(result.publicationTitle).toBe("");
  });
});
