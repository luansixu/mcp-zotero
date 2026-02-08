import { CslItemData } from "../types/csl-types.js";

const CSL_TO_ZOTERO_TYPE: Record<string, string> = {
  "article-journal": "journalArticle",
  book: "book",
  chapter: "bookSection",
  "paper-conference": "conferencePaper",
  report: "report",
  thesis: "thesis",
  webpage: "webpage",
  dataset: "document",
  article: "journalArticle",
};

interface ZoteroItemPayload {
  itemType: string;
  title: string;
  creators: Array<{
    firstName: string;
    lastName: string;
    creatorType: string;
  }>;
  date: string;
  DOI: string;
  publicationTitle: string;
  volume: string;
  issue: string;
  pages: string;
  publisher: string;
  place: string;
  url: string;
  abstractNote: string;
  collections: string[];
  tags: Array<{ tag: string }>;
}

export interface CslToZoteroOptions {
  collectionKey?: string;
  tags?: string[];
}

export function cslToZoteroItem(
  csl: CslItemData,
  options?: CslToZoteroOptions
): ZoteroItemPayload {
  const creators = (csl.author ?? []).map((a) => ({
    firstName: a.given ?? "",
    lastName: a.family ?? a.literal ?? "",
    creatorType: "author",
  }));

  const dateParts = csl.issued?.["date-parts"]?.[0];
  const date = dateParts ? dateParts.join("-") : csl.issued?.literal ?? csl.issued?.raw ?? "";

  const collections: string[] = [];
  if (options?.collectionKey) {
    collections.push(options.collectionKey);
  }

  const tags = (options?.tags ?? []).map((t) => ({ tag: t }));

  return {
    itemType: CSL_TO_ZOTERO_TYPE[csl.type] ?? "journalArticle",
    title: csl.title ?? "",
    creators,
    date,
    DOI: csl.DOI ?? "",
    publicationTitle: csl["container-title"] ?? "",
    volume: csl.volume ?? "",
    issue: csl.issue ?? "",
    pages: csl.page ?? "",
    publisher: csl.publisher ?? "",
    place: csl["publisher-place"] ?? "",
    url: csl.URL ?? "",
    abstractNote: csl.abstract ?? "",
    collections,
    tags,
  };
}
