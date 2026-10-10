import type {
  ProgressionResult,
  ResolvedProgression,
} from "./models";

import {
  calculateRemainingProgression,
  calculateUpgradeCost,
  calculateUpgradeTime,
} from "./operations";

import {
  getHallRequirement,
} from "./selectors";
import {
  applyHammerJamToUpgradeStart,
} from "@/engine/magicItems/applyHammerJamToUpgradeStart";
import {
  resolveHammerJamResourceProduction,
} from "@/engine/magicItems/resolveHammerJamResourceProduction";
import type {
  HammerJamTarget,
} from "@/engine/magicItems/hammerJam";

function toHammerJamTarget(
  category: ResolvedProgression["entity"]["category"],
): HammerJamTarget | null {
  switch (category) {
    case "building":
    case "troop":
    case "spell":
    case "hero":
    case "pet":
      return category;
    default:
      return null;
  }
}

function applyResourceProductionModifier(
  stats: Record<string, number>,
  progression: ResolvedProgression,
): {
  stats: Record<string, number>;
  appliedModifierIds: string[];
} {
  const context = progression.resourceProductionContext;
  const production = stats.production;

  if (
    progression.entity.category !== "building" ||
    context == null ||
    production == null
  ) {
    return { stats, appliedModifierIds: [] };
  }

  const result = resolveHammerJamResourceProduction({
    baseProduction: production,
    village: progression.entity.village,
    at: context.at,
    manifest: context.hammerJam,
  });

  return {
    stats: {
      ...stats,
      production: result.production,
    },
    appliedModifierIds: result.appliedModifierIds,
  };
}

export class ProgressionEngine {
  static resolve(
    progression: ResolvedProgression,
  ): ProgressionResult {
    // Validate caller-supplied context before entity/stat eligibility checks so
    // malformed timestamps cannot be silently ignored for non-producing levels.
    if (
      progression.resourceProductionContext != null &&
      !Number.isFinite(progression.resourceProductionContext.at)
    ) {
      throw new Error("INVALID_RESOURCE_PRODUCTION_TIMESTAMP");
    }

    const {
      currentLevel,
      currentHallLevel,
      maxLevel,
      next,
    } = progression;

    const remaining =
      calculateRemainingProgression(progression);

    const isMaxLevel =
      currentLevel >= maxLevel;

    const progressPercent =
      maxLevel > 0
        ? Math.min(
          Math.max(
            (currentLevel / maxLevel) * 100,
            0,
          ),
          100,
        )
        : 0;

    const achievableLevel =
      Object.entries(progression.progression.levels)
        .filter(
          ([, level]) =>
            level.hallLevel <= currentHallLevel,
        )
        .reduce(
          (highest, [level]) =>
            Math.max(highest, Number(level)),
          0,
        );

    const baseNextCost = isMaxLevel
      ? undefined
      : calculateUpgradeCost(progression);
    const baseNextUpgradeTime = isMaxLevel
      ? undefined
      : calculateUpgradeTime(progression);

    let nextCost = baseNextCost;
    let nextUpgradeTime = baseNextUpgradeTime;
    let appliedModifierIds: string[] = [];

    const upgradeStartContext = progression.upgradeStartContext;
    const hammerJamTarget = toHammerJamTarget(progression.entity.category);

    if (!isMaxLevel && next && upgradeStartContext) {
      if (!Number.isFinite(upgradeStartContext.startsAt)) {
        throw new Error("INVALID_UPGRADE_START_TIMESTAMP");
      }

      if (hammerJamTarget) {
        const effectiveStartValues = applyHammerJamToUpgradeStart({
          ...(baseNextCost == null ? {} : { baseCost: baseNextCost }),
          baseDurationMinutes: baseNextUpgradeTime ?? 0,
          target: hammerJamTarget,
          village: progression.entity.village,
          startsAt: upgradeStartContext.startsAt,
          manifest: upgradeStartContext.hammerJam,
        });

        nextCost = effectiveStartValues.cost ?? baseNextCost;
        nextUpgradeTime = baseNextUpgradeTime == null
          ? undefined
          : effectiveStartValues.durationMinutes;
        appliedModifierIds = effectiveStartValues.appliedModifierIds;
      }
    }

    const baseCurrentStats = progression.current?.stats ?? {};
    const baseNextStats = progression.next?.stats ?? {};
    const currentStatsResult = applyResourceProductionModifier(
      baseCurrentStats,
      progression,
    );
    const nextStatsResult = applyResourceProductionModifier(
      baseNextStats,
      progression,
    );

    return {
      dataId: progression.entity.id,
      currentLevel,
      nextLevel: isMaxLevel
        ? undefined
        : next?.level,
      maxLevel,
      remainingLevels: remaining.remainingLevels,
      isMaxLevel,
      baseNextCost,
      baseNextUpgradeTime,
      nextCost,
      resource: progression.progression.resource,
      nextUpgradeTime,
      appliedModifierIds,
      baseCurrentStats,
      baseNextStats,
      currentStats: currentStatsResult.stats,
      nextStats: nextStatsResult.stats,
      appliedResourceModifierIds: [
        ...new Set([
          ...currentStatsResult.appliedModifierIds,
          ...nextStatsResult.appliedModifierIds,
        ]),
      ],
      remainingCost: remaining.remainingCost,
      remainingUpgradeTime: remaining.remainingUpgradeTime,
      currentHallLevel: progression.currentHallLevel,
      requiredHallLevel: getHallRequirement(progression),
      currentXp: progression.current?.xp,
      nextXp: progression.next?.xp,
      progressPercent,
      achievableLevel,
    };
  }
}
