import type {
  CraftedProgressionResult,
  CraftedResolvedProgression,
} from "./model";

import {
  calculateCraftedRemainingProgression,
  calculateCraftedUpgradeCost,
  calculateCraftedUpgradeTime
} from "./operations";

export class CraftedProgressionEngine {
  static resolve(
    progression: CraftedResolvedProgression,
  ): CraftedProgressionResult {
    const {
      currentLevel,
      currentHallLevel,
      maxLevel,
      next,
    } = progression;

    const remaining =
      calculateCraftedRemainingProgression(progression)
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
      Object.entries(progression.module.levels)
        .filter(
          ([, level]) =>
            level.hallLevel <= currentHallLevel,
        )
        .reduce(
          (highest, [level]) =>
            Math.max(highest, Number(level)),
          0,
        );

    console.log("CRAFTED MODULE PROGRESSION:", {
      defenseId: progression.defense.id,
      defenseName: progression.defense.name,

      moduleId: progression.module.id,
      moduleName: progression.module.name,

      currentLevel,
      currentHallLevel,
      maxLevel,

      moduleLevels: Object.keys(
        progression.module.levels,
      ),

      current: progression.current,
      next: progression.next,
    });

    return {
      dataId: progression.defense.id,
      defenseName: progression.defense.name,

      moduleId: progression.module.id,
      moduleName: progression.module.name,

      currentLevel,

      nextLevel: isMaxLevel
        ? undefined
        : next?.level,

      maxLevel,

      remainingLevels:
        remaining.remainingLevels,

      isMaxLevel,

      resource:
        progression.module.resource,

      nextCost: isMaxLevel
        ? undefined
        : calculateCraftedUpgradeCost(
          progression,
        ),

      nextUpgradeTime: isMaxLevel
        ? undefined
        : calculateCraftedUpgradeTime(
          progression,
        ),

      remainingCost:
        remaining.remainingCost,

      remainingUpgradeTime:
        remaining.remainingUpgradeTime,

      currentHallLevel: progression?.currentHallLevel,
      requiredHallLevel:
        next?.hallLevel,

      sparkyStones:
        next?.sparkyStones,

      currentStats:
        progression.current?.stats ?? {},

      nextStats:
        progression.next?.stats ?? {},

      currentXp:
        progression.current?.xp,

      nextXp:
        progression.next?.xp,

      progressPercent,
      achievableLevel,
    };
  }
}