/**
 * Resolves account levels from the latest imported snapshot and user-entered
 * fallback values. Imported data is authoritative for matching entity IDs.
 */
export interface PlannerCatalogLevelState {
  currentLevels: Record<string, number>;
  manualOverrides: Record<string, number>;
}

export function resolvePlannerCatalogLevelState(
  savedOverrides: Readonly<Record<string, number>>,
  importedLevels: Readonly<Record<string, number>>,
): PlannerCatalogLevelState {
  const manualOverrides: Record<string, number> = {};
  for (const [entityId, level] of Object.entries(savedOverrides)) {
    if (!Object.prototype.hasOwnProperty.call(importedLevels, entityId)) {
      manualOverrides[entityId] = level;
    }
  }

  return {
    currentLevels: { ...savedOverrides, ...importedLevels },
    manualOverrides,
  };
}
