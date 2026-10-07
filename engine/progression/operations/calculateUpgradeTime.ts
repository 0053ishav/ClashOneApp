import type { ResolvedProgression } from "../models";

export function calculateUpgradeTime(
  progression: ResolvedProgression,
): number {
  return progression.next?.upgradeTime ?? 0;
}