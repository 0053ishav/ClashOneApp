import type { ResolvedProgression } from "../models";

export function calculateUpgradeCost(
  progression: ResolvedProgression,
): number {
  return progression.next?.cost ?? 0;
}