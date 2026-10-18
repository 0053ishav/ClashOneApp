import { calculateSuperchargeProgression } from "@/engine/progression/operations/calculateSuperchargeProgression";
import type { ProgressionData } from "@/types/progression";

const data: Pick<ProgressionData, "scMaxLevel" | "supercharge"> = {
  scMaxLevel: 3,
  supercharge: {
    1: { hallLevel: 16, cost: 1_000, upgradeTime: 3_600 },
    2: { hallLevel: 16, cost: 2_000, upgradeTime: 7_200 },
    3: { hallLevel: 17, cost: 3_000, upgradeTime: 10_800 },
  },
};

describe("calculateSuperchargeProgression", () => {
  it("calculates next and total costs independently of normal max level", () => {
    expect(calculateSuperchargeProgression(data, 0)).toEqual({
      currentLevel: 0,
      nextLevel: 1,
      maxLevel: 3,
      remainingLevels: 3,
      nextCost: 1_000,
      nextUpgradeTime: 3_600,
      totalCost: 6_000,
      totalUpgradeTime: 21_600,
    });
  });

  it("sums only levels remaining after the current charge level", () => {
    expect(calculateSuperchargeProgression(data, 1)).toMatchObject({
      currentLevel: 1,
      nextLevel: 2,
      remainingLevels: 2,
      nextCost: 2_000,
      totalCost: 5_000,
      totalUpgradeTime: 18_000,
    });
  });

  it("excludes the already-paid in-progress charge from future totals", () => {
    expect(calculateSuperchargeProgression(data, 1, { inProgressLevel: 2 })).toMatchObject({
      currentLevel: 1,
      nextLevel: 2,
      remainingLevels: 1,
      nextCost: 2_000,
      totalCost: 3_000,
      totalUpgradeTime: 10_800,
    });
  });

  it("returns no next upgrade and zero remaining cost when fully charged", () => {
    expect(calculateSuperchargeProgression(data, 3)).toEqual({
      currentLevel: 3,
      maxLevel: 3,
      remainingLevels: 0,
      totalCost: 0,
      totalUpgradeTime: 0,
    });
  });

  it("handles missing supercharge data without inventing costs", () => {
    expect(calculateSuperchargeProgression({ scMaxLevel: 2 }, 0)).toEqual({
      currentLevel: 0,
      nextLevel: 1,
      maxLevel: 2,
      remainingLevels: 2,
    });
  });

  it("normalizes current charge levels to the supported range", () => {
    expect(calculateSuperchargeProgression(data, 99)).toMatchObject({
      currentLevel: 3,
      remainingLevels: 0,
      totalCost: 0,
    });
    expect(calculateSuperchargeProgression(data, -5).currentLevel).toBe(0);
  });
});
