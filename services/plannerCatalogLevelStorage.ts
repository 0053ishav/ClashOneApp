import { storage } from "@/storage/mmkv";

function storageKey(accountTag: string): string {
  return `planner_catalog_levels_${encodeURIComponent(accountTag.trim())}`;
}

/**
 * Per-account last-known levels entered through the catalog. Imported village
 * levels should be merged over these values by the caller because imports are
 * the fresher source of truth.
 */
export function loadPlannerCatalogLevelOverrides(
  accountTag: string,
): Record<string, number> {
  if (!accountTag.trim()) throw new Error("INVALID_ACCOUNT_TAG");
  const raw = storage.getString(storageKey(accountTag));
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const valid: Record<string, number> = {};
  for (const [entityId, level] of Object.entries(parsed)) {
    if (entityId.trim() && Number.isSafeInteger(level) && typeof level === "number" && level >= 0) {
      valid[entityId] = level;
    }
  }
  return valid;
}

export function savePlannerCatalogLevelOverrides(
  accountTag: string,
  levels: Readonly<Record<string, number>>,
): void {
  if (!accountTag.trim()) throw new Error("INVALID_ACCOUNT_TAG");
  const valid: Record<string, number> = {};
  for (const [entityId, level] of Object.entries(levels)) {
    if (entityId.trim() && Number.isSafeInteger(level) && level >= 0) {
      valid[entityId] = level;
    }
  }
  storage.set(storageKey(accountTag), JSON.stringify(valid));
}
