import type { CraftedProgressionResult } from "@/engine/crafted/model";
import type { ProgressionUpgradeStartContext } from "@/engine/progression/models";
import type { Village } from "@/types/entity";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import type { ReEngagementBoostSelection } from "@/types/reEngagementBoost";

type ApplyCraftedBoostsInput = {
  village: Village;
  upgradeStartContext?: ProgressionUpgradeStartContext;
  goldPassBoost?: GoldPassBoostSelection;
  reEngagementBoost?: ReEngagementBoostSelection;
};

/**
 * Crafted defenses do not support Hammer Jam, Gold Pass, or Re-engagement
 * progression modifiers. Keep this boundary explicit so generic upgrade
 * options cannot change crafted-defense costs, durations, or modifier IDs.
 */
export function applyBoostsToCraftedProgressionResult(
  result: CraftedProgressionResult,
  _input: ApplyCraftedBoostsInput,
): CraftedProgressionResult {
  return result;
}
