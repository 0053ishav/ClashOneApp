import { clearTrackedUpgrades, resetVillageData } from "@/services/accountService";
import { getDB } from "@/db/database";

jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

const mockGetDB = jest.mocked(getDB);

function setupDatabase(
  overrides: {
    runAsync?: jest.Mock;
    execAsync?: jest.Mock;
  } = {},
) {
  const db = {
    runAsync: overrides.runAsync ?? jest.fn().mockResolvedValue({ changes: 1 }),
    execAsync: overrides.execAsync ?? jest.fn().mockResolvedValue(undefined),
  };

  mockGetDB.mockResolvedValue(
    db as unknown as Awaited<ReturnType<typeof getDB>>,
  );

  return db;
}

describe("account cleanup operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears only tracked upgrades for the requested village", async () => {
    const db = setupDatabase();

    await clearTrackedUpgrades("#PLAYER");

    expect(db.runAsync).toHaveBeenCalledWith(
      "DELETE FROM upgrades WHERE account_player_tag = ?",
      ["#PLAYER"],
    );
    expect(db.execAsync).not.toHaveBeenCalled();
  });

  it("resets all imported village progression in one transaction", async () => {
    const db = setupDatabase();

    await resetVillageData("#PLAYER");

    expect(db.execAsync.mock.calls).toEqual([
      ["BEGIN TRANSACTION"],
      ["COMMIT"],
    ]);
    expect(db.runAsync.mock.calls).toEqual([
      ["DELETE FROM upgrades WHERE account_player_tag = ?", ["#PLAYER"]],
      ["DELETE FROM entities WHERE account_player_tag = ?", ["#PLAYER"]],
      ["DELETE FROM building_progress WHERE account_player_tag = ?", ["#PLAYER"]],
      ["DELETE FROM magic_item_inventory WHERE account_player_tag = ?", ["#PLAYER"]],
      ["DELETE FROM active_magic_effects WHERE account_player_tag = ?", ["#PLAYER"]],
      ["DELETE FROM imported_boosts WHERE account_player_tag = ?", ["#PLAYER"]],
    ]);
  });

  it("rolls back a village reset if a related deletion fails", async () => {
    const db = setupDatabase({
      runAsync: jest.fn()
        .mockResolvedValueOnce({ changes: 1 })
        .mockRejectedValueOnce(new Error("delete failed")),
    });

    await expect(resetVillageData("#PLAYER")).rejects.toThrow("delete failed");

    expect(db.execAsync).toHaveBeenNthCalledWith(1, "BEGIN TRANSACTION");
    expect(db.execAsync).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(db.execAsync).not.toHaveBeenCalledWith("COMMIT");
  });

  it("rejects empty village tags before touching the database", async () => {
    await expect(clearTrackedUpgrades(" ")).rejects.toThrow("INVALID_ACCOUNT_TAG");
    await expect(resetVillageData("")).rejects.toThrow("INVALID_ACCOUNT_TAG");
    expect(mockGetDB).not.toHaveBeenCalled();
  });
});
