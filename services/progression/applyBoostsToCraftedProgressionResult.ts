import type { CraftedProgressionResult } from "@/engine/crafted/model";
import { applyHammerJamToUpgradeStart } from "@/engine/magicItems/applyHammerJamToUpgradeStart";
import type { ProgressionUpgradeStartContext } from "@/engine/progression/models";
import { isGoldPassBoostApplicable } from "@/engine/progression/isGoldPassBoostApplicable";
import { resolveGoldPassBoostModifier } from "@/engine/progression/resolveGoldPassBoost";
import { resolveReEngagementBoostModifier } from "@/engine/progression/resolveReEngagementBoost";
import type { Village } from "@/types/entity";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import type { ReEngagementBoostSelection } from "@/types/reEngagementBoost";

type ApplyCraftedBoostsInput = {
  village: Village;
  upgradeStartContext?: ProgressionUpgradeStartContext;
  goldPassBoost?: GoldPassBoostSelection;
  reEngagementBoost?: ReEngagementBoostSelection;
};

const NO_MODIFIER = {
  costMultiplier: 1,
  timeMultiplier: 1,
  appliedModifierIds: [] as string[],
};

/**
 * Crafted upgrades bypass ProgressionEngine. Apply the same validated cost/time
 * modifiers at this service boundary so eligible crafted Home Village defenses
 * do not silently miss Gold Pass or return-to-game boosts.
 */
export function applyBoostsToCraftedProgressionResult(
  result: CraftedProgressionResult,
  {
    village,
    upgradeStartContext,
    goldPassBoost,
    reEngagementBoost,
  }: ApplyCraftedBoostsInput,
): CraftedProgressionResult {
  const requestedGoldPass = goldPassBoost
    ? resolveGoldPassBoostModifier(goldPassBoost)
    : NO_MODIFIER;
  const applicableGoldPass =
    goldPassBoost &&
    isGoldPassBoostApplicable({
      village,
      entityType: "crafted",
      target: goldPassBoost.target,
    })
      ? requestedGoldPass
      : NO_MODIFIER;

  const requestedReEngagement = reEngagementBoost
    ? resolveReEngagementBoostModifier(reEngagementBoost)
    : NO_MODIFIER;
  const applicableReEngagement =
    reEngagementBoost &&
    isGoldPassBoostApplicable({
      village,
      entityType: "crafted",
      target: reEngagementBoost.target,
    })
      ? requestedReEngagement
      : NO_MODIFIER;

  const costMultiplier =
    applicableGoldPass.costMultiplier * applicableReEngagement.costMultiplier;
  const timeMultiplier =
    applicableGoldPass.timeMultiplier * applicableReEngagement.timeMultiplier;

  // Match the regular progression engine: modifiers only affect an available
  // next-level upgrade, never a maxed entity.
  if (result.isMaxLevel) return result;

  const hammerJamStart =
    upgradeStartContext &&
    result.nextCost != null &&
    result.nextUpgradeTime != null
      ? applyHammerJamToUpgradeStart({
          baseCost: result.nextCost,
          baseDurationMinutes: result.nextUpgradeTime,
          target: "building",
          village,
          startsAt: upgradeStartContext.startsAt,
          manifest: upgradeStartContext.hammerJam,
        })
      : null;

  const nextCostBeforeBoosts =
    hammerJamStart?.cost ?? result.nextCost;
  const nextDurationBeforeBoosts =
    hammerJamStart?.durationMinutes ?? result.nextUpgradeTime;
  const appliedModifierIds = [
    ...(hammerJamStart?.appliedModifierIds ?? []),
    ...applicableGoldPass.appliedModifierIds,
    ...applicableReEngagement.appliedModifierIds,
  ];

  if (appliedModifierIds.length === 0) return result;

  return {
    ...result,
    nextCost:
      nextCostBeforeBoosts == null
        ? nextCostBeforeBoosts
        : Math.round(nextCostBeforeBoosts * costMultiplier),
    nextUpgradeTime:
      nextDurationBeforeBoosts == null
        ? nextDurationBeforeBoosts
        : Math.round(nextDurationBeforeBoosts * timeMultiplier),
    remainingCost: Math.round(result.remainingCost * costMultiplier),
    remainingUpgradeTime: Math.round(
      result.remainingUpgradeTime * timeMultiplier,
    ),
    appliedModifierIds,
  };
}
