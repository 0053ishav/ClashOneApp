import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";
import { applyBoostsToCraftedProgressionResult } from "@/services/progression/applyBoostsToCraftedProgressionResult";
import type { CraftedProgressionResult } from "@/engine/crafted/model";
import { ResourceType } from "@/types/resource";

const startsAt = Date.parse("2026-11-03T12:00:00Z");
const hammerJam = {
  ...DEFAULT_HAMMER_JAM_MANIFEST,
  enabled: true,
  startsAt: "2026-11-01T00:00:00.000Z",
  endsAt: "2026-11-17T00:00:00.000Z",
};

function makeCraftedResult(
  overrides: Partial<CraftedProgressionResult> = {},
): CraftedProgressionResult {
  return {
    dataId: 1000097,
    defenseName: "Crafted Defense",
    moduleId: 1,
    moduleName: "Crafted Module",
    currentLevel: 1,
    nextLevel: 2,
    maxLevel: 10,
    remainingLevels: 9,
    isMaxLevel: false,
    resource: ResourceType.GOLD,
    nextCost: 1_000,
    nextUpgradeTime: 120,
    remainingCost: 3_000,
    remainingUpgradeTime: 360,
    currentHallLevel: 16,
    requiredHallLevel: 1,
    sparkyStones: 0,
    currentStats: {},
    nextStats: {},
    progressPercent: 10,
    achievableLevel: 10,
    ...overrides,
  };
}

describe("applyBoostsToCraftedProgressionResult", () => {
  it("does not apply Hammer Jam, Gold Pass, or Re-engagement to Home Village crafted defenses", () => {
    const original = makeCraftedResult();
    const result = applyBoostsToCraftedProgressionResult(original, {
      village: "home",
      upgradeStartContext: {
        startsAt,
        hammerJam,
      },
      goldPassBoost: { target: "builder", percent: 20 },
      reEngagementBoost: { target: "builder", percent: 50 },
    });

    expect(result).toBe(original);
    expect(result).toMatchObject({
      nextCost: 1_000,
      nextUpgradeTime: 120,
      remainingCost: 3_000,
      remainingUpgradeTime: 360,
    });
    expect(result.appliedModifierIds).toBeUndefined();
  });

  it("does not apply Home Village boosts to Builder Base crafted defenses", () => {
    const original = makeCraftedResult();
    const result = applyBoostsToCraftedProgressionResult(original, {
      village: "builderBase",
      upgradeStartContext: {
        startsAt,
        hammerJam,
      },
      goldPassBoost: { target: "builder", percent: 20 },
      reEngagementBoost: { target: "builder", percent: 50 },
    });

    expect(result).toBe(original);
  });

  it("does not treat a crafted defense as Laboratory research", () => {
    const original = makeCraftedResult();
    const result = applyBoostsToCraftedProgressionResult(original, {
      village: "home",
      goldPassBoost: { target: "research", percent: 20 },
      reEngagementBoost: { target: "research", percent: 50 },
    });

    expect(result).toBe(original);
  });

  it("does not alter a maxed crafted defense", () => {
    const original = makeCraftedResult({
      currentLevel: 10,
      nextLevel: undefined,
      isMaxLevel: true,
      nextCost: undefined,
      nextUpgradeTime: undefined,
      remainingLevels: 0,
      remainingCost: 0,
      remainingUpgradeTime: 0,
    });
    const result = applyBoostsToCraftedProgressionResult(original, {
      village: "home",
      goldPassBoost: { target: "builder", percent: 20 },
      reEngagementBoost: { target: "builder", percent: 50 },
    });

    expect(result).toBe(original);
  });
});
