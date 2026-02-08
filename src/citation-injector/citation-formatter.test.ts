import { describe, it, expect } from "vitest";
import { formatCitationText } from "./citation-formatter.js";
import { CslItemData } from "../types/csl-types.js";

const singleAuthor: CslItemData = {
  type: "article-journal",
  author: [{ family: "Smith", given: "John" }],
  issued: { "date-parts": [["2023"]] },
};

const twoAuthors: CslItemData = {
  type: "article-journal",
  author: [
    { family: "Smith", given: "John" },
    { family: "Doe", given: "Jane" },
  ],
  issued: { "date-parts": [["2023"]] },
};

const threeAuthors: CslItemData = {
  type: "article-journal",
  author: [
    { family: "Smith", given: "John" },
    { family: "Doe", given: "Jane" },
    { family: "Brown", given: "Bob" },
  ],
  issued: { "date-parts": [["2023"]] },
};

describe("formatCitationText", () => {
  it("APA: single author → (Smith, 2023)", () => {
    expect(formatCitationText([singleAuthor], "apa")).toBe("(Smith, 2023)");
  });

  it("APA: two authors → (Smith & Doe, 2023)", () => {
    expect(formatCitationText([twoAuthors], "apa")).toBe(
      "(Smith & Doe, 2023)"
    );
  });

  it("APA: three+ authors → (Smith et al., 2023)", () => {
    expect(formatCitationText([threeAuthors], "apa")).toBe(
      "(Smith et al., 2023)"
    );
  });

  it("APA: multiple items → (Smith, 2023; Doe & Brown, ...)", () => {
    const item2: CslItemData = {
      type: "article-journal",
      author: [
        { family: "Doe", given: "Jane" },
        { family: "Brown", given: "Bob" },
      ],
      issued: { "date-parts": [["2024"]] },
    };
    expect(formatCitationText([singleAuthor, item2], "apa")).toBe(
      "(Smith, 2023; Doe & Brown, 2024)"
    );
  });

  it("IEEE → [?]", () => {
    expect(formatCitationText([singleAuthor], "ieee")).toBe("[?]");
  });

  it("Vancouver → [?]", () => {
    expect(formatCitationText([singleAuthor], "vancouver")).toBe("[?]");
  });

  it("missing author with title → uses abbreviated title", () => {
    const noAuthorWithTitle: CslItemData = {
      type: "article-journal",
      title: "A Short Title",
      issued: { "date-parts": [["2023"]] },
    };
    expect(formatCitationText([noAuthorWithTitle], "apa")).toBe(
      '("A Short Title", 2023)'
    );
  });

  it("missing author with long title → truncates at 30 chars", () => {
    const longTitle: CslItemData = {
      type: "article-journal",
      title: "A Very Long Title That Exceeds Thirty Characters Easily",
      issued: { "date-parts": [["2023"]] },
    };
    expect(formatCitationText([longTitle], "apa")).toBe(
      '("A Very Long Title That Exceeds...", 2023)'
    );
  });

  it("missing author and title → (Unknown, n.d.)", () => {
    const noAuthorDate: CslItemData = { type: "article-journal" };
    expect(formatCitationText([noAuthorDate], "apa")).toBe("(Unknown, n.d.)");
  });

  it('IEEE with num="1" → [1]', () => {
    expect(formatCitationText([singleAuthor], "ieee", "1")).toBe("[1]");
  });

  it('Vancouver with num="3" → [3]', () => {
    expect(formatCitationText([singleAuthor], "vancouver", "3")).toBe("[3]");
  });

  it("IEEE without num → [?]", () => {
    expect(formatCitationText([singleAuthor], "ieee")).toBe("[?]");
  });

  it("APA with num → ignores num, returns author-year", () => {
    expect(formatCitationText([singleAuthor], "apa", "1")).toBe(
      "(Smith, 2023)"
    );
  });
});
