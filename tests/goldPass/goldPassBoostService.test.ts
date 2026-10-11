jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

import { getDB } from "@/db/database";
import {
  getGoldPassBoostSettings,
  saveGoldPassBoostSettings,
} from "@/services/goldPassBoostService";
import type { GoldPassBoostSettings } from "@/types/goldPass";

type MockDb = {
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
};

describe("goldPassBoostService", () => {
  let db: MockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    };
    (getDB as jest.Mock).mockResolvedValue(db);
  });

  it("defaults both discounts to zero when an account has no saved settings", async () => {
    db.getFirstAsync.mockResolvedValue(null);

    await expect(getGoldPassBoostSettings("#ACCOUNT")).resolves.toEqual({
      accountTag: "#ACCOUNT",
      builderBoostPercent: 0,
      researchBoostPercent: 0,
    });
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("FROM gold_pass_settings"),
      ["#ACCOUNT"],
    );
  });

  it("reads the saved discounts for the requested account", async () => {
    db.getFirstAsync.mockResolvedValue({
      account_player_tag: "#ACCOUNT",
      builder_boost_percent: 20,
      research_boost_percent: 10,
    });

    await expect(getGoldPassBoostSettings("#ACCOUNT")).resolves.toEqual({
      accountTag: "#ACCOUNT",
      builderBoostPercent: 20,
      researchBoostPercent: 10,
    });
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_player_tag = ?"),
      ["#ACCOUNT"],
    );
  });

  it("saves both discounts using an account-scoped upsert", async () => {
    const settings: GoldPassBoostSettings = {
      accountTag: "#ACCOUNT",
      builderBoostPercent: 15,
      researchBoostPercent: 20,
    };

    await saveGoldPassBoostSettings(settings);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT(account_player_tag) DO UPDATE SET"),
      ["#ACCOUNT", 15, 20],
    );
  });

  it("rejects percentages outside the supported choices before writing", async () => {
    const settings = {
      accountTag: "#ACCOUNT",
      builderBoostPercent: 12 as GoldPassBoostSettings["builderBoostPercent"],
      researchBoostPercent: 10,
    } satisfies GoldPassBoostSettings;

    await expect(saveGoldPassBoostSettings(settings)).rejects.toThrow(
      "INVALID_GOLD_PASS_BUILDER_BOOST_PERCENT",
    );
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("rejects invalid values returned by storage instead of silently accepting them", async () => {
    db.getFirstAsync.mockResolvedValue({
      account_player_tag: "#ACCOUNT",
      builder_boost_percent: 12,
      research_boost_percent: 10,
    });

    await expect(getGoldPassBoostSettings("#ACCOUNT")).rejects.toThrow(
      "INVALID_GOLD_PASS_BUILDER_BOOST_PERCENT",
    );
  });

  it("rejects an empty account tag before accessing storage", async () => {
    await expect(getGoldPassBoostSettings("   ")).rejects.toThrow(
      "INVALID_ACCOUNT_TAG",
    );
    expect(getDB).not.toHaveBeenCalled();
  });
});
