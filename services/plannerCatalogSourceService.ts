import type { EntityData } from "@/types/entities";
import type { ProgressionData, ProgressionManifest } from "@/types/progression";
import {
  validatePlannerDataset,
  type CategoryPayloadState,
  type ProgressionCategoryInput,
  type ValidatedPlannerDataset,
} from "@/utils/planner/validatePlannerDataset";

const CATEGORY_BY_ENTITY_TYPE: Readonly<Record<string, string | undefined>> = {
  building: "buildings",
  hero: "heroes",
  troop: "troops",
  spell: "spells",
  siege: "sieges",
  pet: "pets",
  trap: "traps",
  wall: "walls",
};

const SUPPORTED_CATEGORIES = new Set(Object.values(CATEGORY_BY_ENTITY_TYPE));

function payload<T>(records: readonly T[] | null): CategoryPayloadState {
  return records === null
    ? { status: "missing" }
    : { status: "loaded", records };
}

function toMetadataRecord(entity: EntityData): Record<string, unknown> {
  const levelNumbers = Object.keys(entity.levels ?? {})
    .map(Number)
    .filter((level) => Number.isSafeInteger(level) && level > 0);
  return {
    id: entity.id,
    village: entity.village,
    ...(levelNumbers.length > 0 ? { maxLevel: Math.max(...levelNumbers) } : {}),
  };
}

function toProgressionRecord(record: ProgressionData): Record<string, unknown> {
  return {
    id: record.id,
    resource: record.resource,
    maxLevel: record.maxLevel,
    levels: record.levels,
    ...(record.superTroop ? { superTroop: record.superTroop } : {}),
    ...(record.supercharge ? { supercharge: record.supercharge } : {}),
  };
}

export interface BuildPlannerDatasetInput {
  entities: readonly EntityData[];
  manifest: ProgressionManifest | null;
  loadCategory: (category: string) => readonly ProgressionData[] | null;
}

/**
 * Adapts Clash One's existing CDN-backed metadata and progression cache into
 * the planner's validated domain dataset. Cache misses stay unavailable rather
 * than being silently interpreted as a valid empty category.
 */
export function buildPlannerDatasetFromCache(
  input: BuildPlannerDatasetInput,
): ValidatedPlannerDataset {
  if (!input.manifest) {
    return validatePlannerDataset([]);
  }

  const entitiesByCategory = new Map<string, EntityData[]>();
  for (const entity of input.entities) {
    const category = CATEGORY_BY_ENTITY_TYPE[entity.type];
    if (!category || !SUPPORTED_CATEGORIES.has(category)) continue;
    const bucket = entitiesByCategory.get(category) ?? [];
    bucket.push(entity);
    entitiesByCategory.set(category, bucket);
  }

  const categories = new Set([
    ...Object.keys(input.manifest.categories),
    ...SUPPORTED_CATEGORIES,
  ]);
  const categoryInputs: ProgressionCategoryInput[] = [];

  for (const category of [...categories].sort()) {
    const cachedProgression = input.loadCategory(category);
    const metadataRecords = (entitiesByCategory.get(category) ?? []).map(toMetadataRecord);
    const metadataState: CategoryPayloadState = payload(metadataRecords);
    const progressionState: CategoryPayloadState =
      cachedProgression === null
        ? { status: "missing" }
        : {
            status: "loaded",
            records: cachedProgression.map(toProgressionRecord),
          };

    categoryInputs.push({
      category,
      village: "home",
      metadata: metadataState,
      progression: progressionState,
    });
  }

  return validatePlannerDataset(categoryInputs);
}
