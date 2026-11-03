import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import { getGoldPassBoostSettings } from "@/services/goldPassBoostService";
import { getReEngagementBoostSettings } from "@/services/reEngagementBoostService";
import { getActiveMagicEffects } from "@/services/magicItemService";
import { resolveGoldPassBoostForUpgradeType } from "../resolveGoldPassBoostForUpgradeType";
import { resolveReEngagementBoostForUpgradeType } from "../resolveReEngagementBoostForUpgradeType";
import type { ProgressionData, ProgressionLevel } from "@/types/progression";
import { resolveGoldPassBoostModifier } from "../resolveGoldPassBoost";
import { resolveReEngagementBoostModifier } from "../resolveReEngagementBoost";

export interface SuperchargeProgression {
  currentLevel: number;
  nextLevel?: number;
  maxLevel: number;
  remainingLevels: number;
  nextCost?: number;
  nextUpgradeTime?: number;
  totalCost?: number;
  totalUpgradeTime?: number;
  appliedModifierIds?: string[];
}

/**
 * Calculates Supercharge costs independently from normal building levels.
 * Supercharge records are keyed by the target charge level, so level 1's
 * cost is charged when moving from charge level 0 to 1.
 */
export interface SuperchargeProgressionOptions {
  /** Charge level currently being upgraded; its cost has already been paid. */
  inProgressLevel?: number;
  /** Account whose Gold Pass, return-to-game, and Magic Item state is used. */
  accountTag: string;
}

export async function calculateSuperchargeProgression(
  progression: Pick<ProgressionData, "scMaxLevel" | "supercharge">,
  currentLevel: number,
  options: SuperchargeProgressionOptions,
): Promise<SuperchargeProgression> {
  if (!options.accountTag.trim()) {
    throw new Error("INVALID_ACCOUNT_TAG");
  }

  const now = Date.now();
  const [goldPassSettings, reEngagementSettings, activeMagicEffects] = await Promise.all([
    getGoldPassBoostSettings(options.accountTag),
    getReEngagementBoostSettings(options.accountTag),
    getActiveMagicEffects(options.accountTag),
  ]);
  const upgradeContext = {
    upgradeType: "BUILDER" as const,
    entityType: "building" as const,
    village: "home" as const,
  };
  const goldPassBoost = resolveGoldPassBoostForUpgradeType(upgradeContext, goldPassSettings);
  const reEngagementBoost = resolveReEngagementBoostForUpgradeType(
    upgradeContext,
    reEngagementSettings,
    now,
  );
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

  const goldPassModifier = goldPassBoost
    ? resolveGoldPassBoostModifier(goldPassBoost)
    : { costMultiplier: 1, timeMultiplier: 1, appliedModifierIds: [] };
  const reEngagementModifier = reEngagementBoost
    ? resolveReEngagementBoostModifier(reEngagementBoost)
    : { costMultiplier: 1, timeMultiplier: 1, appliedModifierIds: [] };

  // Supercharges are Home Village building upgrades. Only Builder-targeted
  // boosts are applicable; Research-targeted selections are ignored.
  const builderCostMultiplier =
    (goldPassBoost?.target === "builder" ? goldPassModifier.costMultiplier : 1) *
    (reEngagementBoost?.target === "builder" ? reEngagementModifier.costMultiplier : 1);
  const builderTimeMultiplier =
    (goldPassBoost?.target === "builder" ? goldPassModifier.timeMultiplier : 1) *
    (reEngagementBoost?.target === "builder" ? reEngagementModifier.timeMultiplier : 1);
  const appliedModifierIds = [
    ...(goldPassBoost?.target === "builder" ? goldPassModifier.appliedModifierIds : []),
    ...(reEngagementBoost?.target === "builder" ? reEngagementModifier.appliedModifierIds : []),
  ];

  const baseNextCost = nextData?.cost;
  const baseNextUpgradeTime = nextData?.upgradeTime;
  const nextCost = baseNextCost == null
    ? undefined
    : Math.round(baseNextCost * builderCostMultiplier);

  let nextUpgradeTime = baseNextUpgradeTime == null
    ? undefined
    : Math.round(baseNextUpgradeTime * builderTimeMultiplier);

  // Timed Magic Item effects are finite and apply to one active/planned charge.
  // Books and Hammers are instant actions, not recurring discounts on future
  // charge totals, so they remain outside this aggregate projection.
  if (
    nextUpgradeTime != null &&
    options.inProgressLevel == null &&
    activeMagicEffects.length > 0
  ) {
    const startedAt = now;
    const baseDurationMs = nextUpgradeTime * 1000;
    const completedAt = resolveUpgradeCompletionTime({
      baseDurationMs,
      startedAt,
      effects: activeMagicEffects,
      target: "builders",
      village: "home",
    });
    nextUpgradeTime = Math.max(0, Math.ceil((completedAt - startedAt) / 1000));
  }

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
    ...(nextCost == null ? {} : { nextCost }),
    ...(nextUpgradeTime == null ? {} : { nextUpgradeTime }),
    ...(hasCompleteCostData
      ? { totalCost: Math.round(totalCost * builderCostMultiplier) }
      : {}),
    ...(hasCompleteTimeData
      ? { totalUpgradeTime: Math.round(totalUpgradeTime * builderTimeMultiplier) }
      : {}),
    ...(appliedModifierIds.length > 0 ? { appliedModifierIds } : {}),
  };
}
