import type {
  PlannerEntityCategory,
  ProgressionCandidate,
  UpgradePrerequisite,
} from "@/types/planner";
import { checkPlannerPrerequisite } from "@/utils/planner/checkPlannerPrerequisite";
import type {
  ProgressionDiagnostic,
  ValidatedPlannerDataset,
} from "@/utils/planner/validatePlannerDataset";

export type PlannerCatalogLoadState = "loading" | "error" | "empty" | "partial" | "ready";

export interface PlannerCatalogEntry {
  candidate: ProgressionCandidate;
  /** Localized display label from entity metadata, never used as identity. */
  name: string;
  maxLevel: number;
}

export interface PlannerCatalogMetadata {
  namesByEntityId: Readonly<Record<string, string>>;
  maxLevelsByEntityId: Readonly<Record<string, number>>;
}

export interface PlannerCatalogFilters {
  query: string;
  category: PlannerEntityCategory | "all";
  currentLevels: Readonly<Record<string, number>>;
  townHallLevel: number;
  laboratoryLevel: number;
  petHouseLevel: number;
}

export type PlannerCatalogItem = PlannerCatalogEntry & (
  | {
      currentLevel: number;
      currentLevelStatus: "known";
      isNextLevel: true;
      canAdd: boolean;
      blockedBy: readonly UpgradePrerequisite[];
      unknownPrerequisites: readonly UpgradePrerequisite[];
    }
  | {
      currentLevel: null;
      currentLevelStatus: "unknown";
      isNextLevel: false;
      canAdd: false;
      blockedBy: readonly UpgradePrerequisite[];
      unknownPrerequisites: readonly UpgradePrerequisite[];
    }
);

export interface PlannerCatalogDiagnosticsSummary {
  datasetCandidates: number;
  homeVillageCandidates: number;
  knownLevelCandidates: number;
  nextLevelCandidates: number;
  categoryCandidates: number;
  metadataCandidates: number;
  belowMaxLevelCandidates: number;
  queryCandidates: number;
  returnedItems: number;
}

export interface PlannerCatalogResult {
  state: PlannerCatalogLoadState;
  items: readonly PlannerCatalogItem[];
  diagnostics: readonly ProgressionDiagnostic[];
  unavailableCategories: readonly string[];
  diagnosticsSummary: PlannerCatalogDiagnosticsSummary;
}

function getState(dataset: ValidatedPlannerDataset): PlannerCatalogLoadState {
  const statuses = Object.values(dataset.categoryStatus);
  if (statuses.length === 0 || statuses.every((status) => status === "unavailable")) return "error";
  const unavailable = statuses.some((status) => status === "unavailable");
  if (dataset.candidates.length === 0) return unavailable ? "partial" : "empty";
  return unavailable ? "partial" : "ready";
}

/**
 * Creates a stable, filterable Home Village catalog from validated game data.
 * Candidate IDs remain the sole identity; display names are only presentation.
 * The catalog shows the next level for each entity, not every future level.
 */
export function buildPlannerCatalog(
  dataset: ValidatedPlannerDataset,
  metadata: PlannerCatalogMetadata,
  filters: PlannerCatalogFilters,
): PlannerCatalogResult {
  const diagnostics = dataset.diagnostics;
  const unavailableCategories = Object.entries(dataset.categoryStatus)
    .filter(([, status]) => status === "unavailable")
    .map(([category]) => category)
    .sort();

  const currentLevels = filters.currentLevels;
  const prerequisiteLevels = {
    townHallLevel: filters.townHallLevel,
    laboratoryLevel: filters.laboratoryLevel,
    petHouseLevel: filters.petHouseLevel,
    entityLevels: currentLevels,
  };
  // The validated progression dataset is authoritative for upgradeable max
  // levels. Entity metadata levels primarily describe icons/display levels and
  // can be incomplete even when progression records are fully loaded.
  const progressionMaxLevelsByEntityId = new Map<string, number>();
  for (const candidate of dataset.candidates) {
    if (candidate.village !== "home") continue;
    // Zero is the empty accumulator value, not an account level.
    progressionMaxLevelsByEntityId.set(
      candidate.entityId,
      Math.max(
        progressionMaxLevelsByEntityId.get(candidate.entityId) ?? 0,
        candidate.targetLevel,
      ),
    );
  }
  const seen = new Set<string>();
  const seenUnknownLevelEntities = new Set<string>();
  const items: PlannerCatalogItem[] = [];
  const diagnosticsSummary: PlannerCatalogDiagnosticsSummary = {
    datasetCandidates: dataset.candidates.length,
    homeVillageCandidates: 0,
    knownLevelCandidates: 0,
    nextLevelCandidates: 0,
    categoryCandidates: 0,
    metadataCandidates: 0,
    belowMaxLevelCandidates: 0,
    queryCandidates: 0,
    returnedItems: 0,
  };

  const candidates = [...dataset.candidates]
    .filter((candidate) => candidate.village === "home")
    .sort((a, b) =>
      a.entityId.localeCompare(b.entityId) ||
      a.targetLevel - b.targetLevel ||
      a.candidateId.localeCompare(b.candidateId),
    );
  for (const candidate of candidates) {
    if (candidate.village !== "home") continue;
    diagnosticsSummary.homeVillageCandidates += 1;

    const currentLevel = currentLevels[candidate.entityId];
    if (
      !Object.prototype.hasOwnProperty.call(currentLevels, candidate.entityId) ||
      !Number.isSafeInteger(currentLevel) ||
      currentLevel < 0
    ) {
      if (candidate.category !== filters.category && filters.category !== "all") continue;
      const name = metadata.namesByEntityId[candidate.entityId]?.trim();
      const metadataMaxLevel = metadata.maxLevelsByEntityId[candidate.entityId];
      const progressionMaxLevel = progressionMaxLevelsByEntityId.get(candidate.entityId);
      const maxLevel = progressionMaxLevel !== undefined && metadataMaxLevel !== undefined
        ? Math.max(progressionMaxLevel, metadataMaxLevel)
        : progressionMaxLevel ?? metadataMaxLevel;
      if (!name || typeof maxLevel !== "number" || !Number.isSafeInteger(maxLevel) || maxLevel < 1) continue;
      const search = filters.query.trim().toLocaleLowerCase();
      if (search && !name.toLocaleLowerCase().includes(search) &&
        !candidate.entityId.toLocaleLowerCase().includes(search)) continue;
      if (seenUnknownLevelEntities.has(candidate.entityId)) continue;
      seenUnknownLevelEntities.add(candidate.entityId);
      const prerequisiteChecks = candidate.prerequisites.map((prerequisite) => ({
        prerequisite,
        status: checkPlannerPrerequisite(prerequisite, prerequisiteLevels),
      }));
      items.push({
        candidate,
        name,
        maxLevel,
        currentLevel: null,
        currentLevelStatus: "unknown",
        isNextLevel: false,
        canAdd: false,
        blockedBy: prerequisiteChecks
          .filter((check) => check.status.status === "unmet")
          .map((check) => check.prerequisite),
        unknownPrerequisites: prerequisiteChecks
          .filter((check) => check.status.status === "unknown")
          .map((check) => check.prerequisite),
      });
      continue;
    }

    diagnosticsSummary.knownLevelCandidates += 1;
    const targetLevel = currentLevel + 1;
    if (candidate.targetLevel !== targetLevel) continue;
    if (candidate.targetLevel > candidate.currentLevel + 1) continue;
    diagnosticsSummary.nextLevelCandidates += 1;
    if (candidate.category !== filters.category && filters.category !== "all") continue;
    diagnosticsSummary.categoryCandidates += 1;

    const name = metadata.namesByEntityId[candidate.entityId]?.trim();
    const metadataMaxLevel = metadata.maxLevelsByEntityId[candidate.entityId];
    const progressionMaxLevel = progressionMaxLevelsByEntityId.get(candidate.entityId);
    const maxLevel = progressionMaxLevel !== undefined && metadataMaxLevel !== undefined
      ? Math.max(progressionMaxLevel, metadataMaxLevel)
      : progressionMaxLevel ?? metadataMaxLevel;
    if (!name || typeof maxLevel !== "number" || !Number.isSafeInteger(maxLevel) || maxLevel < 1) continue;
    diagnosticsSummary.metadataCandidates += 1;
    if (currentLevel >= maxLevel || targetLevel > maxLevel) continue;
    diagnosticsSummary.belowMaxLevelCandidates += 1;
    const search = filters.query.trim().toLocaleLowerCase();
    if (search && !name.toLocaleLowerCase().includes(search) &&
      !candidate.entityId.toLocaleLowerCase().includes(search)) continue;
    diagnosticsSummary.queryCandidates += 1;

    const uniqueKey = candidate.entityId + ":" + candidate.targetLevel;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const prerequisiteChecks = candidate.prerequisites.map((prerequisite) => ({
      prerequisite,
      status: checkPlannerPrerequisite(prerequisite, prerequisiteLevels),
    }));
    const blockedBy = prerequisiteChecks
      .filter((check) => check.status.status === "unmet")
      .map((check) => check.prerequisite);
    const unknownPrerequisites = prerequisiteChecks
      .filter((check) => check.status.status === "unknown")
      .map((check) => check.prerequisite);
    items.push({
      candidate,
      name,
      maxLevel,
      currentLevel,
      currentLevelStatus: "known",
      isNextLevel: true,
      canAdd: blockedBy.length === 0 && unknownPrerequisites.length === 0,
      blockedBy,
      unknownPrerequisites,
    });
  }

  items.sort((a, b) =>
    a.candidate.category.localeCompare(b.candidate.category) ||
    a.name.localeCompare(b.name) ||
    a.candidate.targetLevel - b.candidate.targetLevel ||
    a.candidate.candidateId.localeCompare(b.candidate.candidateId),
  );

  return {
    state: getState(dataset),
    items,
    diagnostics,
    unavailableCategories,
    diagnosticsSummary: {
      ...diagnosticsSummary,
      returnedItems: items.length,
    },
  };
}
