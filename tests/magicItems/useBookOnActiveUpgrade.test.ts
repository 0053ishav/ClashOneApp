jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

jest.mock("@/utils/getEntity", () => ({
  getEntity: jest.fn(() => ({ type: "building" })),
}));

import { getDB } from "@/db/database";
import { getEntity } from "@/utils/getEntity";
import { useBookOnActiveUpgrade } from "@/services/useBookOnActiveUpgrade";

type MockDb = {
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
  execAsync: jest.Mock;
};

describe("useBookOnActiveUpgrade", () => {
  let db: MockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      execAsync: jest.fn().mockResolvedValue(undefined),
    };
    (getDB as jest.Mock).mockResolvedValue(db);
    db.getFirstAsync.mockResolvedValue({
      id: "upgrade-1",
      data_id: 123,
      entity: "Archer Tower",
      type: "BUILDING",
      village: "home",
      finish_timestamp: 10_000,
      is_completed: 0,
    });
  });

  it("consumes a Book of Building and removes the matching active upgrade atomically", async () => {
    await expect(
      useBookOnActiveUpgrade({
        accountTag: "#ACCOUNT",
        itemId: "book-of-building",
        upgradeId: "upgrade-1",
        now: 1_000,
      }),
    ).resolves.toEqual({
      used: true,
      itemId: "book-of-building",
      upgradeId: "upgrade-1",
    });

    expect(db.execAsync).toHaveBeenNthCalledWith(1, "BEGIN TRANSACTION");
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND account_player_tag = ?"),
      ["upgrade-1", "#ACCOUNT"],
    );
    expect(getEntity).toHaveBeenCalledWith(123);
    expect(db.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("quantity = quantity - 1"),
      ["#ACCOUNT", "book-of-building"],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM upgrades"),
      ["upgrade-1", "#ACCOUNT", 1_000],
    );
    expect(db.execAsync).toHaveBeenLastCalledWith("COMMIT");
  });

  it("does not consume inventory when the upgrade is no longer active", async () => {
    db.getFirstAsync.mockResolvedValueOnce({
      id: "upgrade-1",
      data_id: 123,
      entity: "Archer Tower",
      type: "BUILDING",
      village: "home",
      finish_timestamp: 1_000,
      is_completed: 0,
    });

    await expect(
      useBookOnActiveUpgrade({
        accountTag: "#ACCOUNT",
        itemId: "book-of-building",
        upgradeId: "upgrade-1",
        now: 1_000,
      }),
    ).resolves.toEqual({ used: false, reason: "upgrade-not-active" });

    expect(db.runAsync).not.toHaveBeenCalled();
    expect(db.execAsync).toHaveBeenLastCalledWith("ROLLBACK");
  });

  it("does not consume a Book when its target is incompatible", async () => {
    (getEntity as jest.Mock).mockReturnValueOnce({ type: "troop" });

    await expect(
      useBookOnActiveUpgrade({
        accountTag: "#ACCOUNT",
        itemId: "book-of-building",
        upgradeId: "upgrade-1",
        now: 1_000,
      }),
    ).resolves.toEqual({ used: false, reason: "incompatible-target" });

    expect(db.runAsync).not.toHaveBeenCalled();
    expect(db.execAsync).toHaveBeenLastCalledWith("ROLLBACK");
  });

  it("does not remove an upgrade if the account has no Book", async () => {
    db.runAsync.mockResolvedValueOnce({ changes: 0 });

    await expect(
      useBookOnActiveUpgrade({
        accountTag: "#ACCOUNT",
        itemId: "book-of-building",
        upgradeId: "upgrade-1",
        now: 1_000,
      }),
    ).resolves.toEqual({ used: false, reason: "inventory-empty" });

    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.execAsync).toHaveBeenLastCalledWith("ROLLBACK");
  });

  it("rejects a Hammer from the Book-use path", async () => {
    await expect(
      useBookOnActiveUpgrade({
        accountTag: "#ACCOUNT",
        itemId: "hammer-of-building",
        upgradeId: "upgrade-1",
        now: 1_000,
      }),
    ).resolves.toEqual({ used: false, reason: "not-a-book" });

    expect(db.execAsync).not.toHaveBeenCalled();
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});
