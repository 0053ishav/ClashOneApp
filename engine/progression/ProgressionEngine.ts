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
import { resolveGoldPassBoostModifier } from "./resolveGoldPassBoost";
import { resolveReEngagementBoostModifier } from "./resolveReEngagementBoost";
import { isGoldPassBoostApplicable } from "./isGoldPassBoostApplicable";
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
    const noGoldPassModifier = {
      costMultiplier: 1,
      timeMultiplier: 1,
      appliedModifierIds: [] as string[],
    };
    const noReEngagementModifier = {
      costMultiplier: 1,
      timeMultiplier: 1,
      appliedModifierIds: [] as string[],
    };

    // Resolve first so invalid manually entered percentages are rejected
    // even if a selected target is currently ineligible.
    const requestedGoldPassModifier = progression.goldPassBoost
      ? resolveGoldPassBoostModifier(progression.goldPassBoost)
      : noGoldPassModifier;
    const goldPassModifier =
      progression.goldPassBoost &&
      isGoldPassBoostApplicable({
        village: progression.entity.village,
        entityType: progression.entity.category,
        target: progression.goldPassBoost.target,
      })
        ? requestedGoldPassModifier
        : noGoldPassModifier;

    const requestedReEngagementModifier = progression.reEngagementBoost
      ? resolveReEngagementBoostModifier(progression.reEngagementBoost)
      : noReEngagementModifier;
    const reEngagementModifier =
      progression.reEngagementBoost &&
      isGoldPassBoostApplicable({
        village: progression.entity.village,
        entityType: progression.entity.category,
        target: progression.reEngagementBoost.target,
      })
        ? requestedReEngagementModifier
        : noReEngagementModifier;

    // Gold Pass and Re-engagement stack multiplicatively with each other and
    // with Hammer Jam; no percentage is added linearly.
    const combinedCostMultiplier =
      goldPassModifier.costMultiplier * reEngagementModifier.costMultiplier;
    const combinedTimeMultiplier =
      goldPassModifier.timeMultiplier * reEngagementModifier.timeMultiplier;
    const hasUpgradeDiscount =
      goldPassModifier.appliedModifierIds.length > 0 ||
      reEngagementModifier.appliedModifierIds.length > 0;

    if (!isMaxLevel && next) {
      let hammerJamTimeMultiplier = 1;
      let shouldAdjustDuration = hasUpgradeDiscount;

      if (upgradeStartContext) {
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
          hammerJamTimeMultiplier = effectiveStartValues.timeMultiplier;
          appliedModifierIds = effectiveStartValues.appliedModifierIds;
          shouldAdjustDuration = true;
        }
      }

      // Every cost/time discount composes multiplicatively. Apply the combined
      // discount to the event-adjusted cost, and round duration once at the end.
      if (nextCost != null && combinedCostMultiplier !== 1) {
        nextCost = Math.round(nextCost * combinedCostMultiplier);
      }

      if (baseNextUpgradeTime != null && shouldAdjustDuration) {
        nextUpgradeTime = Math.round(
          baseNextUpgradeTime *
            hammerJamTimeMultiplier *
            combinedTimeMultiplier,
        );
      }

      appliedModifierIds = [
        ...appliedModifierIds,
        ...goldPassModifier.appliedModifierIds,
        ...reEngagementModifier.appliedModifierIds,
      ];
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
      remainingCost:
        hasUpgradeDiscount
          ? Math.round(remaining.remainingCost * combinedCostMultiplier)
          : remaining.remainingCost,
      remainingUpgradeTime:
        hasUpgradeDiscount
          ? Math.round(remaining.remainingUpgradeTime * combinedTimeMultiplier)
          : remaining.remainingUpgradeTime,
      currentHallLevel: progression.currentHallLevel,
      requiredHallLevel: getHallRequirement(progression),
      currentXp: progression.current?.xp,
      nextXp: progression.next?.xp,
      progressPercent,
      achievableLevel,
    };
  }
}
