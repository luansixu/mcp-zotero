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

  it("missing author/date → (Unknown, n.d.)", () => {
    const noAuthorDate: CslItemData = { type: "article-journal" };
    expect(formatCitationText([noAuthorDate], "apa")).toBe("(Unknown, n.d.)");
  });
});
