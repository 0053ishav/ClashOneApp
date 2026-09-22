import { CraftedResolvedProgression } from "../model";

export function calculateCraftedUpgradeCost(
  progression: CraftedResolvedProgression,
): number {
  return progression.next?.cost ?? 0;
}