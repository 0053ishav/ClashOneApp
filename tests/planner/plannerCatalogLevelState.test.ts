import {
  getPlannerLevelEditorCandidates,
  resolvePlannerCatalogLevelState,
} from "@/services/plannerCatalogLevelState";
import type { EntityData } from "@/types/entities";
import type { ProgressionCandidate } from "@/types/planner";

function entity(
  id: number,
  name: string,
  type: EntityData["type"] = "building",
  village: EntityData["village"] = "home",
): EntityData {
  return {
    id,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    type,
    village,
    name: { en: name },
    levels: { "1": { level: 1, icon: "" }, "2": { level: 2, icon: "" } },
  };
}

describe("resolvePlannerCatalogLevelState", () => {
  it("uses imported snapshot levels over saved manual values", () => {
    expect(resolvePlannerCatalogLevelState(
      { "1": 4, "2": 3 },
      { "1": 5 },
    )).toEqual({
      currentLevels: { "1": 5, "2": 3 },
      manualOverrides: { "2": 3 },
    });
  });

  describe("getPlannerLevelEditorCandidates", () => {
    it("returns every eligible untracked entity instead of truncating the manual-level list", () => {
      const entities = Array.from({ length: 8 }, (_, index) =>
        entity(index + 1, `Building ${index + 1}`),
      );

      const candidates = getPlannerLevelEditorCandidates(entities, {
        category: "all",
        query: "",
        currentLevels: {},
        manualOverrides: {},
      });

      expect(candidates).toHaveLength(8);
      expect(candidates.map(({ entity: entry }) => entry.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("combines category and name filters while excluding imported levels", () => {
      const entities = [
        entity(1, "Archer Tower"),
        entity(2, "Archer Defense"),
        entity(5, "Cannon"),
        entity(3, "Archer Queen", "hero"),
        entity(4, "Builder Base Archer Tower", "building", "builderBase"),
      ];

      const candidates = getPlannerLevelEditorCandidates(entities, {
        category: "building",
        query: "archer",
        currentLevels: { "1": 4 },
        manualOverrides: {},
      });

      expect(candidates.map(({ entity: entry }) => entry.id)).toEqual([2]);
    });

    it("keeps a manually configured level editable and ignores entities without valid levels", () => {
      const entities = [
        entity(1, "Archer Tower"),
        { ...entity(2, "No Levels"), levels: {} },
      ];
      const progressionCandidate: ProgressionCandidate = {
        candidateId: "buildings:2:4",
        entityId: "2",
        category: "building",
        village: "home",
        currentLevel: 3,
        targetLevel: 4,
        prerequisites: [],
        estimate: {
          cost: { status: "unknown", reason: "missing-game-data" },
          durationMs: { status: "unknown", reason: "missing-game-data" },
        },
      };

      const candidates = getPlannerLevelEditorCandidates(entities, {
        category: "building",
        query: "",
        currentLevels: { "1": 4 },
        manualOverrides: { "1": 4 },
      }, [progressionCandidate]);

      expect(candidates).toEqual([
        { entity: entities[0], maxLevel: 2 },
        { entity: entities[1], maxLevel: 4 },
      ]);
    });
  });

  it("keeps saved manual values editable when an entity is absent from the snapshot", () => {
    expect(resolvePlannerCatalogLevelState(
      { "7": 2 },
      {},
    )).toEqual({
      currentLevels: { "7": 2 },
      manualOverrides: { "7": 2 },
    });
  });

  it("does not mutate either input", () => {
    const saved = { "1": 2 };
    const imported = { "2": 3 };

    resolvePlannerCatalogLevelState(saved, imported);

    expect(saved).toEqual({ "1": 2 });
    expect(imported).toEqual({ "2": 3 });
  });
});
