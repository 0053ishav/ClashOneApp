import { calculateSuperchargeProgression } from "@/engine/progression/operations/calculateSuperchargeProgression";
import { getGoldPassBoostSettings } from "@/services/goldPassBoostService";
import { getReEngagementBoostSettings } from "@/services/reEngagementBoostService";
import { getActiveMagicEffects } from "@/services/magicItemService";
import type { ProgressionData } from "@/types/progression";

jest.mock("@/services/goldPassBoostService", () => ({
  getGoldPassBoostSettings: jest.fn(),
}));
jest.mock("@/services/reEngagementBoostService", () => ({
  getReEngagementBoostSettings: jest.fn(),
}));
jest.mock("@/services/magicItemService", () => ({
  getActiveMagicEffects: jest.fn(),
}));

const mockedGoldPass = jest.mocked(getGoldPassBoostSettings);
const mockedReEngagement = jest.mocked(getReEngagementBoostSettings);
const mockedMagicEffects = jest.mocked(getActiveMagicEffects);

const accountTag = "#PLAYER";
const data: Pick<ProgressionData, "scMaxLevel" | "supercharge"> = {
  scMaxLevel: 3,
  supercharge: {
    1: { hallLevel: 16, cost: 1_000, upgradeTime: 3_600 },
    2: { hallLevel: 16, cost: 2_000, upgradeTime: 7_200 },
    3: { hallLevel: 17, cost: 3_000, upgradeTime: 10_800 },
  },
};

describe("calculateSuperchargeProgression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGoldPass.mockResolvedValue({
      accountTag,
      builderBoostPercent: 0,
      researchBoostPercent: 0,
    });
    mockedReEngagement.mockResolvedValue({
      accountTag,
      builderBoostPercent: 0,
      builderBoostExpiresAt: null,
      researchBoostPercent: 0,
      researchBoostExpiresAt: null,
    });
    mockedMagicEffects.mockResolvedValue([]);
  });

  it("calculates next and total costs independently of normal building levels", async () => {
    await expect(calculateSuperchargeProgression(data, 0, { accountTag })).resolves.toEqual({
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

  it("sums only levels remaining after the current charge level", async () => {
    await expect(calculateSuperchargeProgression(data, 1, { accountTag })).resolves.toMatchObject({
      currentLevel: 1,
      nextLevel: 2,
      remainingLevels: 2,
      nextCost: 2_000,
      totalCost: 5_000,
      totalUpgradeTime: 18_000,
    });
  });

  it("excludes the already-paid in-progress charge from future totals", async () => {
    await expect(calculateSuperchargeProgression(data, 1, {
      accountTag,
      inProgressLevel: 2,
    })).resolves.toMatchObject({
      currentLevel: 1,
      nextLevel: 2,
      remainingLevels: 1,
      nextCost: 2_000,
      totalCost: 3_000,
      totalUpgradeTime: 10_800,
    });
  });

  it("applies account Gold Pass and active Re-engagement Builder Boosts multiplicatively", async () => {
    mockedGoldPass.mockResolvedValue({
      accountTag,
      builderBoostPercent: 20,
      researchBoostPercent: 0,
    });
    mockedReEngagement.mockResolvedValue({
      accountTag,
      builderBoostPercent: 50,
      builderBoostExpiresAt: Date.now() + 60_000,
      researchBoostPercent: 0,
      researchBoostExpiresAt: null,
    });

    await expect(calculateSuperchargeProgression(data, 0, { accountTag })).resolves.toMatchObject({
      nextCost: 400,
      nextUpgradeTime: 1_440,
      totalCost: 2_400,
      totalUpgradeTime: 8_640,
      appliedModifierIds: [
        "gold-pass-builder-boost",
        "re-engagement-builder-boost",
      ],
    });
    expect(mockedGoldPass).toHaveBeenCalledWith(accountTag);
    expect(mockedReEngagement).toHaveBeenCalledWith(accountTag);
    expect(mockedMagicEffects).toHaveBeenCalledWith(accountTag);
  });

  it("does not apply an expired Re-engagement boost", async () => {
    mockedReEngagement.mockResolvedValue({
      accountTag,
      builderBoostPercent: 50,
      builderBoostExpiresAt: Date.now() - 1,
      researchBoostPercent: 0,
      researchBoostExpiresAt: null,
    });

    await expect(calculateSuperchargeProgression(data, 0, { accountTag })).resolves.toMatchObject({
      nextCost: 1_000,
      nextUpgradeTime: 3_600,
    });
  });

  it("applies active timed Magic Item effects to the next charge only", async () => {
    mockedMagicEffects.mockResolvedValue([{
      id: "active-builder-potion",
      itemId: "builder-potion",
      startedAt: Date.now() - 1_000,
      expiresAt: Date.now() + 3_600_000,
      village: "home",
    }]);

    const result = await calculateSuperchargeProgression(data, 0, { accountTag });
    expect(result.nextUpgradeTime).toBeLessThan(3_600);
    expect(result.totalUpgradeTime).toBe(21_600);
  });

  it("does not project a new timed effect onto an already-started charge", async () => {
    mockedMagicEffects.mockResolvedValue([{
      id: "active-builder-potion",
      itemId: "builder-potion",
      startedAt: Date.now() - 1_000,
      expiresAt: Date.now() + 3_600_000,
      village: "home",
    }]);

    await expect(calculateSuperchargeProgression(data, 0, {
      accountTag,
      inProgressLevel: 1,
    })).resolves.toMatchObject({
      nextUpgradeTime: 3_600,
      totalUpgradeTime: 18_000,
    });
  });

  it("rejects an empty account tag", async () => {
    await expect(calculateSuperchargeProgression(data, 0, { accountTag: " " }))
      .rejects.toThrow("INVALID_ACCOUNT_TAG");
  });
});
