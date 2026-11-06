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
import { resolveHammerJamBoostModifier } from "./resolveHammerJamBoost";
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
    // Validate caller-supplied resource observation time before stat eligibility checks.
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

    const hammerJamBoost = progression.hammerJamBoost;
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

    let hammerJamCostMultiplier = 1;
    let hammerJamTimeMultiplier = 1;
    let hasHammerJamDiscount = false;

    if (!isMaxLevel && next) {
      if (hammerJamBoost) {
        if (!Number.isFinite(hammerJamBoost.startsAt)) {
          throw new Error("INVALID_UPGRADE_START_TIMESTAMP");
        }

        if (hammerJamTarget) {
          const modifier = resolveHammerJamBoostModifier({
            selection: hammerJamBoost,
            target: hammerJamTarget,
            village: progression.entity.village,
            ...(baseNextCost == null ? {} : { baseCost: baseNextCost }),
            baseDurationMinutes: baseNextUpgradeTime ?? 0,
          });

          hammerJamCostMultiplier = modifier.costMultiplier;
          hammerJamTimeMultiplier = modifier.timeMultiplier;
          hasHammerJamDiscount = modifier.appliedModifierIds.length > 0;
          appliedModifierIds = modifier.appliedModifierIds;
        }
      }

      // Compose every multiplier against the original base value and round once.
      if (baseNextCost != null) {
        nextCost = Math.round(
          baseNextCost * hammerJamCostMultiplier * combinedCostMultiplier,
        );
      }

      if (
        baseNextUpgradeTime != null &&
        (hasHammerJamDiscount || hasUpgradeDiscount)
      ) {
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

    // Gold Pass and Re-engagement are treated as ongoing planning assumptions
    // across the remaining levels. Hammer Jam is event-bound, so only the
    // immediate next upgrade is discounted; later levels may start after the
    // event expires and must not inherit its multiplier.
    const remainingCostWithAccountBoost =
      hasUpgradeDiscount
        ? Math.round(remaining.remainingCost * combinedCostMultiplier)
        : remaining.remainingCost;
    const remainingTimeWithAccountBoost =
      hasUpgradeDiscount
        ? Math.round(remaining.remainingUpgradeTime * combinedTimeMultiplier)
        : remaining.remainingUpgradeTime;
    const nextCostWithoutHammerJam =
      baseNextCost == null
        ? undefined
        : Math.round(baseNextCost * combinedCostMultiplier);
    const nextTimeWithoutHammerJam =
      baseNextUpgradeTime == null
        ? undefined
        : Math.round(baseNextUpgradeTime * combinedTimeMultiplier);
    const remainingCost =
      remainingCostWithAccountBoost +
      (hasHammerJamDiscount &&
      nextCost != null &&
      nextCostWithoutHammerJam != null
        ? nextCost - nextCostWithoutHammerJam
        : 0);
    const remainingUpgradeTime =
      remainingTimeWithAccountBoost +
      (hasHammerJamDiscount &&
      nextUpgradeTime != null &&
      nextTimeWithoutHammerJam != null
        ? nextUpgradeTime - nextTimeWithoutHammerJam
        : 0);

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
      remainingCost,
      remainingUpgradeTime,
      currentHallLevel: progression.currentHallLevel,
      requiredHallLevel: getHallRequirement(progression),
      currentXp: progression.current?.xp,
      nextXp: progression.next?.xp,
      progressPercent,
      achievableLevel,
    };
  }
}
