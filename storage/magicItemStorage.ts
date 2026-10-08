import { getDB } from "@/db/database";
import type { ActiveMagicEffect, MagicItemInventory } from "@/types/magicItem";
import type { Village } from "@/types/entity";

type MagicItemInventoryRow = { itemId: string; quantity: number };
type ActiveMagicEffectRow = {
  id: string;
  itemId: string;
  startedAt: number;
  expiresAt: number | null;
  village: string | null;
};

export async function getMagicItemInventory(accountTag: string): Promise<MagicItemInventory[]> {
  if (!accountTag) return [];
  const db = await getDB();
  return db.getAllAsync<MagicItemInventoryRow>(
    `SELECT item_id AS itemId, quantity FROM magic_item_inventory WHERE account_player_tag = ? ORDER BY item_id`,
    [accountTag],
  );
}

export async function getMagicItemQuantity(accountTag: string, itemId: string): Promise<number> {
  if (!accountTag || !itemId) return 0;
  const db = await getDB();
  const row = await db.getFirstAsync<{ quantity: number }>(
    `SELECT quantity FROM magic_item_inventory WHERE account_player_tag = ? AND item_id = ?`,
    [accountTag, itemId],
  );
  return row?.quantity ?? 0;
}

export async function setMagicItemQuantity(accountTag: string, itemId: string, quantity: number): Promise<void> {
  if (!accountTag || !itemId) return;
  const db = await getDB();
  const normalizedQuantity = Math.max(0, Math.floor(quantity));

  if (normalizedQuantity === 0) {
    await db.runAsync(
      `DELETE FROM magic_item_inventory WHERE account_player_tag = ? AND item_id = ?`,
      [accountTag, itemId],
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO magic_item_inventory (account_player_tag, item_id, quantity)
     VALUES (?, ?, ?)
     ON CONFLICT(account_player_tag, item_id)
     DO UPDATE SET quantity = excluded.quantity`,
    [accountTag, itemId, normalizedQuantity],
  );
}

export async function addMagicItem(accountTag: string, itemId: string, quantity = 1): Promise<number> {
  const amount = Math.max(0, Math.floor(quantity));
  if (amount === 0) return getMagicItemQuantity(accountTag, itemId);
  const next = (await getMagicItemQuantity(accountTag, itemId)) + amount;
  await setMagicItemQuantity(accountTag, itemId, next);
  return next;
}

export async function consumeMagicItem(accountTag: string, itemId: string, quantity = 1): Promise<boolean> {
  const amount = Math.max(1, Math.floor(quantity));
  const current = await getMagicItemQuantity(accountTag, itemId);
  if (current < amount) return false;
  await setMagicItemQuantity(accountTag, itemId, current - amount);
  return true;
}

export async function getActiveMagicEffects(accountTag: string, now = Date.now()): Promise<ActiveMagicEffect[]> {
  if (!accountTag) return [];
  const db = await getDB();
  const rows = await db.getAllAsync<ActiveMagicEffectRow>(
    `SELECT id, item_id AS itemId, started_at AS startedAt, expires_at AS expiresAt, village
     FROM active_magic_effects
     WHERE account_player_tag = ?
       AND (expires_at IS NULL OR expires_at > ?)
     ORDER BY started_at`,
    [accountTag, now],
  );

  return rows.map((row) => ({
    id: row.id,
    itemId: row.itemId,
    startedAt: row.startedAt,
    ...(row.expiresAt != null ? { expiresAt: row.expiresAt } : {}),
    ...(row.village ? { village: row.village as Village } : {}),
  }));
}

export async function addActiveMagicEffect(accountTag: string, effect: ActiveMagicEffect): Promise<void> {
  if (!accountTag) return;
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO active_magic_effects
      (id, account_player_tag, item_id, started_at, expires_at, village)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [effect.id, accountTag, effect.itemId, effect.startedAt, effect.expiresAt ?? null, effect.village ?? null],
  );
}

export async function removeActiveMagicEffect(accountTag: string, effectId: string): Promise<void> {
  if (!accountTag || !effectId) return;
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM active_magic_effects WHERE account_player_tag = ? AND id = ?`,
    [accountTag, effectId],
  );
}

export async function pruneExpiredMagicEffects(accountTag?: string, now = Date.now()): Promise<void> {
  const db = await getDB();
  if (accountTag) {
    await db.runAsync(
      `DELETE FROM active_magic_effects
       WHERE account_player_tag = ? AND expires_at IS NOT NULL AND expires_at <= ?`,
      [accountTag, now],
    );
    return;
  }

  await db.runAsync(
    `DELETE FROM active_magic_effects WHERE expires_at IS NOT NULL AND expires_at <= ?`,
    [now],
  );
}

export async function replaceMagicItemInventory(accountTag: string, inventory: MagicItemInventory[]): Promise<void> {
  if (!accountTag) return;
  const db = await getDB();
  await db.execAsync("BEGIN TRANSACTION");

  try {
    await db.runAsync(
      `DELETE FROM magic_item_inventory WHERE account_player_tag = ?`,
      [accountTag],
    );

    for (const item of inventory) {
      const quantity = Math.max(0, Math.floor(item.quantity));
      if (quantity === 0) continue;
      await db.runAsync(
        `INSERT INTO magic_item_inventory (account_player_tag, item_id, quantity)
         VALUES (?, ?, ?)`,
        [accountTag, item.itemId, quantity],
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}
