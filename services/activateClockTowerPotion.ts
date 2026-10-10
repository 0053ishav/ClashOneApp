import { getMagicItem } from "@/config/magicItems";
import { consumeMagicItem } from "@/services/magicItemService";
import type { Village } from "@/types/entity";
import type { MagicItemTarget } from "@/types/magicItem";

export type ActivateClockTowerPotionInput = {
  accountTag: string;
  itemId: string;
  village: Village;
  now?: number;
  effectId: string;
};

export type ActivateClockTowerPotionResult =
  | {
      activated: true;
      effect: {
        id: string;
        itemId: string;
        startedAt: number;
        expiresAt: number;
        village: Village;
      };
    }
  | {
      activated: false;
      reason:
        | "unknown-item"
        | "not-clock-tower-potion"
        | "unsupported-village";
    };

/**
 * Activates the Builder Base Clock Tower Potion.
 *
 * This records the game's Clock Tower activation as a distinct effect instead
 * of pretending it is a generic 10x upgrade potion. Clock Tower timing rules
 * are resolved by the Builder Base clock-tower integration.
 */
export async function activateClockTowerPotion({
  accountTag,
  itemId,
  village,
  now = Date.now(),
  effectId,
}: ActivateClockTowerPotionInput): Promise<ActivateClockTowerPotionResult> {
  const item = getMagicItem(itemId);

  if (!item) return { activated: false, reason: "unknown-item" };

  if (item.effect.type !== "CLOCK_TOWER_BOOST") {
    return { activated: false, reason: "not-clock-tower-potion" };
  }

  if (!item.villages.includes(village) || village !== "builderBase") {
    return { activated: false, reason: "unsupported-village" };
  }

  const durationMinutes = item.effect.durationMinutes;
  if (durationMinutes == null || durationMinutes <= 0) {
    throw new Error("INVALID_CLOCK_TOWER_DURATION");
  }

  const effect = {
    id: effectId,
    itemId: item.id,
    startedAt: now,
    expiresAt: now + durationMinutes * 60_000,
    village,
  } as const;

  await consumeMagicItem({ accountTag, itemId, effect });

  return { activated: true, effect };
}
