const values = new Map<string, string>();

jest.mock("@/storage/mmkv", () => ({
  storage: {
    getString: (key: string) => values.get(key),
    set: (key: string, value: string) => values.set(key, value),
  },
}));

import {
  loadPlannerCatalogLevelOverrides,
  savePlannerCatalogLevelOverrides,
} from "@/services/plannerCatalogLevelStorage";

describe("planner catalog level storage", () => {
  beforeEach(() => values.clear());

  it("isolates saved levels by account", () => {
    savePlannerCatalogLevelOverrides("#AAA", { "1": 4, "2": 0 });
    savePlannerCatalogLevelOverrides("#BBB", { "1": 8 });

    expect(loadPlannerCatalogLevelOverrides("#AAA")).toEqual({ "1": 4, "2": 0 });
    expect(loadPlannerCatalogLevelOverrides("#BBB")).toEqual({ "1": 8 });
  });

  it("ignores malformed storage and invalid levels", () => {
    values.set("planner_catalog_levels_%23AAA", JSON.stringify({
      "1": 3,
      "2": -1,
      "3": 1.5,
      "4": "5",
      "": 2,
    }));
    expect(loadPlannerCatalogLevelOverrides("#AAA")).toEqual({ "1": 3 });

    values.set("planner_catalog_levels_%23BBB", "{broken");
    expect(loadPlannerCatalogLevelOverrides("#BBB")).toEqual({});
  });

  it("rejects empty account tags", () => {
    expect(() => loadPlannerCatalogLevelOverrides(" ")).toThrow("INVALID_ACCOUNT_TAG");
    expect(() => savePlannerCatalogLevelOverrides("", {})).toThrow("INVALID_ACCOUNT_TAG");
  });
});
