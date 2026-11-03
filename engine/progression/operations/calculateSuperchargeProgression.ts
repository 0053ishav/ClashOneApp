import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import type { ActiveMagicEffect } from "@/types/magicItem";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import type { ReEngagementBoostSelection } from "@/types/reEngagementBoost";
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
  appliedModifierIds: string[];
}

/**
 * Calculates Supercharge costs independently from normal building levels.
 * Supercharge records are keyed by the target charge level, so level 1's
 * cost is charged when moving from charge level 0 to 1.
 */
export interface SuperchargeProgressionOptions {
  /** Charge level currently being upgraded; its cost has already been paid. */
  inProgressLevel?: number;
  /** Gold Pass Builder Boost selected for this account. */
  goldPassBoost?: GoldPassBoostSelection;
  /** Active return-to-game Builder Boost selected for this account. */
  reEngagementBoost?: ReEngagementBoostSelection;
  /**
   * Already-active timed effects. They are applied to the next charge only,
   * never multiplied across all future charges.
   */
  activeMagicEffects?: readonly ActiveMagicEffect[];
  /** Timestamp from which the next charge's active effects are evaluated. */
  magicEffectsStartAt?: number;
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

  const goldPassModifier = options.goldPassBoost
    ? resolveGoldPassBoostModifier(options.goldPassBoost)
    : { costMultiplier: 1, timeMultiplier: 1, appliedModifierIds: [] };
  const reEngagementModifier = options.reEngagementBoost
    ? resolveReEngagementBoostModifier(options.reEngagementBoost)
    : { costMultiplier: 1, timeMultiplier: 1, appliedModifierIds: [] };

  // Supercharges are Home Village building upgrades. Only Builder-targeted
  // boosts are applicable; Research-targeted selections are ignored.
  const builderCostMultiplier =
    (options.goldPassBoost?.target === "builder" ? goldPassModifier.costMultiplier : 1) *
    (options.reEngagementBoost?.target === "builder" ? reEngagementModifier.costMultiplier : 1);
  const builderTimeMultiplier =
    (options.goldPassBoost?.target === "builder" ? goldPassModifier.timeMultiplier : 1) *
    (options.reEngagementBoost?.target === "builder" ? reEngagementModifier.timeMultiplier : 1);
  const appliedModifierIds = [
    ...(options.goldPassBoost?.target === "builder" ? goldPassModifier.appliedModifierIds : []),
    ...(options.reEngagementBoost?.target === "builder" ? reEngagementModifier.appliedModifierIds : []),
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
    options.activeMagicEffects != null &&
    options.activeMagicEffects.length > 0
  ) {
    if (!Number.isFinite(options.magicEffectsStartAt)) {
      throw new Error("INVALID_SUPERCHARGE_MAGIC_EFFECT_START_TIMESTAMP");
    }

    const startedAt = options.magicEffectsStartAt as number;
    const baseDurationMs = nextUpgradeTime * 1000;
    const completedAt = resolveUpgradeCompletionTime({
      baseDurationMs,
      startedAt,
      effects: [...options.activeMagicEffects],
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
    appliedModifierIds,
  };
}
