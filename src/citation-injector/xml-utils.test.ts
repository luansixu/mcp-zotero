import { describe, it, expect } from "vitest";
import { escapeXml, unescapeXml, regexEscape } from "./xml-utils.js";

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

describe("unescapeXml", () => {
  it("unescapes &lt;", () => {
    expect(unescapeXml("a &lt; b")).toBe("a < b");
  });

  it("unescapes &gt;", () => {
    expect(unescapeXml("a &gt; b")).toBe("a > b");
  });

  it("unescapes &quot;", () => {
    expect(unescapeXml("key=&quot;value&quot;")).toBe('key="value"');
  });

  it("unescapes &apos;", () => {
    expect(unescapeXml("it&apos;s")).toBe("it's");
  });

  it("unescapes &amp;", () => {
    expect(unescapeXml("a &amp; b")).toBe("a & b");
  });

  it("unescapes all entities together", () => {
    expect(
      unescapeXml("&lt;a href=&quot;x&quot;&gt;&amp;&apos;test&apos;")
    ).toBe('<a href="x">&\'test\'');
  });

  it("leaves plain text unchanged", () => {
    expect(unescapeXml("hello world")).toBe("hello world");
  });

  it("does not double-unescape (&amp;lt; → &lt;, not <)", () => {
    expect(unescapeXml("&amp;lt;")).toBe("&lt;");
  });

  it("round-trips with escapeXml", () => {
    const original = '<tag attr="value">&\'test\'';
    expect(unescapeXml(escapeXml(original))).toBe(original);
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
