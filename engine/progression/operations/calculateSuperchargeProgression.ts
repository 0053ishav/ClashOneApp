import type { ProgressionData, ProgressionLevel } from "@/types/progression";

export interface SuperchargeProgression {
  currentLevel: number;
  nextLevel?: number;
  maxLevel: number;
  remainingLevels: number;
  nextCost?: number;
  nextUpgradeTime?: number;
  totalCost?: number;
  totalUpgradeTime?: number;
}

/**
 * Calculates Supercharge costs independently from normal building levels.
 * Supercharge records are keyed by the target charge level, so level 1's
 * cost is charged when moving from charge level 0 to 1.
 */
export interface SuperchargeProgressionOptions {
  /** Charge level currently being upgraded; its cost has already been paid. */
  inProgressLevel?: number;
}

export function calculateSuperchargeProgression(
  progression: Pick<ProgressionData, "scMaxLevel" | "supercharge">,
  currentLevel: number,
  options: SuperchargeProgressionOptions = {},
): SuperchargeProgression {
  const declaredMaxLevel = progression.scMaxLevel ?? Math.max(
    0,
    ...Object.keys(progression.supercharge ?? {}).map(Number).filter(Number.isFinite),
  );
  const maxLevel = Math.max(0, declaredMaxLevel);
  const normalizedCurrentLevel = Math.min(
    Math.max(0, Math.floor(currentLevel)),
    maxLevel,
  );
  const nextLevel = normalizedCurrentLevel < maxLevel
    ? normalizedCurrentLevel + 1
    : undefined;
  const nextData: ProgressionLevel | undefined = nextLevel == null
    ? undefined
    : progression.supercharge?.[nextLevel];
  const completedThroughLevel = Math.max(
    normalizedCurrentLevel,
    Math.min(
      maxLevel,
      Math.max(0, Math.floor(options.inProgressLevel ?? normalizedCurrentLevel)),
    ),
  );

  let totalCost = 0;
  let totalUpgradeTime = 0;
  let hasCompleteCostData = true;
  let hasCompleteTimeData = true;

  for (let level = completedThroughLevel + 1; level <= maxLevel; level += 1) {
    const levelData = progression.supercharge?.[level];
    if (levelData?.cost == null) {
      hasCompleteCostData = false;
    } else {
      totalCost += levelData.cost;
    }
    if (levelData?.upgradeTime == null) {
      hasCompleteTimeData = false;
    } else {
      totalUpgradeTime += levelData.upgradeTime;
    }
  }

  return {
    currentLevel: normalizedCurrentLevel,
    ...(nextLevel == null ? {} : { nextLevel }),
    maxLevel,
    remainingLevels: Math.max(0, maxLevel - completedThroughLevel),
    ...(nextData?.cost == null ? {} : { nextCost: nextData.cost }),
    ...(nextData?.upgradeTime == null ? {} : { nextUpgradeTime: nextData.upgradeTime }),
    ...(hasCompleteCostData ? { totalCost } : {}),
    ...(hasCompleteTimeData ? { totalUpgradeTime } : {}),
  };
}
