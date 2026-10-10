import type { Village } from "@/types/entity";
import type { MagicItemTarget } from "@/types/magicItem";
import {
  type HammerJamManifest,
  resolveHammerJamStartModifier,
} from "@/engine/magicItems/hammerJam";

export type ApplyHammerJamToUpgradeStartInput = {
  baseDurationMinutes: number;
  baseCost?: number;
  target: MagicItemTarget;
  village: Village;
  startsAt: number;
  manifest: HammerJamManifest;
};

export type UpgradeStartValues = {
  durationMinutes: number;
  cost?: number;
  timeMultiplier: number;
  costMultiplier: number;
  appliedModifierIds: string[];
};

/**
 * Applies event modifiers once, at upgrade start.
 *
 * Persist the returned duration/cost with the upgrade. Do not re-evaluate the
 * event later to derive an existing upgrade's end time; that ensures an
 * upgrade started during Hammer Jam retains its reduced duration after the
 * event ends.
 */
export function applyHammerJamToUpgradeStart({
  baseDurationMinutes,
  baseCost,
  target,
  village,
  startsAt,
  manifest,
}: ApplyHammerJamToUpgradeStartInput): UpgradeStartValues {
  if (!Number.isFinite(baseDurationMinutes) || baseDurationMinutes < 0) {
    throw new Error("INVALID_BASE_UPGRADE_DURATION");
  }
  if (baseCost != null && (!Number.isFinite(baseCost) || baseCost < 0)) {
    throw new Error("INVALID_BASE_UPGRADE_COST");
  }

  const modifier = resolveHammerJamStartModifier({
    manifest,
    target,
    village,
    startsAt,
  });

  return {
    durationMinutes: Math.round(baseDurationMinutes * modifier.timeMultiplier),
    ...(baseCost == null
      ? {}
      : { cost: Math.round(baseCost * modifier.costMultiplier) }),
    timeMultiplier: modifier.timeMultiplier,
    costMultiplier: modifier.costMultiplier,
    appliedModifierIds: modifier.appliedModifierIds,
  };
}
