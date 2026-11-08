import { getMagicItem } from "@/config/magicItems";
import { recordMagicItemActivation } from "@/services/magicItemService";
import type { ActiveMagicEffect, MagicItemTarget } from "@/types/magicItem";
import type { Village } from "@/types/entity";

export type ActivateTimedMagicItemInput = {
  accountTag: string;
  itemId: string;
  village: Village;
  target: MagicItemTarget;
  now?: number;
  effectId: string;
  quantity?: number;
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
 * The active effect and usage event are recorded atomically. Inventory is
 * deliberately independent from this activation flow.
 */
export async function activateTimedMagicItem({
  accountTag,
  itemId,
  village,
  target,
  now = Date.now(),
  effectId,
  quantity = 1,
}: ActivateTimedMagicItemInput): Promise<ActivateTimedMagicItemResult> {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("INVALID_MAGIC_ITEM_QUANTITY");
  }

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
    expiresAt: now + durationMinutes * 60_000 * quantity,
    village,
  };

  await recordMagicItemActivation({
    accountTag,
    itemId,
    effect,
    ...(quantity > 1 ? { quantity } : {}),
  });

  return { activated: true, effect };
}
