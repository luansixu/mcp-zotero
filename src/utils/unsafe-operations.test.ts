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

  it("returns 'none' for removed 'collections' value", () => {
    expect(parseUnsafeOperations("collections")).toBe("none");
  });

  it("returns 'none' for removed 'both' value", () => {
    expect(parseUnsafeOperations("both")).toBe("none");
  });

  it("parses 'items'", () => {
    expect(parseUnsafeOperations("items")).toBe("items");
  });

  it("parses 'all'", () => {
    expect(parseUnsafeOperations("all")).toBe("all");
  });

  it("parses 'none' explicitly", () => {
    expect(parseUnsafeOperations("none")).toBe("none");
  });

  it("is case-insensitive", () => {
    expect(parseUnsafeOperations("ALL")).toBe("all");
    expect(parseUnsafeOperations("Items")).toBe("items");
    expect(parseUnsafeOperations("NONE")).toBe("none");
  });

  it("trims whitespace", () => {
    expect(parseUnsafeOperations("  all  ")).toBe("all");
    expect(parseUnsafeOperations("\titems\n")).toBe("items");
  });
});

describe("canDeleteCollections", () => {
  it("returns true for 'all'", () => {
    expect(canDeleteCollections("all")).toBe(true);
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

  it("returns true for 'all'", () => {
    expect(canDeleteItems("all")).toBe(true);
  });

  it("returns false for 'none'", () => {
    expect(canDeleteItems("none")).toBe(false);
  });
});
