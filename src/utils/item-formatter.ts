import { ZoteroCreator, ZoteroTag } from "../types/zotero-types.js";

export function formatCreators(creators?: ZoteroCreator[]): string {
  return (
    creators
      ?.map((c) => `${c.firstName || ""} ${c.lastName || ""}`.trim())
      .filter(Boolean)
      .join(", ") || "No authors listed"
  );
}

export function formatTags(tags?: ZoteroTag[]): string[] {
  return tags?.map((t) => t.tag).filter(Boolean) || [];
}
