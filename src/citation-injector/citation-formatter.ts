import { CslItemData } from "../types/csl-types.js";

export function formatCitationText(
  items: CslItemData[],
  style: string,
  num?: string
): string {
  if (style === "ieee" || style === "vancouver") {
    return num ? `[${num}]` : "[?]";
  }

  const parts = items.map((item) => {
    const authors = item.author;
    const firstAuthor = authors?.[0]?.family ?? "Unknown";
    const year =
      item.issued?.["date-parts"]?.[0]?.[0]?.toString() ?? "n.d.";

    let authorText: string;
    if (!authors || authors.length === 0) {
      const title = item.title;
      authorText = title
        ? title.length > 30
          ? `"${title.substring(0, 30)}..."`
          : `"${title}"`
        : "Unknown";
    } else if (authors.length > 2) {
      authorText = `${firstAuthor} et al.`;
    } else if (authors.length === 2) {
      authorText = `${firstAuthor} & ${authors[1].family}`;
    } else {
      authorText = firstAuthor;
    }

    return `${authorText}, ${year}`;
  });

  return `(${parts.join("; ")})`;
}
