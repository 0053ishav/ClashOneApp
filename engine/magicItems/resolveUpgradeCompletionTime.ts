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
  startedAt: number;
  expiresAt?: number;
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
  return effects.flatMap((effect) => {
    const item = getMagicItem(effect.itemId);

    if (!item || item.effect.type !== "ONGOING_SPEED") return [];
    if (!item.villages.includes(village)) return [];
    if (!item.effect.appliesTo?.includes(target)) return [];

    const multiplier = item.effect.multiplier;

    if (multiplier == null || multiplier <= 1) return [];

    return [{
      startedAt: effect.startedAt,
      expiresAt: effect.expiresAt,
      bonusMultiplier: multiplier - 1,
    }];
  });
}

/**
 * Resolves completion time using Magic Item work-speed effects.
 *
 * Magic Item multipliers represent total speed:
 * 10x = 1x normal + 9x bonus.
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

    if (effect.expiresAt != null && effect.expiresAt > startedAt) {
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
      effect.startedAt <= timestamp &&
      (effect.expiresAt == null || timestamp < effect.expiresAt);

    return isActive
      ? total + effect.bonusMultiplier
      : total;
  }, 0);

  return 1 + bonusMultiplier;
}
