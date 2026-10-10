import { getMagicItem } from "@/config/magicItems";
import { resolveInstantMagicItem } from "@/engine/magicItems/resolveInstantMagicItem";
import { getDB } from "@/db/database";
import { getEntity } from "@/utils/getEntity";
import type { Village } from "@/types/entity";

export type UseBookOnUpgradeInput = {
  accountTag: string;
  itemId: string;
  upgradeId: string;
  now?: number;
};

export type UseBookOnUpgradeResult =
  | { used: true; itemId: string; upgradeId: string }
  | {
      used: false;
      reason:
        | "unknown-item"
        | "not-a-book"
        | "upgrade-not-active"
        | "unsupported-village"
        | "incompatible-target"
        | "inventory-empty";
    };

/**
 * Uses a Book on one account-owned active upgrade.
 *
 * The inventory decrement and tracked-upgrade removal are atomic so a failed
 * consume cannot accidentally free a builder/lab slot.
 */
export async function applyBookToActiveUpgrade({
  accountTag,
  itemId,
  upgradeId,
  now = Date.now(),
}: UseBookOnUpgradeInput): Promise<UseBookOnUpgradeResult> {
  if (!accountTag.trim()) throw new Error("INVALID_ACCOUNT_TAG");
  if (!upgradeId.trim()) throw new Error("INVALID_UPGRADE_ID");

  const item = getMagicItem(itemId);
  if (!item) return { used: false, reason: "unknown-item" };
  if (item.itemType !== "book" || item.effect.type !== "INSTANT_COMPLETE") {
    return { used: false, reason: "not-a-book" };
  }

  const db = await getDB();
  await db.execAsync("BEGIN TRANSACTION");

  try {
    const upgrade = await db.getFirstAsync<{
      id: string;
      data_id: number | null;
      entity: string;
      type: string;
      village: Village | null;
      finish_timestamp: number;
      is_completed: number;
    }>(
      `SELECT id, data_id, entity, type, village, finish_timestamp, is_completed
       FROM upgrades
       WHERE id = ? AND account_player_tag = ?`,
      [upgradeId, accountTag],
    );

    if (
      !upgrade ||
      upgrade.is_completed === 1 ||
      Number(upgrade.finish_timestamp) <= now
    ) {
      await db.execAsync("ROLLBACK");
      return { used: false, reason: "upgrade-not-active" };
    }

    const village = upgrade.village ?? "home";
    const target =
      upgrade.data_id != null
        ? getEntity(Number(upgrade.data_id)).type
        : "unknown";

    const resolution = resolveInstantMagicItem({
      itemId,
      village,
      target,
      hasActiveUpgrade: true,
    });

    if (!resolution.allowed) {
      await db.execAsync("ROLLBACK");
      if (resolution.reason === "unsupported-village") {
        return { used: false, reason: "unsupported-village" };
      }
      return { used: false, reason: "incompatible-target" };
    }

    if (resolution.action.kind !== "complete-current-upgrade") {
      await db.execAsync("ROLLBACK");
      return { used: false, reason: "not-a-book" };
    }

    const consumed = await db.runAsync(
      `UPDATE magic_item_inventory
       SET quantity = quantity - 1
       WHERE account_player_tag = ? AND item_id = ? AND quantity > 0`,
      [accountTag, itemId],
    );

    if (consumed.changes !== 1) {
      await db.execAsync("ROLLBACK");
      return { used: false, reason: "inventory-empty" };
    }

    const deleted = await db.runAsync(
      `DELETE FROM upgrades
       WHERE id = ? AND account_player_tag = ?
         AND is_completed = 0 AND finish_timestamp > ?`,
      [upgradeId, accountTag, now],
    );

    if (deleted.changes !== 1) {
      throw new Error("UPGRADE_CHANGED_DURING_BOOK_USE");
    }

    await db.execAsync("COMMIT");
    return { used: true, itemId, upgradeId };
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}
