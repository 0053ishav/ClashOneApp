import type { ResolvedProgression } from "../models";

export interface RemainingProgression {
  remainingLevels: number;
  remainingCost: number;
  remainingUpgradeTime: number;
}

export function calculateRemainingProgression(
  progression: ResolvedProgression,
): RemainingProgression {
  const {
    currentLevel,
    progression: data,
  } = progression;

  let remainingCost = 0;
  let remainingUpgradeTime = 0;

  for (
    let level = currentLevel + 1;
    level <= data.maxLevel;
    level++
  ) {
    const levelData = data.levels[level];

    remainingCost += levelData?.cost ?? 0;
    remainingUpgradeTime += levelData?.upgradeTime ?? 0;
  }

  return {
    remainingLevels: Math.max(
      data.maxLevel - currentLevel,
      0,
    ),
    remainingCost,
    remainingUpgradeTime,
  };
}