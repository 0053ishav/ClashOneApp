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
  it("does not apply Hammer Jam, Gold Pass, or Re-engagement to crafted defenses", () => {
    const result = applyBoostsToCraftedProgressionResult(baseResult, {
      village: "home",
      upgradeStartContext: {
        startsAt: EVENT_START,
        hammerJam: activeHammerJam,
      },
      goldPassBoost: { target: "builder", percent: 20 },
      reEngagementBoost: { target: "builder", percent: 50 },
    });

    expect(result).toBe(baseResult);
    expect(result).toMatchObject({
      nextCost: 1_000,
      nextUpgradeTime: 120,
      remainingCost: 3_000,
      remainingUpgradeTime: 360,
    });
    expect(result.appliedModifierIds).toBeUndefined();
  });
});
