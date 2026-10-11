jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

import { getDB } from "@/db/database";
import {
  getReEngagementBoostSettings,
  saveReEngagementBoostSettings,
} from "@/services/reEngagementBoostService";
import type { ReEngagementBoostSettings } from "@/types/reEngagementBoost";

type MockDb = {
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
};

describe("reEngagementBoostService", () => {
  let db: MockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    };
    (getDB as jest.Mock).mockResolvedValue(db);
  });

  it("defaults to inactive boosts for an account with no saved configuration", async () => {
    db.getFirstAsync.mockResolvedValue(null);

    await expect(getReEngagementBoostSettings("#ACCOUNT")).resolves.toEqual({
      accountTag: "#ACCOUNT",
      builderBoostPercent: 0,
      builderBoostExpiresAt: null,
      researchBoostPercent: 0,
      researchBoostExpiresAt: null,
    });
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("FROM re_engagement_boost_settings"),
      ["#ACCOUNT"],
    );
  });

  it("reads the saved percentages and expiry timestamps for the requested account", async () => {
    db.getFirstAsync.mockResolvedValue({
      account_player_tag: "#ACCOUNT",
      builder_boost_percent: 25,
      builder_boost_expires_at: 1_800_000_100_000,
      research_boost_percent: 40,
      research_boost_expires_at: null,
    });

    await expect(getReEngagementBoostSettings("#ACCOUNT")).resolves.toEqual({
      accountTag: "#ACCOUNT",
      builderBoostPercent: 25,
      builderBoostExpiresAt: 1_800_000_100_000,
      researchBoostPercent: 40,
      researchBoostExpiresAt: null,
    });
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_player_tag = ?"),
      ["#ACCOUNT"],
    );
  });

  it("saves both boosts by account-scoped upsert", async () => {
    const settings: ReEngagementBoostSettings = {
      accountTag: "#ACCOUNT",
      builderBoostPercent: 25,
      builderBoostExpiresAt: 1_800_000_100_000,
      researchBoostPercent: 40,
      researchBoostExpiresAt: 1_800_000_200_000,
    };

    await saveReEngagementBoostSettings(settings);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT(account_player_tag) DO UPDATE SET"),
      ["#ACCOUNT", 25, 1_800_000_100_000, 40, 1_800_000_200_000],
    );
  });

  it.each([-1, 101, 1.5, Number.NaN])(
    "rejects invalid builder percentages (%s) before writing",
    async (percent) => {
      await expect(saveReEngagementBoostSettings({
        accountTag: "#ACCOUNT",
        builderBoostPercent: percent,
        builderBoostExpiresAt: null,
        researchBoostPercent: 0,
        researchBoostExpiresAt: null,
      })).rejects.toThrow("INVALID_RE_ENGAGEMENT_BUILDER_BOOST_PERCENT");
      expect(db.runAsync).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid expiry timestamps", async () => {
    await expect(saveReEngagementBoostSettings({
      accountTag: "#ACCOUNT",
      builderBoostPercent: 20,
      builderBoostExpiresAt: -1,
      researchBoostPercent: 0,
      researchBoostExpiresAt: null,
    })).rejects.toThrow("INVALID_RE_ENGAGEMENT_BUILDER_BOOST_EXPIRY");
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("rejects an empty account tag before accessing storage", async () => {
    await expect(getReEngagementBoostSettings("   ")).rejects.toThrow("INVALID_ACCOUNT_TAG");
    expect(getDB).not.toHaveBeenCalled();
  });
});
