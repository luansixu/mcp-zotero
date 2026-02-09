import { logger } from "./logger.js";

export interface UnpaywallOaLocation {
  url_for_pdf: string | null;
  url: string | null;
  host_type: "publisher" | "repository";
  license: string | null;
  version: "publishedVersion" | "acceptedVersion" | "submittedVersion";
}

export interface UnpaywallResult {
  doi: string;
  is_oa: boolean;
  oa_status: "gold" | "green" | "hybrid" | "bronze" | "closed";
  best_oa_location: UnpaywallOaLocation | null;
  oa_locations: UnpaywallOaLocation[];
}

export interface OaPdfLookupResult {
  found: boolean;
  pdf_url: string | null;
  landing_url?: string | null;
  source: string | null;
  license: string | null;
  oa_status: string | null;
  warning?: string;
}

const SKIPPED_RESULT: OaPdfLookupResult = {
  found: false,
  pdf_url: null,
  source: null,
  license: null,
  oa_status: null,
  warning: "UNPAYWALL_EMAIL environment variable is not set or invalid. Set it to a valid email address to enable OA PDF lookup.",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Look up open-access PDF availability for a DOI via the Unpaywall API.
 * Uses the same data source as Zotero Desktop's "Find Available PDFs".
 */
export async function lookupOaPdf(doi: string): Promise<OaPdfLookupResult> {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!email || !isValidEmail(email)) {
    logger.warn("Unpaywall lookup skipped: UNPAYWALL_EMAIL not set or invalid");
    return SKIPPED_RESULT;
  }
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error("Unpaywall API network error", { doi, error: detail });
    return { found: false, pdf_url: null, source: null, license: null, oa_status: null };
  }

  if (!response.ok) {
    logger.error("Unpaywall API error", { doi, status: response.status });
    return { found: false, pdf_url: null, source: null, license: null, oa_status: null };
  }

  const data = (await response.json()) as UnpaywallResult;

  if (!data.is_oa || !data.best_oa_location?.url_for_pdf) {
    return {
      found: false,
      pdf_url: null,
      landing_url: data.is_oa ? (data.best_oa_location?.url ?? null) : null,
      source: null,
      license: data.best_oa_location?.license ?? null,
      oa_status: data.oa_status ?? null,
    };
  }

  const loc = data.best_oa_location;
  const source = `unpaywall_${loc.host_type === "repository" ? "green" : data.oa_status}`;

  return {
    found: true,
    pdf_url: loc.url_for_pdf,
    source,
    license: loc.license,
    oa_status: data.oa_status,
  };
}

/**
 * Return all OA locations with PDF URLs for fallback logic.
 */
export async function lookupOaPdfWithFallbacks(doi: string): Promise<{
  primary: OaPdfLookupResult;
  fallback_urls: string[];
}> {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!email || !isValidEmail(email)) {
    logger.warn("Unpaywall lookup skipped: UNPAYWALL_EMAIL not set or invalid");
    return { primary: SKIPPED_RESULT, fallback_urls: [] };
  }
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error("Unpaywall API network error", { doi, error: detail });
    return {
      primary: { found: false, pdf_url: null, source: null, license: null, oa_status: null },
      fallback_urls: [],
    };
  }

  if (!response.ok) {
    logger.error("Unpaywall API error", { doi, status: response.status });
    return {
      primary: { found: false, pdf_url: null, source: null, license: null, oa_status: null },
      fallback_urls: [],
    };
  }

  const data = (await response.json()) as UnpaywallResult;

  if (!data.is_oa || !data.best_oa_location?.url_for_pdf) {
    return {
      primary: {
        found: false,
        pdf_url: null,
        landing_url: data.is_oa ? (data.best_oa_location?.url ?? null) : null,
        source: null,
        license: data.best_oa_location?.license ?? null,
        oa_status: data.oa_status ?? null,
      },
      fallback_urls: [],
    };
  }

  const loc = data.best_oa_location;
  const source = `unpaywall_${loc.host_type === "repository" ? "green" : data.oa_status}`;

  const primary: OaPdfLookupResult = {
    found: true,
    pdf_url: loc.url_for_pdf,
    source,
    license: loc.license,
    oa_status: data.oa_status,
  };

  // Collect fallback URLs from other locations (excluding the primary)
  const fallback_urls = data.oa_locations
    .filter((l) => l.url_for_pdf && l.url_for_pdf !== loc.url_for_pdf)
    .map((l) => l.url_for_pdf as string);

  return { primary, fallback_urls };
}
