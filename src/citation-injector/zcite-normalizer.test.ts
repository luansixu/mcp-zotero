import { describe, it, expect } from "vitest";
import { normalizeZciteTags } from "./zcite-normalizer.js";

describe("normalizeZciteTags", () => {
  it("returns unchanged when no zcite present", () => {
    const xml =
      '<w:body><w:p><w:r><w:t>Plain text</w:t></w:r></w:p></w:body>';
    expect(normalizeZciteTags(xml)).toBe(xml);
  });

  it("returns unchanged for single-run complete zcite", () => {
    const xml = [
      "<w:body><w:p>",
      '<w:r><w:t>&lt;zcite keys=&quot;ABC001&quot;/&gt;</w:t></w:r>',
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    // The original string should be returned (identity) since no split was found
    expect(result).toBe(xml);
  });

  it("merges a zcite split across 2 runs", () => {
    const xml = [
      "<w:body><w:p>",
      "<w:r><w:t>&lt;zcite keys=&quot;AB</w:t></w:r>",
      "<w:r><w:t>C001&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    // After normalization, the merged run should contain the full zcite tag
    expect(result).toContain('&lt;zcite keys=&quot;ABC001&quot;/&gt;');
    // Should be in a single w:t now
    expect(result).not.toContain("<w:r><w:t>&lt;zcite keys=&quot;AB</w:t></w:r>");
  });

  it("merges a zcite split across 3 runs", () => {
    const xml = [
      "<w:body><w:p>",
      "<w:r><w:t>&lt;zcite </w:t></w:r>",
      '<w:r><w:t>keys=&quot;ABC</w:t></w:r>',
      "<w:r><w:t>001&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    expect(result).toContain('&lt;zcite keys=&quot;ABC001&quot;/&gt;');
  });

  it("preserves w:rPr from the first run when merging", () => {
    const xml = [
      "<w:body><w:p>",
      "<w:r><w:rPr><w:lang w:val=\"it-IT\"/></w:rPr><w:t>&lt;zcite keys=&quot;AB</w:t></w:r>",
      "<w:r><w:t>C001&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    expect(result).toContain('&lt;zcite keys=&quot;ABC001&quot;/&gt;');
    // The merged run should preserve the w:rPr from the first run
    expect(result).toContain("w:lang");
  });

  it("preserves text before zcite in first run", () => {
    const xml = [
      "<w:body><w:p>",
      "<w:r><w:t>Before &lt;zcite keys=&quot;AB</w:t></w:r>",
      "<w:r><w:t>C001&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    expect(result).toContain("Before ");
    expect(result).toContain('&lt;zcite keys=&quot;ABC001&quot;/&gt;');
  });

  it("preserves text after zcite in last run", () => {
    const xml = [
      "<w:body><w:p>",
      "<w:r><w:t>&lt;zcite keys=&quot;AB</w:t></w:r>",
      "<w:r><w:t>C001&quot;/&gt; after</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    expect(result).toContain(" after");
    expect(result).toContain('&lt;zcite keys=&quot;ABC001&quot;/&gt;');
  });

  it("only merges the split zcite, leaves non-split one alone", () => {
    const xml = [
      "<w:body><w:p>",
      '<w:r><w:t>&lt;zcite keys=&quot;XYZ999&quot;/&gt;</w:t></w:r>',
      "<w:r><w:t>&lt;zcite keys=&quot;AB</w:t></w:r>",
      "<w:r><w:t>C001&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    expect(result).toContain('&lt;zcite keys=&quot;XYZ999&quot;/&gt;');
    expect(result).toContain('&lt;zcite keys=&quot;ABC001&quot;/&gt;');
  });

  it("does not merge runs separated by non-w:r elements", () => {
    const xml = [
      "<w:body><w:p>",
      "<w:r><w:t>&lt;zcite keys=&quot;AB</w:t></w:r>",
      '<w:bookmarkStart w:id="0" w:name="_GoBack"/>',
      "<w:r><w:t>C001&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    // Should return unchanged since the bookmark breaks the consecutive group
    expect(result).toBe(xml);
  });

  it("treats w:r with no w:t as group-breaker", () => {
    const xml = [
      "<w:body><w:p>",
      "<w:r><w:t>&lt;zcite keys=&quot;AB</w:t></w:r>",
      '<w:r><w:fldChar w:fldCharType="begin"/></w:r>',
      "<w:r><w:t>C001&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    // The field char run breaks the group, so no merge
    expect(result).toBe(xml);
  });

  it("returns original string identity when no modifications made", () => {
    const xml = [
      "<w:body><w:p>",
      '<w:r><w:t>Text mentioning zcite but no actual tag</w:t></w:r>',
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    // Since there is no split to merge, should return exact same string
    expect(result).toBe(xml);
  });

  it("handles multiple paragraphs with splits in different ones", () => {
    const xml = [
      "<w:body>",
      "<w:p>",
      "<w:r><w:t>&lt;zcite keys=&quot;AA</w:t></w:r>",
      "<w:r><w:t>A001&quot;/&gt;</w:t></w:r>",
      "</w:p>",
      "<w:p>",
      "<w:r><w:t>&lt;zcite keys=&quot;BB</w:t></w:r>",
      "<w:r><w:t>B002&quot;/&gt;</w:t></w:r>",
      "</w:p>",
      "</w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    expect(result).toContain('&lt;zcite keys=&quot;AAA001&quot;/&gt;');
    expect(result).toContain('&lt;zcite keys=&quot;BBB002&quot;/&gt;');
  });

  it("handles zcite with multiple attributes split across runs", () => {
    const xml = [
      "<w:body><w:p>",
      '<w:r><w:t>&lt;zcite keys=&quot;ABC001&quot; locator=&quot;pp.</w:t></w:r>',
      "<w:r><w:t> 12-15&quot;/&gt;</w:t></w:r>",
      "</w:p></w:body>",
    ].join("");
    const result = normalizeZciteTags(xml);
    expect(result).toContain("keys=&quot;ABC001&quot;");
    expect(result).toContain("locator=&quot;pp. 12-15&quot;");
  });
});
