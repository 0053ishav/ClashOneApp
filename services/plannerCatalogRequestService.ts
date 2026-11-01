import type {
  PlannerCatalogFilters,
  PlannerCatalogMetadata,
  PlannerCatalogResult,
} from "@/services/plannerCatalogService";
import { buildPlannerCatalog } from "@/services/plannerCatalogService";
import type { ValidatedPlannerDataset } from "@/utils/planner/validatePlannerDataset";

export interface PlannerCatalogRequestIdentity {
  accountTag: string;
  categoryKey: string;
  village: "home";
}

export interface PlannerCatalogSource {
  dataset: ValidatedPlannerDataset;
  metadata: PlannerCatalogMetadata;
}

export interface PlannerCatalogRequestToken {
  readonly generation: number;
  readonly identity: PlannerCatalogRequestIdentity;
}

export interface PlannerCatalogRequestCoordinator {
  begin(identity: PlannerCatalogRequestIdentity): PlannerCatalogRequestToken;
  isCurrent(
    token: PlannerCatalogRequestToken,
    activeIdentity: PlannerCatalogRequestIdentity,
  ): boolean;
  invalidate(): void;
}

/**
 * Guards async catalog loads against account/category changes and out-of-order
 * completion. Keep one coordinator per mounted catalog consumer; never share it
 * globally between screens/accounts.
 */
export function createPlannerCatalogRequestCoordinator(): PlannerCatalogRequestCoordinator {
  let generation = 0;

  return {
    begin(identity) {
      generation += 1;
      return { generation, identity: { ...identity } };
    },
    isCurrent(token, activeIdentity) {
      return token.generation === generation
        && token.identity.accountTag === activeIdentity.accountTag
        && token.identity.categoryKey === activeIdentity.categoryKey
        && token.identity.village === activeIdentity.village;
    },
    invalidate() {
      generation += 1;
    },
  };
}

export interface LoadPlannerCatalogInput {
  identity: PlannerCatalogRequestIdentity;
  filters: PlannerCatalogFilters;
  coordinator: PlannerCatalogRequestCoordinator;
  activeIdentity: () => PlannerCatalogRequestIdentity;
  loadSource: () => Promise<PlannerCatalogSource>;
}

/**
 * Returns null for stale work so callers can leave the currently visible
 * catalog untouched. Loader errors intentionally propagate for the caller's
 * explicit error state.
 */
export async function loadPlannerCatalog(
  input: LoadPlannerCatalogInput,
): Promise<PlannerCatalogResult | null> {
  const token = input.coordinator.begin(input.identity);
  const source = await input.loadSource();

  if (!input.coordinator.isCurrent(token, input.activeIdentity())) {
    return null;
  }

  return buildPlannerCatalog(source.dataset, source.metadata, input.filters);
}
