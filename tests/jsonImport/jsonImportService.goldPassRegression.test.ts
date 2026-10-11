import { importVillageJson } from "@/services/jsonImport/jsonImportService";
import {
  getGoldPassBoostSettings,
  saveGoldPassBoostSettings,
} from "@/services/goldPassBoostService";
import { ProgressionApplicationService } from "@/services/progression";
import { useAccountStore } from "@/stores/accountStore";
import { getAccountByTag } from "@/services/accountService";
import { fetchPlayerFromApi } from "@/services/clashApi";
import { saveReEngagementBoostSettings } from "@/services/reEngagementBoostService";
import type { Upgrade } from "@/types/upgrade";
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

const mockImportJsonData = jest.fn(
  async (_tag: string, upgrades: Upgrade[], _entities: unknown[]) => {
    importedUpgradeSnapshots.push(upgrades);
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
