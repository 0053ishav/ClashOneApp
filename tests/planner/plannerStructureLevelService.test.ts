import type { EntityData } from "@/types/entities";
import { resolvePlannerStructureLevels } from "@/services/plannerStructureLevelService";

function entity(overrides: Partial<EntityData> = {}): EntityData {
  return {
    id: 100,
    slug: "laboratory",
    type: "lab",
    village: "home",
    name: { en: "Laboratory" },
    ...overrides,
  };
}

describe("resolvePlannerStructureLevels", () => {
  it("uses imported current levels for Home Village prerequisite structures", () => {
    const entities = [
      entity({ id: 100, slug: "laboratory", type: "lab" }),
      entity({ id: 101, slug: "pet-house", type: "building", name: { en: "Pet House" } }),
    ];

    expect(resolvePlannerStructureLevels(entities, { "100": 12, "101": 5 })).toEqual({
      laboratoryLevel: 12,
      petHouseLevel: 5,
    });
  });

  it("keeps missing or untracked structure levels conservative", () => {
    expect(resolvePlannerStructureLevels([entity()], {})).toEqual({
      laboratoryLevel: 0,
      petHouseLevel: 0,
    });
  });

  it("does not use Builder Base structures as Home Village prerequisites", () => {
    expect(resolvePlannerStructureLevels([
      entity({ village: "builderBase" }),
      entity({ id: 101, slug: "pet-house", village: "builderBase" }),
    ], { "100": 10, "101": 5 })).toEqual({
      laboratoryLevel: 0,
      petHouseLevel: 0,
    });
  });

  it("ignores invalid level values", () => {
    expect(resolvePlannerStructureLevels([
      entity(),
      entity({ id: 101, slug: "pet-house" }),
    ], { "100": -1, "101": 1.5 })).toEqual({
      laboratoryLevel: 0,
      petHouseLevel: 0,
    });
  });
});
