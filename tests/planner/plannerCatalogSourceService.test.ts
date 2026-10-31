import { ResourceType } from "@/types/resource";
import type { EntityData } from "@/types/entities";
import type { ProgressionData, ProgressionManifest } from "@/types/progression";
import { buildPlannerDatasetFromCache } from "@/services/plannerCatalogSourceService";

const manifest: ProgressionManifest = {
  version: 1,
  categories: { buildings: 1 },
};

const entities: EntityData[] = [
  {
    id: 1,
    slug: "archer-tower",
    type: "building",
    village: "home",
    name: { en: "Archer Tower" },
    levels: { 1: { level: 1, icon: "tower" }, 2: { level: 2, icon: "tower" } },
  },
  {
    id: 2,
    slug: "builder-hall-defense",
    type: "building",
    village: "builderBase",
    name: { en: "Builder Base Defense" },
    levels: { 1: { level: 1, icon: "defense" } },
  },
];

const progression: ProgressionData[] = [
  {
    id: 1,
    resource: ResourceType.GOLD,
    maxLevel: 2,
    maxHallLevel: 2,
    levels: {
      1: { hallLevel: 1, cost: 100, upgradeTime: 60 },
      2: { hallLevel: 2, cost: 200, upgradeTime: 120 },
    },
  },
  {
    id: 2,
    resource: ResourceType.GOLD,
    maxLevel: 1,
    maxHallLevel: 1,
    levels: { 1: { hallLevel: 1, cost: 100, upgradeTime: 60 } },
  },
];

describe("buildPlannerDatasetFromCache", () => {
  it("validates cached metadata and progression into Home Village candidates", () => {
    const result = buildPlannerDatasetFromCache({
      entities,
      manifest,
      loadCategory: (category) => category === "buildings" ? progression : null,
    });

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.every((candidate) => candidate.village === "home")).toBe(true);
    expect(result.categoryStatus.buildings).toBe("loaded");
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "builder-base-excluded")).toBe(true);
  });

  it("preserves cache misses as unavailable categories instead of valid empty data", () => {
    const result = buildPlannerDatasetFromCache({
      entities,
      manifest,
      loadCategory: () => null,
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.categoryStatus.buildings).toBe("unavailable");
  });

  it("returns an empty validated dataset when no progression manifest exists", () => {
    const result = buildPlannerDatasetFromCache({
      entities,
      manifest: null,
      loadCategory: () => progression,
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.categoryStatus).toEqual({});
  });
});
