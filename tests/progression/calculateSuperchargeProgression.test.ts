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

  it("shows zero future charges while the final charge is already in progress", () => {
    expect(calculateSuperchargeProgression(data, 2, { inProgressLevel: 3 })).toEqual({
      currentLevel: 2,
      nextLevel: 3,
      maxLevel: 3,
      remainingLevels: 0,
      nextCost: 3_000,
      nextUpgradeTime: 10_800,
      totalCost: 0,
      totalUpgradeTime: 0,
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
  it("applies Gold Pass and Re-engagement Builder Boosts multiplicatively", () => {
    expect(
      calculateSuperchargeProgression(data, 0, {
        goldPassBoost: { target: "builder", percent: 20 },
        reEngagementBoost: { target: "builder", percent: 50 },
      }),
    ).toMatchObject({
      nextCost: 400,
      nextUpgradeTime: 1_440,
      totalCost: 2_400,
      totalUpgradeTime: 8_640,
      appliedModifierIds: [
        "gold-pass-builder-boost",
        "re-engagement-builder-boost",
      ],
    });
  });

  it("ignores Research-targeted boosts for building Supercharges", () => {
    expect(
      calculateSuperchargeProgression(data, 0, {
        goldPassBoost: { target: "research", percent: 20 },
        reEngagementBoost: { target: "research", percent: 50 },
      }),
    ).toMatchObject({
      nextCost: 1_000,
      nextUpgradeTime: 3_600,
      totalCost: 6_000,
      totalUpgradeTime: 21_600,
    });
  });

  it("applies active Builder Potion effects to the next charge only", () => {
    const result = calculateSuperchargeProgression(data, 0, {
      magicEffectsStartAt: 1_800_000_000_000,
      activeMagicEffects: [{
        id: "active-builder-potion",
        itemId: "builder-potion",
        startedAt: 1_800_000_000_000,
        expiresAt: 1_800_003_600_000,
        village: "home",
      }],
    });

    expect(result).toMatchObject({
      nextUpgradeTime: 360,
      totalUpgradeTime: 21_600,
    });
  });

  it("does not apply timed effects to future charges after the next one", () => {
    const result = calculateSuperchargeProgression(data, 0, {
      goldPassBoost: { target: "builder", percent: 20 },
      magicEffectsStartAt: 1_800_000_000_000,
      activeMagicEffects: [{
        id: "active-builder-bite",
        itemId: "builder-bite",
        startedAt: 1_800_000_000_000,
        expiresAt: 1_800_003_600_000,
        village: "home",
      }],
    });

    expect(result.nextUpgradeTime).toBe(1_440);
    // Gold Pass applies to all future levels; Builder Bite is consumed by
    // the next charge only and does not reduce the aggregate future estimate.
    expect(result.totalUpgradeTime).toBe(17_280);
  });

  it("requires a deterministic start timestamp when active magic effects are supplied", () => {
    expect(() =>
      calculateSuperchargeProgression(data, 0, {
        activeMagicEffects: [{
          id: "active-builder-potion",
          itemId: "builder-potion",
          startedAt: 1_800_000_000_000,
          village: "home",
        }],
      }),
    ).toThrow("INVALID_SUPERCHARGE_MAGIC_EFFECT_START_TIMESTAMP");
  });

});
