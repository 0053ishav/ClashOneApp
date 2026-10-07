import type {
  ProgressionResult,
  ResolvedProgression,
} from "./models";

import {
  calculateRemainingProgression,
  calculateUpgradeCost,
  calculateUpgradeTime
} from "./operations";

import {
  getHallRequirement,
} from "./selectors";

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

    return {
      dataId: progression.entity.id,
      currentLevel,
      nextLevel: isMaxLevel
        ? undefined
        : next?.level,
      maxLevel,
      remainingLevels: remaining.remainingLevels,
      isMaxLevel,
      nextCost:
        isMaxLevel
          ? undefined
          : calculateUpgradeCost(progression),
      resource: progression.progression.resource,
      nextUpgradeTime:
        isMaxLevel
          ? undefined
          : calculateUpgradeTime(progression),
      remainingCost:
        remaining.remainingCost,

      remainingUpgradeTime:
        remaining.remainingUpgradeTime,

      currentHallLevel: progression?.currentHallLevel,
      requiredHallLevel:
        getHallRequirement(progression),

      currentXp:
        progression.current?.xp,

      nextXp:
        progression.next?.xp,

      currentStats:
        progression.current?.stats ?? {},

      nextStats:
        progression.next?.stats ?? {},

      progressPercent,
      achievableLevel,
    };
  }
}