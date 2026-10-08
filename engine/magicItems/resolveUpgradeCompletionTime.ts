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

type SpeedInterval = {
  start: number;
  end?: number;
  multiplier: number;
};

function getRelevantSpeedIntervals({
  effects,
  target,
  village,
}: Omit<ResolveUpgradeCompletionTimeInput, "baseDurationMs" | "startedAt">): SpeedInterval[] {
  return effects.flatMap((effect) => {
    const item = getMagicItem(effect.itemId);

    if (!item || item.effect.type !== "ONGOING_SPEED") return [];
    if (!item.villages.includes(village)) return [];
    if (!item.effect.appliesTo?.includes(target)) return [];

    const multiplier = item.effect.multiplier;

    if (multiplier == null || multiplier <= 0) return [];

    return [{
      start: effect.startedAt,
      end: effect.expiresAt,
      multiplier,
    }];
  });
}

/**
 * Resolves the completion timestamp for an upgrade affected by active
 * Magic Item speed effects.
 *
 * Potion effects accelerate work while active. Overlapping potion effects
 * do not multiply together; the fastest applicable effect wins.
 */
export function resolveUpgradeCompletionTime({
  baseDurationMs,
  startedAt,
  effects,
  target,
  village,
}: ResolveUpgradeCompletionTimeInput): number {
  if (baseDurationMs <= 0) return startedAt;

  const intervals = getRelevantSpeedIntervals({
    effects,
    target,
    village,
  })
    .filter((interval) => interval.end == null || interval.end > startedAt)
    .sort((a, b) => a.start - b.start);

  let cursor = startedAt;
  let remainingWorkMs = baseDurationMs;

  const eventTimes = new Set<number>([startedAt]);

  for (const interval of intervals) {
    if (interval.start > startedAt) {
      eventTimes.add(interval.start);
    }

    if (interval.end != null && interval.end > startedAt) {
      eventTimes.add(interval.end);
    }
  }

  const sortedEventTimes = [...eventTimes].sort((a, b) => a - b);

  for (let index = 0; index < sortedEventTimes.length; index += 1) {
    const segmentStart = Math.max(cursor, sortedEventTimes[index]);
    const segmentEnd = sortedEventTimes[index + 1];

    if (segmentEnd == null) {
      const multiplier = getEffectiveMultiplier(intervals, segmentStart);

      return segmentStart + remainingWorkMs / multiplier;
    }

    if (segmentEnd <= segmentStart) continue;

    const multiplier = getEffectiveMultiplier(intervals, segmentStart);
    const segmentDurationMs = segmentEnd - segmentStart;
    const workCompletedMs = segmentDurationMs * multiplier;

    if (workCompletedMs >= remainingWorkMs) {
      return segmentStart + remainingWorkMs / multiplier;
    }

    remainingWorkMs -= workCompletedMs;
    cursor = segmentEnd;
  }

  const multiplier = getEffectiveMultiplier(intervals, cursor);
  return cursor + remainingWorkMs / multiplier;
}

function getEffectiveMultiplier(
  intervals: SpeedInterval[],
  timestamp: number,
): number {
  return intervals.reduce(
    (maximum, interval) => {
      const isActive =
        interval.start <= timestamp &&
        (interval.end == null || timestamp < interval.end);

      return isActive
        ? Math.max(maximum, interval.multiplier)
        : maximum;
    },
    1,
  );
}
