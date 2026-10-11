/**
 * Player-entered return-to-game boost estimates.
 *
 * Clash of Clans does not provide this manually observed perk state in the
 * progression inputs used by Clash One, so each account owns its percentages
 * and expiration timestamps.
 */
export type ReEngagementBoostTarget = "builder" | "research";

export type ReEngagementBoostPercent = number;

export type ReEngagementBoostSelection = {
  target: ReEngagementBoostTarget;
  percent: ReEngagementBoostPercent;
};

export type ReEngagementBoostSettings = {
  accountTag: string;
  builderBoostPercent: ReEngagementBoostPercent;
  builderBoostExpiresAt: number | null;
  researchBoostPercent: ReEngagementBoostPercent;
  researchBoostExpiresAt: number | null;
};

export type ReEngagementBoostPercentages = Pick<
  ReEngagementBoostSettings,
  "builderBoostPercent" | "researchBoostPercent"
>;
