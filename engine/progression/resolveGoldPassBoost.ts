import {
  GOLD_PASS_BOOST_PERCENTAGES,
  type GoldPassBoostSelection,
} from "@/types/goldPass";

export type ResolvedGoldPassBoostModifier = {
  costMultiplier: number;
  timeMultiplier: number;
  appliedModifierIds: string[];
};

/** Resolve manually selected Gold Pass cost and time discounts deterministically. */
export function resolveGoldPassBoostModifier(
  selection: GoldPassBoostSelection,
): ResolvedGoldPassBoostModifier {
  if (selection.target !== "builder" && selection.target !== "research") {
    throw new Error("INVALID_GOLD_PASS_BOOST_TARGET");
  }

  if (
    !GOLD_PASS_BOOST_PERCENTAGES.some(
      (percent) => percent === selection.percent,
    )
  ) {
    throw new Error("INVALID_GOLD_PASS_BOOST_PERCENT");
  }

  const multiplier = (100 - selection.percent) / 100;

  return {
    costMultiplier: multiplier,
    timeMultiplier: multiplier,
    appliedModifierIds:
      selection.percent === 0
        ? []
        : [`gold-pass-${selection.target}-boost`],
  };
}
