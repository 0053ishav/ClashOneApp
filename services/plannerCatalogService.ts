import type {
  PlannerEntityCategory,
  ProgressionCandidate,
  UpgradePrerequisite,
} from "@/types/planner";
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

export interface PlannerCatalogItem extends PlannerCatalogEntry {
  currentLevel: number;
  isNextLevel: boolean;
  canAdd: boolean;
  blockedBy: readonly UpgradePrerequisite[];
}

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

function isPrerequisiteSatisfied(
  prerequisite: UpgradePrerequisite,
  filters: PlannerCatalogFilters,
): boolean {
  switch (prerequisite.kind) {
    case "town-hall-level":
      return filters.townHallLevel >= prerequisite.minimumLevel;
    case "laboratory-level":
      return filters.laboratoryLevel >= prerequisite.minimumLevel;
    case "pet-house-level":
      return filters.petHouseLevel >= prerequisite.minimumLevel;
    case "entity-level":
      return (filters.currentLevels[prerequisite.entityId] ?? 0) >= prerequisite.minimumLevel;
  }
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
  const seen = new Set<string>();
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

  for (const candidate of dataset.candidates) {
    if (candidate.village !== "home") continue;
    diagnosticsSummary.homeVillageCandidates += 1;
    // An absent level is unknown, not level zero. Never recommend an upgrade
    // from an invented account state.
    if (!Object.prototype.hasOwnProperty.call(currentLevels, candidate.entityId)) continue;
    diagnosticsSummary.knownLevelCandidates += 1;
    const currentLevel = currentLevels[candidate.entityId];
    const targetLevel = currentLevel + 1;
    if (candidate.targetLevel !== targetLevel) continue;
    if (candidate.targetLevel > candidate.currentLevel + 1) continue;
    diagnosticsSummary.nextLevelCandidates += 1;
    if (candidate.category !== filters.category && filters.category !== "all") continue;
    diagnosticsSummary.categoryCandidates += 1;

    const name = metadata.namesByEntityId[candidate.entityId]?.trim();
    const maxLevel = metadata.maxLevelsByEntityId[candidate.entityId];
    if (!name || !Number.isSafeInteger(maxLevel) || maxLevel < 1) continue;
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

    const blockedBy = candidate.prerequisites.filter(
      (prerequisite) => !isPrerequisiteSatisfied(prerequisite, filters),
    );
    items.push({
      candidate,
      name,
      maxLevel,
      currentLevel,
      isNextLevel: true,
      canAdd: blockedBy.length === 0,
      blockedBy,
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
