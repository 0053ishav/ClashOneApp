import type { ResolvedProgression } from "../models";

export function calculateUpgradeCost(
  progression: ResolvedProgression,
): number | undefined {
  return progression.next?.cost;
}
