import type { ReEngagementBoostSelection } from "@/types/reEngagementBoost";

export type ResolvedReEngagementBoostModifier = {
  costMultiplier: number;
  timeMultiplier: number;
  appliedModifierIds: string[];
};

/** Resolve a validated return-to-game discount into deterministic multipliers. */
export function resolveReEngagementBoostModifier(
  selection: ReEngagementBoostSelection,
): ResolvedReEngagementBoostModifier {
  if (selection.target !== "builder" && selection.target !== "research") {
    throw new Error("INVALID_RE_ENGAGEMENT_BOOST_TARGET");
  }

  if (
    !Number.isSafeInteger(selection.percent) ||
    selection.percent < 0 ||
    selection.percent > 100
  ) {
    throw new Error("INVALID_RE_ENGAGEMENT_BOOST_PERCENT");
  }

  const multiplier = (100 - selection.percent) / 100;

  return {
    costMultiplier: multiplier,
    timeMultiplier: multiplier,
    appliedModifierIds:
      selection.percent === 0
        ? []
        : [`re-engagement-${selection.target}-boost`],
  };
}
