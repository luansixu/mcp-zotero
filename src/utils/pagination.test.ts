import { describe, it, expect, vi } from "vitest";
import { fetchAllPages } from "./pagination.js";
import { ZoteroItemData, ZoteroResponse } from "../types/zotero-types.js";

function mockResponse(items: ZoteroItemData[], total: number | null): ZoteroResponse {
  return {
    getData: () => items,
    getVersion: () => 1,
    getTotalResults: () => total,
  };
}

describe("fetchAllPages", () => {
  it("returns all items in a single page when total <= 100", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ key: `K${i}` }));
    const buildRequest = vi.fn().mockResolvedValue(mockResponse(items, 5));

    const result = await fetchAllPages(buildRequest);

    expect(result.items).toHaveLength(5);
    expect(result.totalResults).toBe(5);
    expect(buildRequest).toHaveBeenCalledTimes(1);
    expect(buildRequest).toHaveBeenCalledWith({ limit: 100, start: 0 });
  });

  it("paginates across multiple pages (total=150)", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ key: `P1_${i}` }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ key: `P2_${i}` }));

    const buildRequest = vi.fn()
      .mockResolvedValueOnce(mockResponse(page1, 150))
      .mockResolvedValueOnce(mockResponse(page2, 150));

    const result = await fetchAllPages(buildRequest);

    expect(result.items).toHaveLength(150);
    expect(result.totalResults).toBe(150);
    expect(buildRequest).toHaveBeenCalledTimes(2);
    expect(buildRequest).toHaveBeenCalledWith({ limit: 100, start: 0 });
    expect(buildRequest).toHaveBeenCalledWith({ limit: 100, start: 100 });
  });

  it("returns empty array when total is 0", async () => {
    const buildRequest = vi.fn().mockResolvedValue(mockResponse([], 0));

    const result = await fetchAllPages(buildRequest);

    expect(result.items).toHaveLength(0);
    expect(result.totalResults).toBe(0);
    expect(buildRequest).toHaveBeenCalledTimes(1);
  });

  it("breaks on empty page mid-pagination (safety)", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ key: `K${i}` }));

    const buildRequest = vi.fn()
      .mockResolvedValueOnce(mockResponse(page1, 300))
      .mockResolvedValueOnce(mockResponse([], 300));

    const result = await fetchAllPages(buildRequest);

    expect(result.items).toHaveLength(100);
    expect(buildRequest).toHaveBeenCalledTimes(2);
  });

  it("returns first page only when getTotalResults() is null", async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ key: `K${i}` }));
    const buildRequest = vi.fn().mockResolvedValue(mockResponse(items, null));

    const result = await fetchAllPages(buildRequest);

    expect(result.items).toHaveLength(25);
    expect(result.totalResults).toBeNull();
    expect(buildRequest).toHaveBeenCalledTimes(1);
  });
});
