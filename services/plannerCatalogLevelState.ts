import type { EntityData } from "@/types/entities";
import type { PlannerEntityCategory, ProgressionCandidate } from "@/types/planner";

/**
 * Resolves account levels from the latest imported snapshot and user-entered
 * fallback values. Imported data is authoritative for matching entity IDs.
 */
export interface PlannerCatalogLevelState {
  currentLevels: Record<string, number>;
  manualOverrides: Record<string, number>;
}

export interface PlannerLevelEditorCandidate {
  entity: EntityData;
  maxLevel: number;
}

export interface PlannerLevelEditorFilters {
  category: PlannerEntityCategory | "all";
  query: string;
  currentLevels: Readonly<Record<string, number>>;
  manualOverrides: Readonly<Record<string, number>>;
}

const CATEGORY_BY_ENTITY_TYPE: Readonly<Record<string, PlannerEntityCategory | undefined>> = {
  building: "building",
  townhall: "building",
  hero: "hero",
  troop: "troop",
  spell: "spell",
  siege: "siege",
  pet: "pet",
  trap: "trap",
  wall: "wall",
};

export function getPlannerLevelEditorCandidates(
  entities: readonly EntityData[],
  filters: PlannerLevelEditorFilters,
  progressionCandidates: readonly ProgressionCandidate[] = [],
): PlannerLevelEditorCandidate[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const candidates: PlannerLevelEditorCandidate[] = [];
  const progressionMaxLevels = new Map<string, number>();
  for (const candidate of progressionCandidates) {
    progressionMaxLevels.set(
      candidate.entityId,
      Math.max(progressionMaxLevels.get(candidate.entityId) ?? 0, candidate.targetLevel),
    );
  }

  for (const entity of entities) {
    const category = CATEGORY_BY_ENTITY_TYPE[entity.type];
    if (
      entity.village !== "home" ||
      category === undefined ||
      (filters.category !== "all" && filters.category !== category)
    ) {
      continue;
    }

    const entityId = String(entity.id);
    const hasCurrentLevel = Object.prototype.hasOwnProperty.call(filters.currentLevels, entityId);
    const hasManualOverride = Object.prototype.hasOwnProperty.call(filters.manualOverrides, entityId);
    if (hasCurrentLevel && !hasManualOverride) continue;
    if (query && !entity.name.en.toLocaleLowerCase().includes(query)) continue;

    const metadataMaxLevel = Math.max(
      ...Object.keys(entity.levels ?? {})
        .map(Number)
        .filter((level) => Number.isSafeInteger(level) && level > 0),
    );
    const maxLevel = Math.max(metadataMaxLevel, progressionMaxLevels.get(entityId) ?? 0);
    if (!Number.isSafeInteger(maxLevel) || maxLevel < 1) continue;

    candidates.push({ entity, maxLevel });
  }

  return candidates.sort((a, b) => a.entity.name.en.localeCompare(b.entity.name.en));
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
