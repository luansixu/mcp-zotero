interface FulltextPutResult {
  success: boolean;
  error?: string;
}

export async function putFulltext(
  userId: string,
  itemKey: string,
  apiKey: string,
  content: string,
  totalPages: number
): Promise<FulltextPutResult> {
  const url = `https://api.zotero.org/users/${userId}/items/${itemKey}/fulltext`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Zotero-API-Key": apiKey,
    },
    body: JSON.stringify({
      content,
      indexedPages: totalPages,
      totalPages,
    }),
  });

  if (response.status === 204) {
    return { success: true };
  }

  return {
    success: false,
    error: `Fulltext PUT failed with status ${response.status}`,
  };
}
