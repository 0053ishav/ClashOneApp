import type { ProgressionCandidate } from "@/types/planner";
import type { ValidatedPlannerDataset } from "@/utils/planner/validatePlannerDataset";
import {
  createPlannerCatalogRequestCoordinator,
  loadPlannerCatalog,
  type PlannerCatalogRequestIdentity,
} from "@/services/plannerCatalogRequestService";

const filters = {
  query: "",
  category: "all" as const,
  currentLevels: { "building:1": 1 },
  townHallLevel: 10,
  laboratoryLevel: 5,
  petHouseLevel: 4,
};

const candidate: ProgressionCandidate = {
  candidateId: "buildings:1:2",
  entityId: "building:1",
  category: "building",
  village: "home",
  currentLevel: 1,
  targetLevel: 2,
  prerequisites: [],
  estimate: {
    cost: { status: "known", value: { gold: 100 } },
    durationMs: { status: "known", value: 60_000 },
  },
};

const source = {
  dataset: {
    candidates: [candidate],
    diagnostics: [],
    categoryStatus: { buildings: "loaded" },
  } satisfies ValidatedPlannerDataset,
  metadata: {
    namesByEntityId: { "building:1": "Archer Tower" },
    maxLevelsByEntityId: { "building:1": 20 },
  },
};

const identity = (accountTag: string, categoryKey = "all"): PlannerCatalogRequestIdentity => ({
  accountTag,
  categoryKey,
  village: "home",
});

describe("planner catalog request lifecycle", () => {
  it("discards a response after the active account changes", async () => {
    const coordinator = createPlannerCatalogRequestCoordinator();
    let active = identity("#AAA");
    let resolveSource: ((value: typeof source) => void) | undefined;
    const pendingSource = new Promise<typeof source>((resolve) => {
      resolveSource = resolve;
    });

    const pending = loadPlannerCatalog({
      identity: active,
      filters,
      coordinator,
      activeIdentity: () => active,
      loadSource: () => pendingSource,
    });

    active = identity("#BBB");
    coordinator.begin(active);
    resolveSource?.(source);

    await expect(pending).resolves.toBeNull();
  });

  it("discards an older response when a newer category request starts", async () => {
    const coordinator = createPlannerCatalogRequestCoordinator();
    let active = identity("#AAA", "building");
    let resolveOlder: ((value: typeof source) => void) | undefined;
    const olderSource = new Promise<typeof source>((resolve) => {
      resolveOlder = resolve;
    });

    const older = loadPlannerCatalog({
      identity: active,
      filters,
      coordinator,
      activeIdentity: () => active,
      loadSource: () => olderSource,
    });

    active = identity("#AAA", "troop");
    const newer = loadPlannerCatalog({
      identity: active,
      filters: { ...filters, category: "troop" },
      coordinator,
      activeIdentity: () => active,
      loadSource: async () => source,
    });

    resolveOlder?.(source);
    await expect(older).resolves.toBeNull();
    await expect(newer).resolves.toMatchObject({ state: "ready", items: [] });
  });

  it("returns the catalog for the current context", async () => {
    const coordinator = createPlannerCatalogRequestCoordinator();
    const active = identity("#AAA");

    await expect(loadPlannerCatalog({
      identity: active,
      filters,
      coordinator,
      activeIdentity: () => active,
      loadSource: async () => source,
    })).resolves.toMatchObject({
      state: "ready",
      items: [{ name: "Archer Tower", candidate: { candidateId: "buildings:1:2" } }],
    });
  });

  it("supports invalidation when the consumer unmounts", async () => {
    const coordinator = createPlannerCatalogRequestCoordinator();
    const active = identity("#AAA");
    let resolveSource: ((value: typeof source) => void) | undefined;
    const pendingSource = new Promise<typeof source>((resolve) => {
      resolveSource = resolve;
    });
    const pending = loadPlannerCatalog({
      identity: active,
      filters,
      coordinator,
      activeIdentity: () => active,
      loadSource: () => pendingSource,
    });

    coordinator.invalidate();
    resolveSource?.(source);
    await expect(pending).resolves.toBeNull();
  });
});
