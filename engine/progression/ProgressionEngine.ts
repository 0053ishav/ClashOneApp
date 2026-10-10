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

export class ProgressionEngine {
  static resolve(
    progression: ResolvedProgression,
  ): ProgressionResult {
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
        nextUpgradeTime = effectiveStartValues.durationMinutes;
        appliedModifierIds = effectiveStartValues.appliedModifierIds;
      }
    }

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
      remainingCost: remaining.remainingCost,
      remainingUpgradeTime: remaining.remainingUpgradeTime,
      currentHallLevel: progression.currentHallLevel,
      requiredHallLevel: getHallRequirement(progression),
      currentXp: progression.current?.xp,
      nextXp: progression.next?.xp,
      currentStats: progression.current?.stats ?? {},
      nextStats: progression.next?.stats ?? {},
      progressPercent,
      achievableLevel,
    };
  }
}
