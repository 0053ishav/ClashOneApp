import {
  GOLD_PASS_BOOST_PERCENTAGES,
  type GoldPassBoostSelection,
} from "@/types/goldPass";

export type ResolvedGoldPassBoostModifier = {
  timeMultiplier: number;
  appliedModifierIds: string[];
};

/** Resolve a manually selected Gold Pass time discount deterministically. */
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

  return {
    timeMultiplier: (100 - selection.percent) / 100,
    appliedModifierIds:
      selection.percent === 0
        ? []
        : [`gold-pass-${selection.target}-boost`],
  };
}
