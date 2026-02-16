import { describe, it, expect } from "vitest";
import {
  ZOTERO_ITEM_TYPES,
  ITEM_TYPE_FIELDS,
  ITEM_TYPE_CREATOR_TYPES,
  TITLE_FIELD_NAME,
  ZoteroItemType,
} from "./zotero-item-types.js";

describe("ZOTERO_ITEM_TYPES", () => {
  it("contains 37 item types", () => {
    expect(ZOTERO_ITEM_TYPES).toHaveLength(37);
  });

  it("has no duplicates", () => {
    const unique = new Set(ZOTERO_ITEM_TYPES);
    expect(unique.size).toBe(ZOTERO_ITEM_TYPES.length);
  });

  it("is sorted alphabetically", () => {
    const sorted = [...ZOTERO_ITEM_TYPES].sort();
    expect(ZOTERO_ITEM_TYPES).toEqual(sorted);
  });
});

describe("ITEM_TYPE_FIELDS", () => {
  it("has an entry for every item type", () => {
    for (const itemType of ZOTERO_ITEM_TYPES) {
      expect(ITEM_TYPE_FIELDS[itemType]).toBeDefined();
      expect(ITEM_TYPE_FIELDS[itemType].size).toBeGreaterThan(0);
    }
  });

  it("all standard types have 'title' in their fields", () => {
    const typesWithoutTitle = ["case", "email", "statute"] as const;
    for (const itemType of ZOTERO_ITEM_TYPES) {
      if (typesWithoutTitle.includes(itemType as typeof typesWithoutTitle[number])) {
        expect(ITEM_TYPE_FIELDS[itemType].has("title")).toBe(false);
      } else {
        expect(ITEM_TYPE_FIELDS[itemType].has("title")).toBe(true);
      }
    }
  });

  it("case has caseName, email has subject, statute has nameOfAct", () => {
    expect(ITEM_TYPE_FIELDS["case"].has("caseName")).toBe(true);
    expect(ITEM_TYPE_FIELDS["email"].has("subject")).toBe(true);
    expect(ITEM_TYPE_FIELDS["statute"].has("nameOfAct")).toBe(true);
  });

  it("common fields are present where expected", () => {
    // DOI should be in all types
    for (const itemType of ZOTERO_ITEM_TYPES) {
      expect(ITEM_TYPE_FIELDS[itemType].has("DOI")).toBe(true);
    }
    // ISBN in book, bookSection
    expect(ITEM_TYPE_FIELDS["book"].has("ISBN")).toBe(true);
    expect(ITEM_TYPE_FIELDS["bookSection"].has("ISBN")).toBe(true);
    // ISSN in journalArticle
    expect(ITEM_TYPE_FIELDS["journalArticle"].has("ISSN")).toBe(true);
    // thesisType in thesis
    expect(ITEM_TYPE_FIELDS["thesis"].has("thesisType")).toBe(true);
  });
});

describe("ITEM_TYPE_CREATOR_TYPES", () => {
  it("has an entry for every item type", () => {
    for (const itemType of ZOTERO_ITEM_TYPES) {
      expect(ITEM_TYPE_CREATOR_TYPES[itemType]).toBeDefined();
      expect(ITEM_TYPE_CREATOR_TYPES[itemType].size).toBeGreaterThan(0);
    }
  });

  it("all types have at least one creator type", () => {
    for (const itemType of ZOTERO_ITEM_TYPES) {
      expect(ITEM_TYPE_CREATOR_TYPES[itemType].size).toBeGreaterThanOrEqual(1);
    }
  });

  it("most types accept 'contributor'", () => {
    for (const itemType of ZOTERO_ITEM_TYPES) {
      expect(ITEM_TYPE_CREATOR_TYPES[itemType].has("contributor")).toBe(true);
    }
  });

  it("type-specific primary creators are correct", () => {
    expect(ITEM_TYPE_CREATOR_TYPES["artwork"].has("artist")).toBe(true);
    expect(ITEM_TYPE_CREATOR_TYPES["film"].has("director")).toBe(true);
    expect(ITEM_TYPE_CREATOR_TYPES["patent"].has("inventor")).toBe(true);
    expect(ITEM_TYPE_CREATOR_TYPES["computerProgram"].has("programmer")).toBe(true);
    expect(ITEM_TYPE_CREATOR_TYPES["map"].has("cartographer")).toBe(true);
    expect(ITEM_TYPE_CREATOR_TYPES["podcast"].has("podcaster")).toBe(true);
    expect(ITEM_TYPE_CREATOR_TYPES["presentation"].has("presenter")).toBe(true);
  });
});

describe("TITLE_FIELD_NAME", () => {
  it("maps case → caseName", () => {
    expect(TITLE_FIELD_NAME["case"]).toBe("caseName");
  });

  it("maps email → subject", () => {
    expect(TITLE_FIELD_NAME["email"]).toBe("subject");
  });

  it("maps statute → nameOfAct", () => {
    expect(TITLE_FIELD_NAME["statute"]).toBe("nameOfAct");
  });

  it("does not map standard types", () => {
    const standardTypes: ZoteroItemType[] = ["book", "journalArticle", "thesis", "webpage"];
    for (const t of standardTypes) {
      expect(TITLE_FIELD_NAME[t]).toBeUndefined();
    }
  });
});
