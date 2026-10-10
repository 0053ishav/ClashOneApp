/**
 * Manually configured Gold Pass resource-cost and upgrade-time discounts.
 *
 * These values are not supplied by the in-game village JSON export and must
 * be maintained by the player for each account.
 */
export const GOLD_PASS_BOOST_PERCENTAGES = [0, 10, 15, 20] as const;

export type GoldPassBoostPercent =
  (typeof GOLD_PASS_BOOST_PERCENTAGES)[number];

export type GoldPassBoostTarget = "builder" | "research";

export type GoldPassBoostSelection = {
  target: GoldPassBoostTarget;
  percent: GoldPassBoostPercent;
};

export type GoldPassBoostPercentages = Pick<
  GoldPassBoostSettings,
  "builderBoostPercent" | "researchBoostPercent"
>;

export type GoldPassBoostSettings = {
  accountTag: string;
  builderBoostPercent: GoldPassBoostPercent;
  researchBoostPercent: GoldPassBoostPercent;
};
