import { CraftedResolvedProgression } from "../model";

export function calculateCraftedUpgradeTime(
  progression: CraftedResolvedProgression,
): number {
  return progression.next?.upgradeTime ?? 0;
}