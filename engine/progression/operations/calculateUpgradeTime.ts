import type { ResolvedProgression } from "../models";

export function calculateUpgradeTime(
  progression: ResolvedProgression,
): number | undefined {
  return progression.next?.upgradeTime;
}
