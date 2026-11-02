import type { HammerJamBoostSelection, HammerJamTarget } from "@/types/hammerJam";
import type { Village } from "@/types/entity";
import { applyHammerJamToUpgradeStart } from "@/engine/magicItems/applyHammerJamToUpgradeStart";

export type ResolvedHammerJamBoostModifier = {
  costMultiplier: number;
  timeMultiplier: number;
  appliedModifierIds: string[];
};

export type ResolveHammerJamBoostModifierInput = {
  selection: HammerJamBoostSelection;
  target: HammerJamTarget;
  village: Village;
  baseDurationMinutes: number;
  baseCost?: number;
};

/**
 * Resolve the event-bound Hammer Jam boost into progression multipliers.
 * Like other progression boosts, this keeps selection/configuration separate
 * from the engine's multiplier composition.
 */
export function resolveHammerJamBoostModifier({
  selection,
  target,
  village,
  baseDurationMinutes,
  baseCost,
}: ResolveHammerJamBoostModifierInput): ResolvedHammerJamBoostModifier {
  if (!Number.isFinite(selection.startsAt)) {
    throw new Error("INVALID_UPGRADE_START_TIMESTAMP");
  }

  const result = applyHammerJamToUpgradeStart({
    ...(baseCost == null ? {} : { baseCost }),
    baseDurationMinutes,
    target,
    village,
    startsAt: selection.startsAt,
    manifest: selection.manifest,
  });

  return {
    costMultiplier: result.costMultiplier,
    timeMultiplier: result.timeMultiplier,
    appliedModifierIds: result.appliedModifierIds,
  };
}
