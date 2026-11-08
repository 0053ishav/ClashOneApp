jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

import { getDB } from "@/db/database";
import {
  addMagicItem,
  clearActiveMagicEffects,
  replaceActiveMagicEffects,
  consumeMagicItem,
  consumeMagicItemQuantity,
  getActiveMagicEffects,
  getMagicItemInventory,
  getMagicItemQuantity,
  getMagicItemUsageCount,
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
      expect.stringContaining("quantity = quantity - ?"),
      [1, "#ACCOUNT", "builder-potion", 1],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO active_magic_effects"),
      ["effect-1", "#ACCOUNT", "builder-potion", 100, 3_600_100, "home"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO magic_item_usage_events"),
      ["#ACCOUNT", "builder-potion", 1, 100],
    );
    expect(db.execAsync).toHaveBeenLastCalledWith("COMMIT");
  });

  it("consumes multiple items and queues their duration after the current effect", async () => {
    db.getFirstAsync.mockResolvedValueOnce({ expires_at: 3_600_100 });

    await consumeMagicItem({
      accountTag: "#ACCOUNT",
      itemId: "builder-potion",
      quantity: 3,
      effect: {
        id: "effect-stack",
        itemId: "builder-potion",
        startedAt: 1_000,
        expiresAt: 10_801_000,
        village: "home",
      },
    });

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("quantity = quantity - ?"),
      [3, "#ACCOUNT", "builder-potion", 3],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO active_magic_effects"),
      ["effect-stack", "#ACCOUNT", "builder-potion", 3_600_100, 14_400_100, "home"],
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO magic_item_usage_events"),
      ["#ACCOUNT", "builder-potion", 3, 1_000],
    );
  });

  it("allows activation when inventory has never been tracked", async () => {
    db.runAsync.mockResolvedValueOnce({ changes: 0 });
    db.getFirstAsync.mockResolvedValueOnce(null);

    await expect(
      consumeMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "builder-potion",
        effect: {
          id: "effect-untracked",
          itemId: "builder-potion",
          startedAt: 200,
          expiresAt: 3_600_200,
        },
      }),
    ).resolves.toBeUndefined();

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO magic_item_usage_events"),
      ["#ACCOUNT", "builder-potion", 1, 200],
    );
    expect(db.execAsync).toHaveBeenLastCalledWith("COMMIT");
  });

  it("requires confirmation before using an explicitly tracked zero quantity", async () => {
    db.runAsync.mockResolvedValueOnce({ changes: 0 });
    db.getFirstAsync.mockResolvedValueOnce({ quantity: 0 });

    await expect(
      consumeMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "builder-potion",
        effect: {
          id: "effect-zero",
          itemId: "builder-potion",
          startedAt: 300,
          expiresAt: 3_600_300,
        },
      }),
    ).rejects.toThrow("MAGIC_ITEM_NOT_IN_INVENTORY");

    expect(db.execAsync).toHaveBeenCalledWith("ROLLBACK");
    expect(db.execAsync).not.toHaveBeenCalledWith("COMMIT");
  });

  it("allows confirmed activation at tracked zero without making inventory negative", async () => {
    db.runAsync.mockResolvedValueOnce({ changes: 0 });
    db.getFirstAsync.mockResolvedValueOnce({ quantity: 0 });

    await expect(
      consumeMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "builder-potion",
        allowZeroInventory: true,
        effect: {
          id: "effect-confirmed-zero",
          itemId: "builder-potion",
          startedAt: 400,
          expiresAt: 3_600_400,
        },
      }),
    ).resolves.toBeUndefined();

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO magic_item_usage_events"),
      ["#ACCOUNT", "builder-potion", 1, 400],
    );
    expect(db.execAsync).toHaveBeenLastCalledWith("COMMIT");
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

  it("returns lifetime manual usage for one account", async () => {
    db.getFirstAsync.mockResolvedValue({ total: 28 });

    await expect(getMagicItemUsageCount("#ACCOUNT")).resolves.toBe(28);
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE account_player_tag = ? AND source = 'manual'"),
      ["#ACCOUNT"],
    );
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

  it("replaces imported effects in the existing active_magic_effects table", async () => {
    const effects = [{
      id: "imported:builder-potion:1700000000000",
      itemId: "builder-potion",
      startedAt: 1_700_000_000_000,
      expiresAt: 1_700_003_600_000,
      village: "home" as const,
    }];

    await replaceActiveMagicEffects("#ACCOUNT", effects);

    expect(db.runAsync).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM active_magic_effects WHERE account_player_tag = ?",
      ["#ACCOUNT"],
    );
    expect(db.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO active_magic_effects"),
      [
        "imported:builder-potion:1700000000000",
        "#ACCOUNT",
        "builder-potion",
        1_700_000_000_000,
        1_700_003_600_000,
        "home",
      ],
    );
    expect(db.execAsync).toHaveBeenNthCalledWith(1, "BEGIN TRANSACTION");
    expect(db.execAsync).toHaveBeenNthCalledWith(2, "COMMIT");
  });

  it("rejects invalid imported effect expiry before writing", async () => {
    await expect(replaceActiveMagicEffects("#ACCOUNT", [{
      id: "imported:builder-potion",
      itemId: "builder-potion",
      startedAt: 100,
      expiresAt: 100,
    }])).rejects.toThrow("INVALID_MAGIC_ITEM_EFFECT_EXPIRES_AT");
    expect(db.runAsync).not.toHaveBeenCalled();
  });

});
