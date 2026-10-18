import { importVillageJson } from "@/services/jsonImport/jsonImportService";
import {
  getGoldPassBoostSettings,
  saveGoldPassBoostSettings,
} from "@/services/goldPassBoostService";
import { ProgressionApplicationService } from "@/services/progression";
import { ProgressionQueries } from "@/services/progression/progressionQueries";
import { useAccountStore } from "@/stores/accountStore";
import { getAccountByTag, updateAccount } from "@/services/accountService";
import { fetchPlayerFromApi } from "@/services/clashApi";
import { saveReEngagementBoostSettings } from "@/services/reEngagementBoostService";
import type { BuildingProgressRecord, Upgrade } from "@/types/upgrade";
import type { GoldPassBoostSettings } from "@/types/goldPass";

jest.mock("@/services/accountService", () => ({
  addAccount: jest.fn(),
  getAccountByTag: jest.fn(),
  updateAccount: jest.fn(),
}));

jest.mock("@/services/clashApi", () => ({
  fetchPlayerFromApi: jest.fn(),
}));

jest.mock("@/services/craftedService", () => ({
  ensureCraftedLoaded: jest.fn(),
}));

jest.mock("@/services/progression", () => ({
  ProgressionApplicationService: {
    resolveUpgrade: jest.fn(),
  },
}));

jest.mock("@/services/progression/progressionQueries", () => ({
  ProgressionQueries: {
    getProgression: jest.fn(),
  },
}));

jest.mock("@/services/goldPassBoostService", () => ({
  getGoldPassBoostSettings: jest.fn(),
  saveGoldPassBoostSettings: jest.fn(),
}));

jest.mock("@/services/reEngagementBoostService", () => ({
  getReEngagementBoostSettings: jest.fn(),
  saveReEngagementBoostSettings: jest.fn(),
}));

jest.mock("@/storage/jsonSyncStorage", () => ({
  setLastJsonSync: jest.fn(),
}));

jest.mock("@/storage/playerProfile", () => ({
  syncProfileFromApi: jest.fn(),
}));

jest.mock("@/stores/accountStore", () => ({
  useAccountStore: {
    getState: jest.fn(),
  },
}));

jest.mock("@/utils/analytics/analytics", () => ({
  getSessionSource: jest.fn(() => "test"),
  track: jest.fn(),
}));

jest.mock("@/utils/getEntity", () => ({
  getEntity: jest.fn(() => ({
    id: 123456,
    slug: "archer-tower",
    village: "home",
    type: "building",
    name: { en: "Archer Tower" },
  })),
}));

jest.mock("@/utils/helpers/projectHelperTimer", () => ({
  projectHelperTimer: jest.fn(),
}));

jest.mock("@/utils/notificationSync", () => ({
  resyncNotifications: jest.fn(),
}));

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid"),
}));

jest.mock("@/services/magicItemService", () => ({
  clearActiveMagicEffects: jest.fn(),
  replaceImportedBoostSnapshot: jest.fn(),
}));

const accountTag = "#TEST123";
const otherAccountTag = "#OTHER456";
const exportTimestampMs = Date.UTC(2026, 0, 10, 12, 0, 0);
const exportedRemainingSeconds = 60 * 60;

const originalSettings: GoldPassBoostSettings = {
  accountTag,
  builderBoostPercent: 15,
  researchBoostPercent: 20,
};

const otherAccountSettings: GoldPassBoostSettings = {
  accountTag: otherAccountTag,
  builderBoostPercent: 10,
  researchBoostPercent: 0,
};

const persistedSettings = new Map<string, GoldPassBoostSettings>();
const importedUpgradeSnapshots: Upgrade[][] = [];
const importedBuildingProgressSnapshots: BuildingProgressRecord[][] = [];

const mockImportJsonData = jest.fn(
  async (_tag: string, upgrades: Upgrade[], _entities: unknown[], buildingProgress: BuildingProgressRecord[] = []) => {
    importedUpgradeSnapshots.push(upgrades);
    importedBuildingProgressSnapshots.push(buildingProgress);
  },
);

const mockAccountStoreState = {
  switchAccount: jest.fn(async () => undefined),
  importJsonData: mockImportJsonData,
  setLastSync: jest.fn(),
  setProfile: jest.fn(),
};

function makeExport(): string {
  return JSON.stringify({
    tag: accountTag,
    timestamp: exportTimestampMs / 1000,
    buildings: [
      { data: 1000015, lvl: 5, cnt: 5 },
      { data: 123456, lvl: 1, timer: exportedRemainingSeconds },
    ],
  });
}

describe("importVillageJson Gold Pass regression coverage", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    persistedSettings.clear();
    persistedSettings.set(accountTag, { ...originalSettings });
    persistedSettings.set(otherAccountTag, { ...otherAccountSettings });
    importedUpgradeSnapshots.length = 0;
    importedBuildingProgressSnapshots.length = 0;

    jest.spyOn(Date, "now").mockReturnValue(exportTimestampMs + 1_000);

    jest.mocked(getGoldPassBoostSettings).mockImplementation(async (tag) => {
      return persistedSettings.get(tag) ?? {
        accountTag: tag,
        builderBoostPercent: 0,
        researchBoostPercent: 0,
      };
    });

    jest.mocked(saveGoldPassBoostSettings).mockImplementation(async (settings) => {
      persistedSettings.set(settings.accountTag, { ...settings });
    });

    jest.mocked(getAccountByTag).mockResolvedValue(null as never);
    jest.mocked(fetchPlayerFromApi).mockResolvedValue(null as never);

    jest.mocked(ProgressionApplicationService.resolveUpgrade).mockReturnValue({
      currentLevel: 1,
      nextLevel: 2,
      nextUpgradeTime: 24 * 60 * 60,
    } as unknown as ReturnType<typeof ProgressionApplicationService.resolveUpgrade>);

    jest.mocked(useAccountStore.getState).mockReturnValue(
      mockAccountStoreState as unknown as ReturnType<typeof useAccountStore.getState>,
    );
  });


  it("uses configured builder capacity when the export under-reports builders", async () => {
    jest.mocked(getAccountByTag).mockResolvedValue({
      tag: accountTag,
      name: "Existing Chief",
      color: "#fbbf24",
      townhall: 18,
      builderCount: 6,
      builderBaseBuilderCount: 3,
    } as never);

    const rawExport = JSON.stringify({
      tag: accountTag,
      timestamp: exportTimestampMs / 1000,
      buildings: [
        { data: 1000015, lvl: 5, cnt: 2 },
        { data: 123456, lvl: 1, timer: exportedRemainingSeconds },
        { data: 123457, lvl: 1, timer: exportedRemainingSeconds + 60 },
        { data: 123458, lvl: 1, timer: exportedRemainingSeconds + 120 },
        { data: 123459, lvl: 1, timer: exportedRemainingSeconds + 180 },
      ],
    });

    await importVillageJson(rawExport);

    expect(importedUpgradeSnapshots[0]).toHaveLength(4);
    expect(importedUpgradeSnapshots[0].map((upgrade) => upgrade.builderSlot))
      .toEqual([0, 1, 2, 3]);
  });

  it("does not reduce configured builder counts during import", async () => {
    jest.mocked(getAccountByTag).mockResolvedValue({
      tag: accountTag,
      name: "Existing Chief",
      color: "#fbbf24",
      townhall: 18,
      builderCount: 6,
      builderBaseBuilderCount: 3,
    } as never);

    await importVillageJson(makeExport());

    expect(updateAccount).toHaveBeenCalledWith(
      accountTag,
      "Existing Chief",
      "#fbbf24",
      18,
      6,
      3,
    );
  });

  it("imports an active Supercharge timer without changing the normal building level", async () => {
    const remainingSeconds = 318_348;
    const rawExport = JSON.stringify({
      tag: accountTag,
      timestamp: exportTimestampMs / 1000,
      buildings: [
        { data: 1000015, lvl: 5, cnt: 5 },
        { data: 1000077, lvl: 5, timer: remainingSeconds, supercharge: 0 },
      ],
    });

    jest.mocked(ProgressionQueries.getProgression).mockReturnValue({
      id: 1000077,
      maxLevel: 5,
      scMaxLevel: 2,
      maxHallLevel: 18,
      resource: "gold",
      levels: {},
      supercharge: {
        1: { hallLevel: 18, cost: 1, upgradeTime: 432_000 },
        2: { hallLevel: 18, cost: 1, upgradeTime: 604_800 },
      },
    } as never);

    await importVillageJson(rawExport);

    const [importedUpgrade] = importedUpgradeSnapshots[0];
    expect(importedUpgrade.upgradeKind).toBe("SUPERCHARGE");
    expect(importedUpgrade.currentLevel).toBe(5);
    expect(importedUpgrade.nextLevel).toBe(5);
    expect(importedUpgrade.currentSuperchargeLevel).toBe(0);
    expect(importedUpgrade.nextSuperchargeLevel).toBe(1);
    expect(importedUpgrade.endTime).toBe(
      exportTimestampMs + remainingSeconds * 1_000,
    );
    expect(importedBuildingProgressSnapshots[0]).toContainEqual(
      expect.objectContaining({
        dataId: 1000077,
        normalLevel: 5,
        superchargeLevel: 0,
      }),
    );
  });


  it("preserves completed Supercharge levels even when no upgrade timer is active", async () => {
    const rawExport = JSON.stringify({
      tag: accountTag,
      timestamp: exportTimestampMs / 1000,
      buildings: [
        { data: 1000015, lvl: 5, cnt: 5 },
        { data: 1000077, lvl: 5, cnt: 1, supercharge: 1 },
      ],
    });

    await importVillageJson(rawExport);

    expect(importedUpgradeSnapshots[0]).toHaveLength(0);
    expect(importedBuildingProgressSnapshots[0]).toContainEqual(
      expect.objectContaining({
        dataId: 1000077,
        normalLevel: 5,
        count: 1,
        superchargeLevel: 1,
      }),
    );
  });

  it("does not persist an active Supercharge when its progression metadata is missing", async () => {
    const rawExport = JSON.stringify({
      tag: accountTag,
      timestamp: exportTimestampMs / 1000,
      buildings: [
        { data: 1000015, lvl: 5, cnt: 5 },
        { data: 1000077, lvl: 5, timer: exportedRemainingSeconds, supercharge: 0 },
      ],
    });

    jest.mocked(ProgressionQueries.getProgression).mockReturnValue(undefined);

    await expect(importVillageJson(rawExport)).rejects.toThrow(
      "SUPERCHARGE_PROGRESSION_UNAVAILABLE",
    );
    expect(mockImportJsonData).not.toHaveBeenCalled();
  });

  it("preserves manually configured Gold Pass settings during JSON import", async () => {
    await importVillageJson(makeExport());

    expect(getGoldPassBoostSettings).toHaveBeenCalledWith(accountTag);
    expect(saveGoldPassBoostSettings).not.toHaveBeenCalled();
    expect(persistedSettings.get(accountTag)).toEqual(originalSettings);
    expect(persistedSettings.get(otherAccountTag)).toEqual(otherAccountSettings);
  });

  it("does not overwrite account-scoped re-engagement settings during import", async () => {
    await importVillageJson(makeExport());

    expect(saveReEngagementBoostSettings).not.toHaveBeenCalled();
  });

  it("re-importing the same export does not discount its remaining timer a second time", async () => {
    const rawExport = makeExport();

    await importVillageJson(rawExport);
    await importVillageJson(rawExport);

    expect(importedUpgradeSnapshots).toHaveLength(2);
    expect(importedUpgradeSnapshots[0]).toHaveLength(1);
    expect(importedUpgradeSnapshots[1]).toHaveLength(1);

    const firstImportedUpgrade = importedUpgradeSnapshots[0][0];
    const secondImportedUpgrade = importedUpgradeSnapshots[1][0];
    const expectedEndTime =
      exportTimestampMs + exportedRemainingSeconds * 1_000;

    // Exported remaining time is authoritative; the Gold Pass percentage only
    // affects reconstructed full duration, not the imported completion time.
    expect(firstImportedUpgrade.endTime).toBe(expectedEndTime);
    expect(secondImportedUpgrade.endTime).toBe(expectedEndTime);
    expect(secondImportedUpgrade.endTime).toBe(firstImportedUpgrade.endTime);
  });
});
