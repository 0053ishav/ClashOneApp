import {
  validatePlannerDataset,
  type ProgressionCategoryInput,
} from "@/utils/planner/validatePlannerDataset";

function category(overrides: Partial<ProgressionCategoryInput> = {}): ProgressionCategoryInput {
  return {
    category: "buildings",
    village: "home",
    metadata: {
      status: "loaded",
      records: [{ id: 1, village: "home", maxLevel: 2 }],
    },
    progression: {
      status: "loaded",
      records: [{
        id: 1,
        maxLevel: 2,
        levels: {
          "1": { hallLevel: 2, cost: 100, upgradeTime: 60 },
          "2": { hallLevel: 3, cost: 0, upgradeTime: 0 },
        },
      }],
    },
    ...overrides,
  };
}

describe("validatePlannerDataset", () => {
  it("joins metadata and progression using stable IDs", () => {
    const result = validatePlannerDataset([category()]);
    expect(result.candidates.map((candidate) => candidate.candidateId)).toEqual([
      "buildings:1:1",
      "buildings:1:2",
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("preserves missing cost and duration as unknown while explicit zero stays known", () => {
    const result = validatePlannerDataset([category({
      progression: {
        status: "loaded",
        records: [{
          id: 1,
          maxLevel: 2,
          levels: {
            "1": { hallLevel: 2 },
            "2": { hallLevel: 3, cost: 0, upgradeTime: 0 },
          },
        }],
      },
    })]);
    expect(result.candidates[0].estimate.cost).toEqual({ status: "unknown", reason: "missing-game-data" });
    expect(result.candidates[0].estimate.durationMs).toEqual({ status: "unknown", reason: "missing-game-data" });
    expect(result.candidates[1].estimate.cost).toEqual({ status: "known", value: { gold: 0 } });
    expect(result.candidates[1].estimate.durationMs).toEqual({ status: "known", value: 0 });
    expect(result.diagnostics.map((item) => item.code)).toContain("missing-cost");
    expect(result.diagnostics.map((item) => item.code)).toContain("missing-duration");
  });

  it("distinguishes valid-empty categories from failed or missing categories", () => {
    const empty = category({
      metadata: { status: "loaded", records: [] },
      progression: { status: "loaded", records: [] },
    });
    const failed = category({
      metadata: { status: "failed", detail: "offline" },
      progression: { status: "loaded", records: [] },
    });
    const missing = category({
      metadata: { status: "missing" },
      progression: { status: "loaded", records: [] },
    });
    const result = validatePlannerDataset([empty, failed, missing]);
    expect(result.categoryStatus.buildings).toBe("unavailable");
    expect(result.diagnostics.map((item) => item.code)).toEqual(["category-fetch-failed", "category-missing"]);
    expect(validatePlannerDataset([empty]).categoryStatus.buildings).toBe("valid-empty");
  });

  it("diagnoses missing IDs, duplicates and unmatched metadata/progression", () => {
    const result = validatePlannerDataset([category({
      metadata: {
        status: "loaded",
        records: [{ id: 1, village: "home" }, { id: 1, village: "home" }, { name: "missing id" }],
      },
      progression: {
        status: "loaded",
        records: [
          { id: 1, maxLevel: 1, levels: { "1": { cost: 1, upgradeTime: 1 } } },
          { id: 2, maxLevel: 1, levels: { "1": { cost: 1, upgradeTime: 1 } } },
          { maxLevel: 1, levels: {} },
        ],
      },
    })]);
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).toContain("duplicate-entity-id");
    expect(codes).toContain("missing-entity-id");
    expect(codes).toContain("metadata-progression-mismatch");
  });

  it("normalizes known Home Village data and excludes Builder Base identifiers", () => {
    const result = validatePlannerDataset([category({
      metadata: { status: "loaded", records: [
        { id: 1, village: "home" },
        { id: 2, village: "builder" },
        { id: 3, village: "builderBase" },
      ] },
      progression: { status: "loaded", records: [
        { id: 1, maxLevel: 1, levels: { "1": { cost: 0, upgradeTime: 0 } } },
        { id: 2, maxLevel: 1, levels: { "1": { cost: 0, upgradeTime: 0 } } },
        { id: 3, maxLevel: 1, levels: { "1": { cost: 0, upgradeTime: 0 } } },
      ] },
    })]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].village).toBe("home");
    expect(result.diagnostics.filter((item) => item.code === "builder-base-excluded")).toHaveLength(2);
  });

  it("reports invalid max-level, levels, cost/time and prerequisites with entity-level context", () => {
    const result = validatePlannerDataset([category({
      metadata: { status: "loaded", records: [{ id: 1, village: "home", maxLevel: 5 }] },
      progression: { status: "loaded", records: [{
        id: 1,
        maxLevel: 2,
        levels: {
          "1": { hallLevel: -1, laboratoryLevel: "3", cost: -2, upgradeTime: Number.NaN },
          "3": { cost: 10, upgradeTime: 10 },
        },
      }] },
    })]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "max-level-mismatch", entityId: "1" }),
      expect.objectContaining({ code: "invalid-prerequisite", entityId: "1", level: 1 }),
      expect.objectContaining({ code: "invalid-cost", entityId: "1", level: 1 }),
      expect.objectContaining({ code: "invalid-duration", entityId: "1", level: 1 }),
      expect.objectContaining({ code: "invalid-level", entityId: "1", level: 3 }),
    ]));
  });

  it("excludes nested super troop/supercharge payloads from base candidates with a diagnostic", () => {
    const result = validatePlannerDataset([category({
      metadata: { status: "loaded", records: [{ id: 1, village: "home", superTroop: { id: "variant" } }] },
      progression: { status: "loaded", records: [{
        id: 1,
        maxLevel: 1,
        superTroop: { id: "variant", levels: { "1": { cost: 2 } } },
        supercharge: { "1": { cost: 2 } },
        levels: { "1": { cost: 1, upgradeTime: 1 } },
      }] },
    })]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].candidateId).toBe("buildings:1:1");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: "special-payload-excluded", entityId: "1" }),
    ]);
  });

  it("rejects malformed records and unsupported categories", () => {
    const malformed = category({
      metadata: { status: "loaded", records: [null, { id: 1, village: "home" }] },
      progression: { status: "loaded", records: [{ id: 1, maxLevel: 1, levels: [] }] },
    });
    const unsupported = category({ category: "helpers" });
    const result = validatePlannerDataset([malformed, unsupported]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing-entity-id" }),
      expect.objectContaining({ code: "malformed-category" }),
      expect.objectContaining({ code: "special-payload-excluded", category: "helpers" }),
    ]));
  });
});
