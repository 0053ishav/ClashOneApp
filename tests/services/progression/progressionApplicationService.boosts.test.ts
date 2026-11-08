import {
  EntityProgressionService,
  ProgressionService,
} from "@/engine/progression";
import { ProgressionApplicationService } from "@/services/progression/progressionApplicationService";
import { ProgressionQueries } from "@/services/progression/progressionQueries";
import { PlayerLevelResolver } from "@/services/progression/playerLevelResolver";
import { getGoldPassBoostSettings } from "@/services/goldPassBoostService";
import { getReEngagementBoostSettings } from "@/services/reEngagementBoostService";
import { useAccountStore } from "@/stores/accountStore";
import { useHammerJamStore } from "@/stores/hammerJamStore";
import type { Upgrade } from "@/types/upgrade";

jest.mock("@/engine/progression", () => ({
  EntityProgressionService: { create: jest.fn() },
  ProgressionService: { resolve: jest.fn() },
}));

jest.mock("@/services/progression/progressionQueries", () => ({
  ProgressionQueries: {
    getEntity: jest.fn(),
    getProgression: jest.fn(),
  },
}));

jest.mock("@/services/progression/playerLevelResolver", () => ({
  PlayerLevelResolver: { resolveUpgrade: jest.fn() },
}));

jest.mock("@/services/goldPassBoostService", () => ({
  getGoldPassBoostSettings: jest.fn(),
}));

jest.mock("@/services/reEngagementBoostService", () => ({
  getReEngagementBoostSettings: jest.fn(),
}));

jest.mock("@/stores/accountStore", () => ({
  useAccountStore: { getState: jest.fn() },
}));

jest.mock("@/stores/hammerJamStore", () => ({
  useHammerJamStore: { getState: jest.fn() },
}));

const accountTag = "#PLAYER";
const resolvedEntity = { id: 123, category: "building", village: "home" };
const entity = { id: 123, type: "building", village: "home" };
const progression = { id: 123, maxLevel: 20, levels: {} };
const expectedResult = { dataId: 123, currentLevel: 1 };
const upgrade = {
  id: "upgrade-1",
  accountTag,
  village: "home",
  dataId: 123,
  entity: "Archer Tower",
  type: "BUILDING",
  upgradeType: "BUILDER",
  currentLevel: 1,
  startTime: 0,
  durationMinutes: 0,
  endTime: 0,
  isCompleted: false,
} satisfies Upgrade;

const mockedGoldPassSettings = jest.mocked(getGoldPassBoostSettings);
const mockedReEngagementSettings = jest.mocked(getReEngagementBoostSettings);
const mockedEntityLookup = jest.mocked(ProgressionQueries.getEntity);
const mockedProgressionLookup = jest.mocked(ProgressionQueries.getProgression);
const mockedEntityCreate = jest.mocked(EntityProgressionService.create);
const mockedResolve = jest.mocked(ProgressionService.resolve);

describe("ProgressionApplicationService account boost resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedEntityLookup.mockReturnValue(entity as never);
    mockedProgressionLookup.mockReturnValue(progression as never);
    mockedEntityCreate.mockReturnValue(resolvedEntity as never);
    jest.mocked(PlayerLevelResolver.resolveUpgrade).mockReturnValue(1);
    mockedResolve.mockReturnValue(expectedResult as never);

    mockedGoldPassSettings.mockResolvedValue({
      accountTag,
      builderBoostPercent: 20,
      researchBoostPercent: 15,
    });
    mockedReEngagementSettings.mockResolvedValue({
      accountTag,
      builderBoostPercent: 30,
      builderBoostExpiresAt: Date.now() + 60 * 60 * 1000,
      researchBoostPercent: 25,
      researchBoostExpiresAt: Date.now() + 60 * 60 * 1000,
    });

    jest.mocked(useAccountStore.getState).mockReturnValue({
      getProfile: jest.fn(() => ({
        townHallLevel: 18,
        builderHallLevel: 10,
      })),
    } as never);
    jest.mocked(useHammerJamStore.getState).mockReturnValue({
      manifest: { enabled: false },
    } as never);
  });

  it("loads account settings and resolves both boosts inside the application service", async () => {
    await expect(
      ProgressionApplicationService.resolveUpgrade(upgrade),
    ).resolves.toBe(expectedResult);

    expect(mockedGoldPassSettings).toHaveBeenCalledWith(accountTag);
    expect(mockedReEngagementSettings).toHaveBeenCalledWith(accountTag);
    expect(mockedResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        goldPassBoost: { target: "builder", percent: 20 },
        reEngagementBoost: { target: "builder", percent: 30 },
      }),
    );
  });

  it("does not apply an expired Re-engagement boost", async () => {
    mockedReEngagementSettings.mockResolvedValue({
      accountTag,
      builderBoostPercent: 30,
      builderBoostExpiresAt: Date.now() - 1,
      researchBoostPercent: 25,
      researchBoostExpiresAt: Date.now() - 1,
    });

    await ProgressionApplicationService.resolveUpgrade(upgrade);

    expect(mockedResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        goldPassBoost: { target: "builder", percent: 20 },
      }),
    );
    expect(mockedResolve).toHaveBeenCalledWith(
      expect.not.objectContaining({
        reEngagementBoost: expect.anything(),
      }),
    );
  });

  it("does not apply Home Village boosts to Builder Base upgrades", async () => {
    const builderBaseUpgrade: Upgrade = {
      ...upgrade,
      village: "builderBase",
    };
    mockedEntityLookup.mockReturnValue({
      ...entity,
      village: "builderBase",
    } as never);

    await ProgressionApplicationService.resolveUpgrade(builderBaseUpgrade);

    expect(mockedResolve).toHaveBeenCalledWith(
      expect.not.objectContaining({
        goldPassBoost: expect.anything(),
        reEngagementBoost: expect.anything(),
      }),
    );
  });
});
