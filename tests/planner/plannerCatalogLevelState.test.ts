import { resolvePlannerCatalogLevelState } from "@/services/plannerCatalogLevelState";

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
