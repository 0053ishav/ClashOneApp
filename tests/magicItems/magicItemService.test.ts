jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

import { getDB } from "@/db/database";
import {
  addMagicItem,
  clearActiveMagicEffects,
  getImportedBoostSnapshot,
  replaceImportedBoostSnapshot,
  consumeMagicItem,
  consumeMagicItemQuantity,
  getActiveMagicEffects,
  getMagicItemInventory,
  getMagicItemQuantity,
  removeExpiredMagicEffects,
  setMagicItemQuantity,
} from "@/services/magicItemService";

type MockDb = {
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
  execAsync: jest.Mock;
};

describe("magicItemService", () => {
  let db: MockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      execAsync: jest.fn().mockResolvedValue(undefined),
    };
    (getDB as jest.Mock).mockResolvedValue(db);
  });

  it("reads inventory scoped to the requested account", async () => {
    db.getAllAsync.mockResolvedValue([
      { item_id: "builder-potion", quantity: 2 },
    ]);

    await expect(getMagicItemInventory("#ACCOUNT")).resolves.toEqual([
      { itemId: "builder-potion", quantity: 2 },
    ]);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_player_tag = ?"),
      ["#ACCOUNT"],
    );
  });

  it("rejects invalid quantities before writing", async () => {
    await expect(
      setMagicItemQuantity({
        accountTag: "#ACCOUNT",
        itemId: "builder-potion",
        quantity: -1,
      }),
    ).rejects.toThrow("INVALID_MAGIC_ITEM_QUANTITY");
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("upserts a quantity for the specified account", async () => {
    await setMagicItemQuantity({
      accountTag: "#ACCOUNT",
      itemId: "builder-potion",
      quantity: 3,
    });

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT(account_player_tag, item_id)"),
      ["#ACCOUNT", "builder-potion", 3],
    );
  });

  it("adds inventory with one atomic upsert", async () => {
    db.getFirstAsync.mockResolvedValue({ quantity: 6 });

    await expect(addMagicItem("#ACCOUNT", "builder-potion", 2)).resolves.toBe(6);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("magic_item_inventory.quantity + excluded.quantity"),
      ["#ACCOUNT", "builder-potion", 2],
    );
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_player_tag = ? AND item_id = ?"),
      ["#ACCOUNT", "builder-potion"],
    );
  });

  it("reads one item's quantity for the requested account", async () => {
    db.getFirstAsync.mockResolvedValue({ quantity: 3 });

    await expect(getMagicItemQuantity("#ACCOUNT", "builder-potion")).resolves.toBe(3);
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_player_tag = ? AND item_id = ?"),
      ["#ACCOUNT", "builder-potion"],
    );
  });

  it("atomically consumes one item and records its effect", async () => {
    await consumeMagicItem({
      accountTag: "#ACCOUNT",
      itemId: "builder-potion",
      effect: {
        id: "effect-1",
        itemId: "builder-potion",
        startedAt: 100,
        expiresAt: 3_600_100,
        village: "home",
      },
    });

    expect(db.execAsync).toHaveBeenNthCalledWith(1, "BEGIN TRANSACTION");
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("quantity = quantity - 1"),
      ["#ACCOUNT", "builder-potion"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO active_magic_effects"),
      ["effect-1", "#ACCOUNT", "builder-potion", 100, 3_600_100, "home"],
    );
    expect(db.execAsync).toHaveBeenLastCalledWith("COMMIT");
  });

  it("rolls back when the account has no item to consume", async () => {
    db.runAsync.mockResolvedValueOnce({ changes: 0 });

    await expect(
      consumeMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "builder-potion",
      }),
    ).rejects.toThrow("MAGIC_ITEM_NOT_IN_INVENTORY");

    expect(db.execAsync).toHaveBeenCalledWith("ROLLBACK");
    expect(db.execAsync).not.toHaveBeenCalledWith("COMMIT");
    expect(db.runAsync).toHaveBeenCalledTimes(1);
  });

  it("rejects effects for a different item", async () => {
    await expect(
      consumeMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "builder-potion",
        effect: {
          id: "effect-1",
          itemId: "research-potion",
          startedAt: 100,
        },
      }),
    ).rejects.toThrow("MAGIC_ITEM_EFFECT_ITEM_MISMATCH");
    expect(db.execAsync).not.toHaveBeenCalled();
  });

  it("consumes a requested quantity atomically", async () => {
    await expect(
      consumeMagicItemQuantity("#ACCOUNT", "builder-potion", 2),
    ).resolves.toBe(true);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("quantity >= ?"),
      [2, "#ACCOUNT", "builder-potion", 2],
    );
    expect(db.execAsync).toHaveBeenLastCalledWith("COMMIT");
  });

  it("returns false and rolls back when quantity is insufficient", async () => {
    db.runAsync.mockResolvedValueOnce({ changes: 0 });

    await expect(
      consumeMagicItemQuantity("#ACCOUNT", "builder-potion", 2),
    ).resolves.toBe(false);

    expect(db.execAsync).toHaveBeenCalledWith("ROLLBACK");
    expect(db.execAsync).not.toHaveBeenCalledWith("COMMIT");
  });

  it("reads active effects scoped to one account", async () => {
    db.getAllAsync.mockResolvedValue([
      {
        id: "effect-1",
        item_id: "builder-bite",
        started_at: 100,
        expires_at: 200,
        village: "home",
      },
    ]);

    await expect(getActiveMagicEffects("#ACCOUNT")).resolves.toEqual([
      {
        id: "effect-1",
        itemId: "builder-bite",
        startedAt: 100,
        expiresAt: 200,
        village: "home",
      },
    ]);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_player_tag = ?"),
      ["#ACCOUNT"],
    );
  });

  it("removes expired effects for the requested account", async () => {
    db.runAsync.mockResolvedValue({ changes: 2 });

    await expect(removeExpiredMagicEffects("#ACCOUNT", 500)).resolves.toBe(2);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("expires_at <= ?"),
      ["#ACCOUNT", 500],
    );
  });
  it("clears only the requested account's simulated effects", async () => {
    await clearActiveMagicEffects("#ACCOUNT");
    expect(db.runAsync).toHaveBeenCalledWith(
      "DELETE FROM active_magic_effects WHERE account_player_tag = ?",
      ["#ACCOUNT"],
    );
  });

  it("persists and reads imported boost durations as a separate snapshot", async () => {
    const snapshot = {
      accountTag: "#ACCOUNT",
      builderBoostSeconds: 3595,
      labBoostSeconds: 3598,
      clocktowerBoostSeconds: 60652,
      exportedAt: 1_700_000_000_000,
    };
    await replaceImportedBoostSnapshot(snapshot);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO imported_boosts"),
      ["#ACCOUNT", 3595, 3598, 60652, 1_700_000_000_000],
    );

    db.getFirstAsync.mockResolvedValue({
      account_player_tag: "#ACCOUNT",
      builder_boost_seconds: 3595,
      lab_boost_seconds: 3598,
      clocktower_boost_seconds: 60652,
      exported_at: 1_700_000_000_000,
    });
    await expect(getImportedBoostSnapshot("#ACCOUNT")).resolves.toEqual(snapshot);
  });

  it("rejects negative imported boost durations before writing", async () => {
    await expect(replaceImportedBoostSnapshot({
      accountTag: "#ACCOUNT",
      builderBoostSeconds: -1,
      labBoostSeconds: 0,
      clocktowerBoostSeconds: 0,
      exportedAt: 1_700_000_000_000,
    })).rejects.toThrow("INVALID_BUILDER_BOOST_SECONDS");
    expect(db.runAsync).not.toHaveBeenCalled();
  });

});
