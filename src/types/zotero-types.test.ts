import { describe, it, expect } from "vitest";
import { isZoteroApiError } from "./zotero-types.js";

describe("isZoteroApiError", () => {
  it("returns true for Error with response.status", () => {
    const err = new Error("Not found") as Error & { response: { status: number } };
    err.response = { status: 404 };
    expect(isZoteroApiError(err)).toBe(true);
  });

  it("returns false for plain Error without response", () => {
    const err = new Error("Something went wrong");
    expect(isZoteroApiError(err)).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isZoteroApiError("string error")).toBe(false);
    expect(isZoteroApiError(null)).toBe(false);
    expect(isZoteroApiError({ response: { status: 500 } })).toBe(false);
  });
});
