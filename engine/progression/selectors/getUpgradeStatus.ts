import type { UpgradeStatus } from "../models";

export function getUpgradeStatus(
  level: number,
  maxLevel: number,
): UpgradeStatus {
  const progress = level / maxLevel;

  if (level === maxLevel) return "max";
  if (progress >= 0.85) return "near";
  if (progress >= 0.5) return "mid";

  return "low";
}