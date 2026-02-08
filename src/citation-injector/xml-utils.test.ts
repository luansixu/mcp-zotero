import { describe, it, expect } from "vitest";
import { escapeXml, regexEscape } from "./xml-utils.js";

describe("escapeXml", () => {
  it("escapes ampersand", () => {
    expect(escapeXml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeXml("a < b")).toBe("a &lt; b");
  });

  it("escapes greater-than", () => {
    expect(escapeXml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeXml('key="value"')).toBe("key=&quot;value&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("escapes all special chars together", () => {
    expect(escapeXml('<a href="x">&\'test\'')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&apos;test&apos;"
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });
});

describe("regexEscape", () => {
  it("escapes regex metacharacters", () => {
    expect(regexEscape("a.b*c+d")).toBe("a\\.b\\*c\\+d");
  });

  it("escapes brackets and parentheses", () => {
    expect(regexEscape("[a](b){c}")).toBe("\\[a\\]\\(b\\)\\{c\\}");
  });

  it("escapes backslash, caret, dollar, pipe, question mark", () => {
    expect(regexEscape("\\^$|?")).toBe("\\\\\\^\\$\\|\\?");
  });

  it("leaves plain text unchanged", () => {
    expect(regexEscape("hello")).toBe("hello");
  });
});
