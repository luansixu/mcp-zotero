import { ZoteroItemData, ZoteroResponse } from "../types/zotero-types.js";

const PAGE_LIMIT = 100;

export interface PaginatedResult {
  items: ZoteroItemData[];
  totalResults: number | null;
}

export async function fetchAllPages(
  buildRequest: (params: Record<string, unknown>) => Promise<ZoteroResponse>
): Promise<PaginatedResult> {
  const firstResponse = await buildRequest({ limit: PAGE_LIMIT, start: 0 });
  const firstData = firstResponse.getData();
  const firstItems: ZoteroItemData[] = Array.isArray(firstData) ? firstData : firstData ? [firstData] : [];

  const totalResults = firstResponse.getTotalResults();

  if (totalResults === null || firstItems.length >= totalResults) {
    return { items: firstItems, totalResults };
  }

  const allItems: ZoteroItemData[] = [...firstItems];

  let start = firstItems.length;
  while (start < totalResults) {
    const response = await buildRequest({ limit: PAGE_LIMIT, start });
    const data = response.getData();
    const pageItems: ZoteroItemData[] = Array.isArray(data) ? data : data ? [data] : [];

    if (pageItems.length === 0) break;

    allItems.push(...pageItems);
    start += pageItems.length;
  }

  return { items: allItems, totalResults };
}
