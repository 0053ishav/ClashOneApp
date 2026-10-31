import type { ProgressionCandidate } from "@/types/planner";
import {
  buildPlannerCatalog,
  type PlannerCatalogFilters,
} from "@/services/plannerCatalogService";
import type { ValidatedPlannerDataset } from "@/utils/planner/validatePlannerDataset";

const filters: PlannerCatalogFilters = {
  query: "",
  category: "all",
  currentLevels: { "building:1": 1, "building:2": 2, "troop:3": 0 },
  townHallLevel: 10,
  laboratoryLevel: 5,
  petHouseLevel: 4,
};

function candidate(overrides: Partial<ProgressionCandidate> = {}): ProgressionCandidate {
  return {
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
    ...overrides,
  };
}

function dataset(
  candidates: readonly ProgressionCandidate[] = [candidate()],
  categoryStatus: ValidatedPlannerDataset["categoryStatus"] = { buildings: "loaded" },
): ValidatedPlannerDataset {
  return { candidates, diagnostics: [], categoryStatus };
}

const metadata = {
  namesByEntityId: {
    "building:1": "Archer Tower",
    "building:2": "Cannon",
    "troop:3": "Barbarian",
  },
  maxLevelsByEntityId: {
    "building:1": 20,
    "building:2": 20,
    "troop:3": 12,
  },
};

describe("buildPlannerCatalog", () => {
  it("only returns the next upgrade for the account's current level", () => {
    const result = buildPlannerCatalog(dataset([
      candidate({ candidateId: "buildings:1:1", currentLevel: 0, targetLevel: 1 }),
      candidate({ candidateId: "buildings:1:2", currentLevel: 1, targetLevel: 2 }),
      candidate({ candidateId: "buildings:1:3", currentLevel: 2, targetLevel: 3 }),
    ]), metadata, filters);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].candidate.candidateId).toBe("buildings:1:2");
    expect(result.items[0].currentLevel).toBe(1);
    expect(result.items[0].maxLevel).toBe(20);
  });

  it("filters by category and case-insensitive name or stable entity ID", () => {
    const result = buildPlannerCatalog(dataset([
      candidate(),
      candidate({
        candidateId: "buildings:2:3",
        entityId: "building:2",
        currentLevel: 2,
        targetLevel: 3,
      }),
    ]), metadata, { ...filters, query: "cAnNoN", category: "building" });

    expect(result.items.map((item) => item.name)).toEqual(["Cannon"]);
  });

  it("does not show entities already at max level or with missing metadata", () => {
    const result = buildPlannerCatalog(dataset([
      candidate({ entityId: "building:2", candidateId: "buildings:2:3", currentLevel: 2, targetLevel: 3 }),
      candidate({ entityId: "unknown", candidateId: "buildings:unknown:1", currentLevel: 0, targetLevel: 1 }),
    ]), {
      namesByEntityId: { "building:2": "Cannon" },
      maxLevelsByEntityId: { "building:2": 3 },
    }, {
      ...filters,
      currentLevels: { ...filters.currentLevels, "building:2": 3 },
    });

    expect(result.items).toEqual([]);
  });

  it("marks unmet prerequisites and prevents adding the candidate", () => {
    const result = buildPlannerCatalog(dataset([
      candidate({ prerequisites: [{ kind: "town-hall-level", minimumLevel: 11 }] }),
    ]), metadata, { ...filters, townHallLevel: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].canAdd).toBe(false);
    expect(result.items[0].blockedBy).toEqual([
      { kind: "town-hall-level", minimumLevel: 11 },
    ]);
  });

  it("keeps valid partial data visible and reports unavailable categories", () => {
    const result = buildPlannerCatalog(dataset(
      [candidate()],
      { buildings: "loaded", heroes: "unavailable" },
    ), metadata, filters);

    expect(result.state).toBe("partial");
    expect(result.items).toHaveLength(1);
    expect(result.unavailableCategories).toEqual(["heroes"]);
  });

  it("distinguishes empty and failed catalogs", () => {
    expect(buildPlannerCatalog(dataset([], { buildings: "valid-empty" }), metadata, filters).state)
      .toBe("empty");
    expect(buildPlannerCatalog(dataset([], { buildings: "unavailable" }), metadata, filters).state)
      .toBe("error");
  });

  it("deduplicates candidate variants by stable entity and target level", () => {
    const result = buildPlannerCatalog(dataset([
      candidate({ candidateId: "buildings:1:2" }),
      candidate({ candidateId: "legacy-buildings:1:2" }),
    ]), metadata, filters);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].candidate.candidateId).toBe("buildings:1:2");
  });
});
