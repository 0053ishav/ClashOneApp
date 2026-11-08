import { getMagicItem } from "@/config/magicItems";
import { consumeMagicItem } from "@/services/magicItemService";
import type { ActiveMagicEffect, MagicItemTarget } from "@/types/magicItem";
import type { Village } from "@/types/entity";

export type ActivateTimedMagicItemInput = {
  accountTag: string;
  itemId: string;
  village: Village;
  target: MagicItemTarget;
  now?: number;
  effectId: string;
};

export type ActivateTimedMagicItemResult =
  | { activated: true; effect: ActiveMagicEffect }
  | {
      activated: false;
      reason:
        | "unknown-item"
        | "not-a-timed-speed-item"
        | "unsupported-village"
        | "incompatible-target";
    };

/**
 * Validates and activates a timed speed item for one account.
 *
 * The inventory decrement and active-effect insert are performed by
 * consumeMagicItem in a single SQLite transaction.
 */
export async function activateTimedMagicItem({
  accountTag,
  itemId,
  village,
  target,
  now = Date.now(),
  effectId,
}: ActivateTimedMagicItemInput): Promise<ActivateTimedMagicItemResult> {
  const item = getMagicItem(itemId);

  if (!item) return { activated: false, reason: "unknown-item" };

  if (item.effect.type !== "ONGOING_SPEED") {
    return { activated: false, reason: "not-a-timed-speed-item" };
  }

  if (!item.villages.includes(village)) {
    return { activated: false, reason: "unsupported-village" };
  }

  if (!item.effect.appliesTo?.includes(target)) {
    return { activated: false, reason: "incompatible-target" };
  }

  const durationMinutes = item.effect.durationMinutes;
  if (durationMinutes == null || durationMinutes <= 0) {
    return { activated: false, reason: "not-a-timed-speed-item" };
  }

  const effect: ActiveMagicEffect = {
    id: effectId,
    itemId: item.id,
    startedAt: now,
    expiresAt: now + durationMinutes * 60_000,
    village,
  };

  await consumeMagicItem({ accountTag, itemId, effect });

  return { activated: true, effect };
}
