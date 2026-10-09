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

/**
 * Set the known quantity for an item, upserting only within the given account.
 * A quantity of zero is retained as an explicit inventory record.
 */
export async function setMagicItemQuantity({
  accountTag,
  itemId,
  quantity,
}: SetMagicItemQuantityInput): Promise<void> {
  assertNonEmpty(accountTag, "account_tag");
  assertNonEmpty(itemId, "item_id");
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
  assertNonEmpty(accountTag, "account_tag");
  assertNonEmpty(itemId, "item_id");

  if (effect && effect.itemId !== itemId) {
    throw new Error("MAGIC_ITEM_EFFECT_ITEM_MISMATCH");
  }

  const db = await getDB();

  await db.execAsync("BEGIN TRANSACTION");
  try {
    const row = await db.getFirstAsync<{ quantity: number }>(
      `SELECT quantity
       FROM magic_item_inventory
       WHERE account_player_tag = ? AND item_id = ?`,
      [accountTag, itemId],
    );

    if (!row || Number(row.quantity) <= 0) {
      throw new Error("MAGIC_ITEM_NOT_IN_INVENTORY");
    }

    await db.runAsync(
      `UPDATE magic_item_inventory
       SET quantity = quantity - 1
       WHERE account_player_tag = ? AND item_id = ? AND quantity > 0`,
      [accountTag, itemId],
    );

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

/** Remove expired timed effects for one account. */
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
