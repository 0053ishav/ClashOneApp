import type {
  Estimate,
  EstimateUnknownReason,
  PlannerEntityCategory,
  PlannerVillage,
  ProgressionCandidate,
  UpgradePrerequisite,
} from "@/types/planner";

export type ProgressionDiagnosticCode =
  | "category-missing" | "category-fetch-failed" | "malformed-category"
  | "missing-entity-id" | "duplicate-entity-id" | "metadata-progression-mismatch"
  | "unsupported-village" | "builder-base-excluded" | "invalid-level"
  | "invalid-max-level" | "max-level-mismatch" | "missing-cost" | "invalid-cost"
  | "missing-duration" | "invalid-duration" | "invalid-prerequisite"
  | "special-payload-excluded";

export interface ProgressionDiagnostic {
  code: ProgressionDiagnosticCode;
  category: string;
  entityId?: string;
  level?: number;
  detail: string;
}

export type CategoryPayloadState =
  | { status: "loaded"; records: readonly unknown[] }
  | { status: "failed"; detail?: string }
  | { status: "missing" };

export interface PlannerMetadataRecord {
  id: string | number;
  village?: string;
  maxLevel?: number;
  superTroop?: unknown;
  supercharge?: unknown;
}

export interface ProgressionCategoryInput {
  category: string;
  village: string;
  metadata: CategoryPayloadState;
  progression: CategoryPayloadState;
}

export interface ValidatedPlannerDataset {
  candidates: readonly ProgressionCandidate[];
  diagnostics: readonly ProgressionDiagnostic[];
  categoryStatus: Readonly<Record<string, "loaded" | "valid-empty" | "unavailable">>;
}

const CATEGORY_MAP: Readonly<Record<string, PlannerEntityCategory | undefined>> = {
  building: "building", buildings: "building", hero: "hero", heroes: "hero",
  troop: "troop", troops: "troop", spell: "spell", spells: "spell",
  siege: "siege", sieges: "siege", pet: "pet", pets: "pet",
  trap: "trap", traps: "trap", wall: "wall", walls: "wall",
};

function normalizePlannerVillage(value: string): PlannerVillage | null {
  return value === "home" ? "home" : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function unknownEstimate(reason: EstimateUnknownReason): Estimate<number> {
  return { status: "unknown", reason };
}

function resolveCost(
  value: unknown,
  category: string,
  entityId: string,
  level: number,
  diagnostics: ProgressionDiagnostic[],
): Estimate<{ gold?: number; elixir?: number; darkElixir?: number }> {
  if (value === undefined || value === null) {
    diagnostics.push({ code: "missing-cost", category, entityId, level, detail: "Cost is absent; estimate remains unknown." });
    return unknownEstimate("missing-game-data");
  }
  if (!finiteNonNegative(value)) {
    diagnostics.push({ code: "invalid-cost", category, entityId, level, detail: "Cost must be finite and non-negative." });
    return { status: "unknown", reason: "invalid-game-data" };
  }
  // The existing progression schema stores a numeric cost and a separate resource.
  // Resource conversion belongs in the data adapter, not this validator.
  return { status: "known", value: { gold: value } };
}

function resolveDuration(
  value: unknown,
  category: string,
  entityId: string,
  level: number,
  diagnostics: ProgressionDiagnostic[],
): Estimate<number> {
  if (value === undefined || value === null) {
    diagnostics.push({ code: "missing-duration", category, entityId, level, detail: "Upgrade time is absent; estimate remains unknown." });
    return unknownEstimate("missing-game-data");
  }
  if (!finiteNonNegative(value)) {
    diagnostics.push({ code: "invalid-duration", category, entityId, level, detail: "Upgrade time must be finite and non-negative." });
    return { status: "unknown", reason: "invalid-game-data" };
  }
  return { status: "known", value: value * 1000 };
}

function parsePrerequisites(
  level: Record<string, unknown>,
  category: string,
  entityId: string,
  levelNumber: number,
  diagnostics: ProgressionDiagnostic[],
): UpgradePrerequisite[] {
  const prerequisites: UpgradePrerequisite[] = [];
  const hall = level.hallLevel;
  if (hall !== undefined) {
    if (positiveInteger(hall)) prerequisites.push({ kind: "town-hall-level", minimumLevel: hall });
    else diagnostics.push({ code: "invalid-prerequisite", category, entityId, level: levelNumber, detail: "hallLevel must be a positive integer." });
  }
  const lab = level.laboratoryLevel ?? level.labLevel;
  if (lab !== undefined) {
    if (positiveInteger(lab)) prerequisites.push({ kind: "laboratory-level", minimumLevel: lab });
    else diagnostics.push({ code: "invalid-prerequisite", category, entityId, level: levelNumber, detail: "Laboratory level must be a positive integer." });
  }
  const petHouse = level.petHouseLevel;
  if (petHouse !== undefined) {
    if (positiveInteger(petHouse)) prerequisites.push({ kind: "pet-house-level", minimumLevel: petHouse });
    else diagnostics.push({ code: "invalid-prerequisite", category, entityId, level: levelNumber, detail: "petHouseLevel must be a positive integer." });
  }
  return prerequisites;
}

export function validatePlannerDataset(
  inputs: readonly ProgressionCategoryInput[],
): ValidatedPlannerDataset {
  const candidates: ProgressionCandidate[] = [];
  const diagnostics: ProgressionDiagnostic[] = [];
  const categoryStatus: Record<string, "loaded" | "valid-empty" | "unavailable"> = {};

  for (const input of inputs) {
    const categoryKey = input.category.trim().toLowerCase();
    if (input.metadata.status === "missing" || input.progression.status === "missing") {
      categoryStatus[categoryKey] = "unavailable";
      diagnostics.push({ code: "category-missing", category: input.category, detail: "Metadata or progression category is missing." });
      continue;
    }
    if (input.metadata.status === "failed" || input.progression.status === "failed") {
      categoryStatus[categoryKey] = "unavailable";
      const failure = input.metadata.status === "failed" ? input.metadata.detail : input.progression.status === "failed" ? input.progression.detail : undefined;
      diagnostics.push({ code: "category-fetch-failed", category: input.category, detail: failure ?? "Category fetch failed." });
      continue;
    }
    if (input.metadata.records.length === 0 && input.progression.records.length === 0) {
      categoryStatus[categoryKey] = "valid-empty";
      continue;
    }
    categoryStatus[categoryKey] = "loaded";
    const plannerCategory = CATEGORY_MAP[categoryKey];
    if (!plannerCategory) {
      diagnostics.push({ code: "special-payload-excluded", category: input.category, detail: "Category is not supported by the Home Village planner." });
      continue;
    }

    const metadataById = new Map<string, Record<string, unknown>>();
    const progressionById = new Map<string, Record<string, unknown>>();
    for (const [records, destination] of [
      [input.metadata.records, metadataById],
      [input.progression.records, progressionById],
    ] as const) {
      for (const raw of records) {
        const record = asRecord(raw);
        const id = record?.id;
        if ((typeof id !== "string" && typeof id !== "number") || String(id).trim() === "") {
          diagnostics.push({ code: "missing-entity-id", category: input.category, detail: "Record has no stable ID." });
          continue;
        }
        const key = String(id);
        if (destination.has(key)) {
          diagnostics.push({ code: "duplicate-entity-id", category: input.category, entityId: key, detail: "Duplicate stable ID." });
          continue;
        }
        destination.set(key, record!);
      }
    }

    for (const [entityId, progression] of progressionById) {
      const metadata = metadataById.get(entityId);
      if (!metadata) {
        diagnostics.push({ code: "metadata-progression-mismatch", category: input.category, entityId, detail: "Progression entity has no metadata record." });
        continue;
      }
      const village = typeof metadata.village === "string" ? metadata.village : input.village;
      if (village === "builder" || village === "builderBase" || village === "builder-base") {
        diagnostics.push({ code: "builder-base-excluded", category: input.category, entityId, detail: "Builder Base is outside the initial planner scope." });
        continue;
      }
      if (!normalizePlannerVillage(village)) {
        diagnostics.push({ code: "unsupported-village", category: input.category, entityId, detail: "Unsupported village identifier: " + village });
        continue;
      }
      if (metadata.superTroop !== undefined || progression.superTroop !== undefined || metadata.supercharge !== undefined || progression.supercharge !== undefined) {
        diagnostics.push({ code: "special-payload-excluded", category: input.category, entityId, detail: "Nested variant/supercharge payload is excluded from base candidates." });
      }
      const maxLevel = progression.maxLevel;
      if (!positiveInteger(maxLevel)) {
        diagnostics.push({ code: "invalid-max-level", category: input.category, entityId, detail: "Progression maxLevel must be a positive integer." });
        continue;
      }
      if (metadata.maxLevel !== undefined && (!positiveInteger(metadata.maxLevel) || metadata.maxLevel !== maxLevel)) {
        diagnostics.push({ code: "max-level-mismatch", category: input.category, entityId, detail: "Metadata maxLevel differs from progression maxLevel." });
      }
      const levels = asRecord(progression.levels);
      if (!levels) {
        diagnostics.push({ code: "malformed-category", category: input.category, entityId, detail: "Progression levels must be an object keyed by level." });
        continue;
      }
      for (const [levelKey, rawLevel] of Object.entries(levels)) {
        const levelNumber = Number(levelKey);
        const level = asRecord(rawLevel);
        if (!Number.isInteger(levelNumber) || levelNumber < 1 || !level) {
          diagnostics.push({ code: "invalid-level", category: input.category, entityId, detail: "Invalid level key or payload: " + levelKey });
          continue;
        }
        if (levelNumber > maxLevel) {
          diagnostics.push({ code: "invalid-level", category: input.category, entityId, level: levelNumber, detail: "Level exceeds declared maxLevel." });
          continue;
        }
        const prerequisites = parsePrerequisites(level, input.category, entityId, levelNumber, diagnostics);
        candidates.push({
          candidateId: input.category + ":" + entityId + ":" + levelNumber,
          entityId,
          category: plannerCategory,
          village: "home",
          currentLevel: levelNumber - 1,
          targetLevel: levelNumber,
          prerequisites,
          estimate: {
            cost: resolveCost(level.cost, input.category, entityId, levelNumber, diagnostics),
            durationMs: resolveDuration(level.upgradeTime, input.category, entityId, levelNumber, diagnostics),
          },
        });
      }
    }
    for (const entityId of metadataById.keys()) {
      if (!progressionById.has(entityId)) {
        diagnostics.push({ code: "metadata-progression-mismatch", category: input.category, entityId, detail: "Metadata entity has no progression record." });
      }
    }
  }
  return { candidates, diagnostics, categoryStatus };
}
