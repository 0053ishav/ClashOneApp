import type { ActiveMagicEffect, MagicItemTarget } from "@/types/magicItem";
import type { Village } from "@/types/entity";
import { getMagicItem } from "@/config/magicItems";

type ResolveUpgradeCompletionTimeInput = {
  baseDurationMs: number;
  startedAt: number;
  effects: ActiveMagicEffect[];
  target: MagicItemTarget;
  village: Village;
};

type SpeedEffect = {
  itemId: string;
  startedAt: number;
  expiresAt: number;
  bonusMultiplier: number;
};

function getRelevantSpeedEffects({
  effects,
  target,
  village,
}: Pick<
  ResolveUpgradeCompletionTimeInput,
  "effects" | "target" | "village"
>): SpeedEffect[] {
  const effectsByItem = new Map<string, ActiveMagicEffect[]>();

  for (const effect of effects) {
    const item = getMagicItem(effect.itemId);

    if (!item || item.effect.type !== "ONGOING_SPEED") continue;
    if (!item.villages.includes(village)) continue;
    if (!item.effect.appliesTo?.includes(target)) continue;

    const multiplier = item.effect.multiplier;
    if (multiplier == null || multiplier <= 1) continue;

    const itemEffects = effectsByItem.get(item.id) ?? [];
    itemEffects.push(effect);
    effectsByItem.set(item.id, itemEffects);
  }

  return [...effectsByItem].flatMap(([itemId, itemEffects]) => {
    const item = getMagicItem(itemId);
    if (!item || item.effect.type !== "ONGOING_SPEED") return [];

    const bonusMultiplier = item.effect.multiplier;
    const durationMs = item.effect.durationMinutes
      ? item.effect.durationMinutes * 60 * 1000
      : undefined;

    if (bonusMultiplier == null || bonusMultiplier <= 1 || durationMs == null) {
      return [];
    }

    const sortedEffects = [...itemEffects].sort(
      (a, b) => a.startedAt - b.startedAt,
    );

    const normalized: SpeedEffect[] = [];

    for (const effect of sortedEffects) {
      const effectDurationMs =
        effect.expiresAt != null && effect.expiresAt > effect.startedAt
          ? effect.expiresAt - effect.startedAt
          : durationMs;

      const expiresAt = effect.startedAt + effectDurationMs;
      const previous = normalized.at(-1);

      if (previous && effect.startedAt <= previous.expiresAt) {
        // Reusing the same potion while its effect is active extends the
        // existing effect by one full potion duration; it does not increase
        // the potion's multiplier.
        previous.expiresAt += effectDurationMs;
        continue;
      }

      normalized.push({
        itemId,
        startedAt: effect.startedAt,
        expiresAt,
        bonusMultiplier: bonusMultiplier - 1,
      });
    }

    return normalized;
  });
}

/**
 * Resolves completion time using Magic Item work-speed effects.
 *
 * Magic Item multipliers represent total speed:
 * 10x = 1x normal + 9x bonus.
 *
 * Repeated uses of the same Magic Item extend that item's effect duration.
 * Different compatible Magic Items add their bonus speeds together.
 *
 * Helpers are intentionally excluded. Builder's Apprentice and Lab Assistant
 * are separate progression modifiers.
 */
export function resolveUpgradeCompletionTime({
  baseDurationMs,
  startedAt,
  effects,
  target,
  village,
}: ResolveUpgradeCompletionTimeInput): number {
  if (baseDurationMs <= 0) return startedAt;

  const speedEffects = getRelevantSpeedEffects({
    effects,
    target,
    village,
  });

  let cursor = startedAt;
  let remainingWorkMs = baseDurationMs;

  const eventTimes = new Set<number>([startedAt]);

  for (const effect of speedEffects) {
    if (effect.startedAt > startedAt) {
      eventTimes.add(effect.startedAt);
    }

    if (effect.expiresAt > startedAt) {
      eventTimes.add(effect.expiresAt);
    }
  }

  const sortedEventTimes = [...eventTimes].sort((a, b) => a - b);

  for (let index = 0; index < sortedEventTimes.length; index += 1) {
    const segmentStart = Math.max(cursor, sortedEventTimes[index]);
    const segmentEnd = sortedEventTimes[index + 1];
    const effectiveSpeed = getEffectiveSpeed(speedEffects, segmentStart);

    if (segmentEnd == null) {
      return segmentStart + remainingWorkMs / effectiveSpeed;
    }

    if (segmentEnd <= segmentStart) continue;

    const elapsedMs = segmentEnd - segmentStart;
    const workCompletedMs = elapsedMs * effectiveSpeed;

    if (workCompletedMs >= remainingWorkMs) {
      return segmentStart + remainingWorkMs / effectiveSpeed;
    }

    remainingWorkMs -= workCompletedMs;
    cursor = segmentEnd;
  }

  return cursor + remainingWorkMs;
}

function getEffectiveSpeed(
  effects: SpeedEffect[],
  timestamp: number,
): number {
  const bonusMultiplier = effects.reduce((total, effect) => {
    const isActive =
      effect.startedAt <= timestamp && timestamp < effect.expiresAt;

    return isActive ? total + effect.bonusMultiplier : total;
  }, 0);

  return 1 + bonusMultiplier;
}
