import type { CraftedResolvedProgression } from "../model";

export interface CraftedRemainingProgression {
  remainingLevels: number;
  remainingCost: number;
  remainingUpgradeTime: number;
}

export function calculateCraftedRemainingProgression(
  progression: CraftedResolvedProgression,
): CraftedRemainingProgression {
  const {
    currentLevel,
    module,
  } = progression;

  let remainingCost = 0;
  let remainingUpgradeTime = 0;

  for (
    let level = currentLevel + 1;
    level <= module.maxLevel;
    level++
  ) {
    const levelData = module.levels[level];

    remainingCost += levelData?.cost ?? 0;
    remainingUpgradeTime += levelData?.upgradeTime ?? 0;
  }

  return {
    remainingLevels: Math.max(
      module.maxLevel - currentLevel,
      0,
    ),
    remainingCost,
    remainingUpgradeTime,
  };
}