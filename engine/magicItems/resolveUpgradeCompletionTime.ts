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

const CLOCK_TOWER_MULTIPLIER = 10;
const CLOCK_TOWER_TARGETS: readonly MagicItemTarget[] = ["builders", "research"];

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
    if (!item || !item.villages.includes(village)) continue;
    if (effect.village != null && effect.village !== village) continue;

    if (item.effect.type === "CLOCK_TOWER_BOOST") {
      if (village !== "builderBase" || !CLOCK_TOWER_TARGETS.includes(target)) {
        continue;
      }
    } else {
      if (item.effect.type !== "ONGOING_SPEED") continue;
      if (!item.effect.appliesTo?.includes(target)) continue;
    }

    const multiplier =
      item.effect.type === "CLOCK_TOWER_BOOST"
        ? CLOCK_TOWER_MULTIPLIER
        : item.effect.multiplier;

    if (multiplier == null || multiplier <= 1) continue;

    const itemEffects = effectsByItem.get(item.id) ?? [];
    itemEffects.push(effect);
    effectsByItem.set(item.id, itemEffects);
  }

  return [...effectsByItem].flatMap(([itemId, itemEffects]) => {
    const item = getMagicItem(itemId);
    if (!item) return [];

    const isClockTower = item.effect.type === "CLOCK_TOWER_BOOST";
    const bonusMultiplier = isClockTower
      ? CLOCK_TOWER_MULTIPLIER
      : item.effect.type === "ONGOING_SPEED"
        ? item.effect.multiplier
        : undefined;
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
        // Reusing the same potion extends its active window; it does not
        // multiply the speed effect a second time.
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
 * Resolves an upgrade's completion time using timed Magic Item effects.
 *
 * Multipliers are total speed (10x means normal speed plus 9x bonus).
 * Clock Tower Potion is a Builder Base-only 10x boost for construction and
 * research timers. Builder's Apprentice and Lab Assistant remain separate.
 */
export function resolveUpgradeCompletionTime({
  baseDurationMs,
  startedAt,
  effects,
  target,
  village,
}: ResolveUpgradeCompletionTimeInput): number {
  if (baseDurationMs <= 0) return startedAt;

  const speedEffects = getRelevantSpeedEffects({ effects, target, village });
  let cursor = startedAt;
  let remainingWorkMs = baseDurationMs;
  const eventTimes = new Set<number>([startedAt]);

  for (const effect of speedEffects) {
    if (effect.startedAt > startedAt) eventTimes.add(effect.startedAt);
    if (effect.expiresAt > startedAt) eventTimes.add(effect.expiresAt);
  }

  const sortedEventTimes = [...eventTimes].sort((a, b) => a - b);

  for (let index = 0; index < sortedEventTimes.length; index += 1) {
    const segmentStart = Math.max(cursor, sortedEventTimes[index]);
    const segmentEnd = sortedEventTimes[index + 1];
    const effectiveSpeed = getEffectiveSpeed(speedEffects, segmentStart);

    if (segmentEnd == null) return segmentStart + remainingWorkMs / effectiveSpeed;
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

function getEffectiveSpeed(effects: SpeedEffect[], timestamp: number): number {
  const bonusMultiplier = effects.reduce((total, effect) => {
    const isActive =
      effect.startedAt <= timestamp && timestamp < effect.expiresAt;
    return isActive ? total + effect.bonusMultiplier : total;
  }, 0);

  return 1 + bonusMultiplier;
}
