import { getDB } from "@/db/database";
import type {
  ActiveMagicEffect,
  MagicItemInventory,
} from "@/types/magicItem";

export type SetMagicItemQuantityInput = {
  accountTag: string;
  itemId: string;
  quantity: number;
};

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }
}

function assertQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error("INVALID_MAGIC_ITEM_QUANTITY");
  }
}

function assertPositiveQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("INVALID_MAGIC_ITEM_QUANTITY");
  }
}

function assertAccountAndItem(accountTag: string, itemId: string): void {
  assertNonEmpty(accountTag, "account_tag");
  assertNonEmpty(itemId, "item_id");
}

/** Read inventory for one account only. */
export async function getMagicItemInventory(
  accountTag: string,
): Promise<MagicItemInventory[]> {
  assertNonEmpty(accountTag, "account_tag");

  const db = await getDB();
  const rows = await db.getAllAsync<{
    item_id: string;
    quantity: number;
  }>(
    `SELECT item_id, quantity
     FROM magic_item_inventory
     WHERE account_player_tag = ?
     ORDER BY item_id`,
    [accountTag],
  );

  return rows.map((row) => ({
    itemId: row.item_id,
    quantity: Number(row.quantity),
  }));
}

export async function getMagicItemQuantity(
  accountTag: string,
  itemId: string,
): Promise<number> {
  assertAccountAndItem(accountTag, itemId);
  const db = await getDB();
  const row = await db.getFirstAsync<{ quantity: number }>(
    `SELECT quantity FROM magic_item_inventory
     WHERE account_player_tag = ? AND item_id = ?`,
    [accountTag, itemId],
  );
  return Number(row?.quantity ?? 0);
}

/**
 * Set a known quantity. Zero is retained as an explicit inventory record.
 */
export async function setMagicItemQuantity({
  accountTag,
  itemId,
  quantity,
}: SetMagicItemQuantityInput): Promise<void> {
  assertAccountAndItem(accountTag, itemId);
  assertQuantity(quantity);

  const db = await getDB();
  await db.runAsync(
    `INSERT INTO magic_item_inventory
       (account_player_tag, item_id, quantity)
     VALUES (?, ?, ?)
     ON CONFLICT(account_player_tag, item_id)
     DO UPDATE SET quantity = excluded.quantity`,
    [accountTag, itemId, quantity],
  );
}

/** Add quantity atomically within a single SQL statement. */
export async function addMagicItem(
  accountTag: string,
  itemId: string,
  quantity = 1,
): Promise<number> {
  assertAccountAndItem(accountTag, itemId);
  assertPositiveQuantity(quantity);

  const db = await getDB();
  await db.runAsync(
    `INSERT INTO magic_item_inventory
       (account_player_tag, item_id, quantity)
     VALUES (?, ?, ?)
     ON CONFLICT(account_player_tag, item_id)
     DO UPDATE SET quantity = magic_item_inventory.quantity + excluded.quantity`,
    [accountTag, itemId, quantity],
  );
  return getMagicItemQuantity(accountTag, itemId);
}

/**
 * Consume one item and optionally record its timed effect atomically.
 * Throws when the item is not in inventory; neither write is committed.
 */
export async function consumeMagicItem({
  accountTag,
  itemId,
  effect,
}: {
  accountTag: string;
  itemId: string;
  effect?: ActiveMagicEffect;
}): Promise<void> {
  assertAccountAndItem(accountTag, itemId);

  if (effect && effect.itemId !== itemId) {
    throw new Error("MAGIC_ITEM_EFFECT_ITEM_MISMATCH");
  }

  const db = await getDB();
  await db.execAsync("BEGIN TRANSACTION");
  try {
    const result = await db.runAsync(
      `UPDATE magic_item_inventory
       SET quantity = quantity - 1
       WHERE account_player_tag = ? AND item_id = ? AND quantity > 0`,
      [accountTag, itemId],
    );

    if (result.changes !== 1) {
      throw new Error("MAGIC_ITEM_NOT_IN_INVENTORY");
    }

    if (effect) {
      await db.runAsync(
        `INSERT INTO active_magic_effects
           (id, account_player_tag, item_id, started_at, expires_at, village)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          effect.id,
          accountTag,
          itemId,
          effect.startedAt,
          effect.expiresAt ?? null,
          effect.village ?? null,
        ],
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

/** Consume a requested quantity atomically; false means inventory was insufficient. */
export async function consumeMagicItemQuantity(
  accountTag: string,
  itemId: string,
  quantity = 1,
): Promise<boolean> {
  assertAccountAndItem(accountTag, itemId);
  assertPositiveQuantity(quantity);

  const db = await getDB();
  await db.execAsync("BEGIN TRANSACTION");
  try {
    const result = await db.runAsync(
      `UPDATE magic_item_inventory
       SET quantity = quantity - ?
       WHERE account_player_tag = ? AND item_id = ? AND quantity >= ?`,
      [quantity, accountTag, itemId, quantity],
    );

    if (result.changes !== 1) {
      await db.execAsync("ROLLBACK");
      return false;
    }

    await db.execAsync("COMMIT");
    return true;
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

/** Read timed effects for one account, including expired records for reconciliation. */
export async function getActiveMagicEffects(
  accountTag: string,
): Promise<ActiveMagicEffect[]> {
  assertNonEmpty(accountTag, "account_tag");

  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: string;
    item_id: string;
    started_at: number;
    expires_at: number | null;
    village: ActiveMagicEffect["village"] | null;
  }>(
    `SELECT id, item_id, started_at, expires_at, village
     FROM active_magic_effects
     WHERE account_player_tag = ?
     ORDER BY started_at`,
    [accountTag],
  );

  return rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    startedAt: Number(row.started_at),
    expiresAt: row.expires_at == null ? undefined : Number(row.expires_at),
    village: row.village ?? undefined,
  }));
}

export async function addActiveMagicEffect(
  accountTag: string,
  effect: ActiveMagicEffect,
): Promise<void> {
  assertAccountAndItem(accountTag, effect.itemId);
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO active_magic_effects
       (id, account_player_tag, item_id, started_at, expires_at, village)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      effect.id,
      accountTag,
      effect.itemId,
      effect.startedAt,
      effect.expiresAt ?? null,
      effect.village ?? null,
    ],
  );
}

export async function removeActiveMagicEffect(
  accountTag: string,
  effectId: string,
): Promise<void> {
  assertNonEmpty(accountTag, "account_tag");
  assertNonEmpty(effectId, "effect_id");
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM active_magic_effects
     WHERE account_player_tag = ? AND id = ?`,
    [accountTag, effectId],
  );
}

export async function removeExpiredMagicEffects(
  accountTag: string,
  now = Date.now(),
): Promise<number> {
  assertNonEmpty(accountTag, "account_tag");
  const db = await getDB();
  const result = await db.runAsync(
    `DELETE FROM active_magic_effects
     WHERE account_player_tag = ?
       AND expires_at IS NOT NULL
       AND expires_at <= ?`,
    [accountTag, now],
  );
  return result.changes;
}

export async function pruneExpiredMagicEffects(
  accountTag?: string,
  now = Date.now(),
): Promise<void> {
  const db = await getDB();
  if (accountTag) {
    await removeExpiredMagicEffects(accountTag, now);
    return;
  }

  await db.runAsync(
    `DELETE FROM active_magic_effects
     WHERE expires_at IS NOT NULL AND expires_at <= ?`,
    [now],
  );
}

/** Replace one account's inventory atomically. */
export async function replaceMagicItemInventory(
  accountTag: string,
  inventory: MagicItemInventory[],
): Promise<void> {
  assertNonEmpty(accountTag, "account_tag");
  for (const item of inventory) {
    assertNonEmpty(item.itemId, "item_id");
    assertQuantity(item.quantity);
  }

  const db = await getDB();
  await db.execAsync("BEGIN TRANSACTION");
  try {
    await db.runAsync(
      "DELETE FROM magic_item_inventory WHERE account_player_tag = ?",
      [accountTag],
    );

    for (const item of inventory) {
      await db.runAsync(
        `INSERT INTO magic_item_inventory
           (account_player_tag, item_id, quantity)
         VALUES (?, ?, ?)`,
        [accountTag, item.itemId, item.quantity],
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}
