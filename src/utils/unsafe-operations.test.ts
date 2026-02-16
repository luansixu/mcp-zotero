import { describe, it, expect } from "vitest";
import { parseUnsafeOperations, canDeleteCollections, canDeleteItems } from "./unsafe-operations.js";

describe("parseUnsafeOperations", () => {
  it("returns 'none' for undefined", () => {
    expect(parseUnsafeOperations(undefined)).toBe("none");
  });

  it("returns 'none' for empty string", () => {
    expect(parseUnsafeOperations("")).toBe("none");
  });

  it("returns 'none' for invalid value", () => {
    expect(parseUnsafeOperations("delete_all")).toBe("none");
  });

  it("parses 'collections'", () => {
    expect(parseUnsafeOperations("collections")).toBe("collections");
  });

  it("parses 'items'", () => {
    expect(parseUnsafeOperations("items")).toBe("items");
  });

  it("parses 'both'", () => {
    expect(parseUnsafeOperations("both")).toBe("both");
  });

  it("parses 'none' explicitly", () => {
    expect(parseUnsafeOperations("none")).toBe("none");
  });

  it("is case-insensitive", () => {
    expect(parseUnsafeOperations("BOTH")).toBe("both");
    expect(parseUnsafeOperations("Collections")).toBe("collections");
    expect(parseUnsafeOperations("ITEMS")).toBe("items");
  });

  it("trims whitespace", () => {
    expect(parseUnsafeOperations("  both  ")).toBe("both");
    expect(parseUnsafeOperations("\titems\n")).toBe("items");
  });
});

describe("canDeleteCollections", () => {
  it("returns true for 'collections'", () => {
    expect(canDeleteCollections("collections")).toBe(true);
  });

  it("returns true for 'both'", () => {
    expect(canDeleteCollections("both")).toBe(true);
  });

  it("returns false for 'none'", () => {
    expect(canDeleteCollections("none")).toBe(false);
  });

  it("returns false for 'items'", () => {
    expect(canDeleteCollections("items")).toBe(false);
  });
});

describe("canDeleteItems", () => {
  it("returns true for 'items'", () => {
    expect(canDeleteItems("items")).toBe(true);
  });

  it("returns true for 'both'", () => {
    expect(canDeleteItems("both")).toBe(true);
  });

  it("returns false for 'none'", () => {
    expect(canDeleteItems("none")).toBe(false);
  });

  it("returns false for 'collections'", () => {
    expect(canDeleteItems("collections")).toBe(false);
  });
});
