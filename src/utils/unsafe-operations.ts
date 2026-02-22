export type UnsafeOperationsMode = "none" | "items" | "all";

const VALID_MODES = new Set<string>(["none", "items", "all"]);

export function parseUnsafeOperations(value: string | undefined): UnsafeOperationsMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (VALID_MODES.has(normalized)) {
    return normalized as UnsafeOperationsMode;
  }
  return "none";
}

export function canDeleteCollections(mode: UnsafeOperationsMode): boolean {
  return mode === "all";
}

export function canDeleteItems(mode: UnsafeOperationsMode): boolean {
  return mode === "items" || mode === "all";
}
