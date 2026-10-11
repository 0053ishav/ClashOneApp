import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";
import type { CraftedProgressionResult } from "@/engine/crafted/model";
import { applyBoostsToCraftedProgressionResult } from "@/services/progression/applyBoostsToCraftedProgressionResult";
import { ResourceType } from "@/types/resource";

const EVENT_START = Date.parse("2026-11-01T00:00:00+05:30");
const EVENT_END = Date.parse("2026-11-17T00:00:00+05:30");

const activeHammerJam = {
  ...DEFAULT_HAMMER_JAM_MANIFEST,
  enabled: true,
  startsAt: new Date(EVENT_START).toISOString(),
  endsAt: new Date(EVENT_END).toISOString(),
};

const baseResult: CraftedProgressionResult = {
  dataId: 100,
  defenseName: "Crafted Defense",
  moduleId: 1,
  moduleName: "Module",
  currentLevel: 1,
  nextLevel: 2,
  maxLevel: 5,
  remainingLevels: 4,
  isMaxLevel: false,
  resource: ResourceType.GOLD,
  nextCost: 1_000,
  nextUpgradeTime: 120,
  remainingCost: 3_000,
  remainingUpgradeTime: 360,
  currentHallLevel: 16,
  requiredHallLevel: 1,
  sparkyStones: undefined,
  currentStats: {},
  nextStats: {},
  progressPercent: 20,
  achievableLevel: 5,
};

describe("applyBoostsToCraftedProgressionResult", () => {
  it("does not apply Re-engagement Builder Boost to crafted-defense cost", () => {
    const result = applyBoostsToCraftedProgressionResult(baseResult, {
      village: "home",
      goldPassBoost: { target: "builder", percent: 20 },
      reEngagementBoost: { target: "builder", percent: 50 },
    });

    expect(result).toMatchObject({
      nextCost: 800,
      remainingCost: 2_400,
      nextUpgradeTime: 48,
      remainingUpgradeTime: 144,
      appliedModifierIds: [
        "gold-pass-builder-boost",
        "re-engagement-builder-boost",
      ],
    });
  });

  it("compounds Hammer Jam, Gold Pass, and Re-engagement sequentially", () => {
    const result = applyBoostsToCraftedProgressionResult(baseResult, {
      village: "home",
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
      goldPassBoost: { target: "builder", percent: 20 },
      reEngagementBoost: { target: "builder", percent: 50 },
    });

    // 1,000 × 0.5 Hammer Jam × 0.8 Gold Pass = 400.
    // 120 × 0.5 Hammer Jam × 0.8 Gold Pass × 0.5 Re-engagement = 24.
    expect(result).toMatchObject({
      nextCost: 400,
      remainingCost: 2_400,
      nextUpgradeTime: 24,
      remainingUpgradeTime: 144,
      appliedModifierIds: [
        "hammer-jam",
        "gold-pass-builder-boost",
        "re-engagement-builder-boost",
      ],
    });
  });
});
