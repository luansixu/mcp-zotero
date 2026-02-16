export type UnsafeOperationsMode = "none" | "collections" | "items" | "both";

const VALID_MODES = new Set<string>(["none", "collections", "items", "both"]);

export function parseUnsafeOperations(value: string | undefined): UnsafeOperationsMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (VALID_MODES.has(normalized)) {
    return normalized as UnsafeOperationsMode;
  }
  return "none";
}

export function canDeleteCollections(mode: UnsafeOperationsMode): boolean {
  return mode === "collections" || mode === "both";
}

export function canDeleteItems(mode: UnsafeOperationsMode): boolean {
  return mode === "items" || mode === "both";
}
