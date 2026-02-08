import { CslItemData } from "../types/csl-types.js";

export async function resolveDoi(doi: string): Promise<CslItemData> {
  const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
    headers: {
      Accept: "application/vnd.citationstyles.csl+json",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `DOI resolution failed for ${doi}: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as CslItemData;
}

export interface DoiResolutionResult {
  success: Array<{ doi: string; data: CslItemData }>;
  failed: Array<{ doi: string; error: string }>;
}

export async function resolveDois(
  dois: string[]
): Promise<DoiResolutionResult> {
  const result: DoiResolutionResult = { success: [], failed: [] };

  for (const doi of dois) {
    try {
      const data = await resolveDoi(doi);
      result.success.push({ doi, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.failed.push({ doi, error: message });
    }
  }

  return result;
}
