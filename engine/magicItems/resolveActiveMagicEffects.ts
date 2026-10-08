import type { ActiveMagicEffect, MagicItemTarget } from "@/types/magicItem";
import type { Village } from "@/types/entity";
import { getMagicItem } from "@/config/magicItems";

export type MagicItemSpeedModifier = {
  itemId: string;
  multiplier: number;
  remainingEffectMs: number;
};

type ResolveActiveMagicEffectsInput = {
  effects: ActiveMagicEffect[];
  target: MagicItemTarget;
  village: Village;
  now?: number;
};

export function resolveActiveMagicEffects({
  effects,
  target,
  village,
  now = Date.now(),
}: ResolveActiveMagicEffectsInput): MagicItemSpeedModifier[] {
  return effects.flatMap((effect) => {
    if (effect.village && effect.village !== village) return [];

    if (effect.expiresAt != null && effect.expiresAt <= now) return [];

    const item = getMagicItem(effect.itemId);
    if (!item || item.effect.type !== "ONGOING_SPEED") return [];

    if (!item.villages.includes(village)) return [];

    if (!item.effect.appliesTo?.includes(target)) return [];

    const multiplier = item.effect.multiplier;
    if (multiplier == null || multiplier <= 0) return [];

    return [{
      itemId: item.id,
      multiplier,
      remainingEffectMs:
        effect.expiresAt == null
          ? Number.POSITIVE_INFINITY
          : Math.max(effect.expiresAt - now, 0),
    }];
  });
}
