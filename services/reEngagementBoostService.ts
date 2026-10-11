import { getDB } from "@/db/database";
import type { ReEngagementBoostSettings } from "@/types/reEngagementBoost";

type ReEngagementBoostSettingsRow = {
  account_player_tag: string;
  builder_boost_percent: number;
  builder_boost_expires_at: number | null;
  research_boost_percent: number;
  research_boost_expires_at: number | null;
};

function assertAccountTag(accountTag: string): void {
  if (!accountTag.trim()) {
    throw new Error("INVALID_ACCOUNT_TAG");
  }
}

function assertPercent(value: number, target: "builder" | "research"): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100) {
    throw new Error(`INVALID_RE_ENGAGEMENT_${target.toUpperCase()}_BOOST_PERCENT`);
  }
}

function assertExpiresAt(value: number | null, target: "builder" | "research"): void {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`INVALID_RE_ENGAGEMENT_${target.toUpperCase()}_BOOST_EXPIRY`);
  }
}

function mapSettingsRow(
  row: ReEngagementBoostSettingsRow,
  accountTag: string,
): ReEngagementBoostSettings {
  const settings: ReEngagementBoostSettings = {
    accountTag,
    builderBoostPercent: Number(row.builder_boost_percent),
    builderBoostExpiresAt:
      row.builder_boost_expires_at == null
        ? null
        : Number(row.builder_boost_expires_at),
    researchBoostPercent: Number(row.research_boost_percent),
    researchBoostExpiresAt:
      row.research_boost_expires_at == null
        ? null
        : Number(row.research_boost_expires_at),
  };

  assertPercent(settings.builderBoostPercent, "builder");
  assertExpiresAt(settings.builderBoostExpiresAt, "builder");
  assertPercent(settings.researchBoostPercent, "research");
  assertExpiresAt(settings.researchBoostExpiresAt, "research");

  return settings;
}

/** Read return-to-game boost configuration for one account, defaulting to inactive. */
export async function getReEngagementBoostSettings(
  accountTag: string,
): Promise<ReEngagementBoostSettings> {
  assertAccountTag(accountTag);

  const db = await getDB();
  const row = await db.getFirstAsync<ReEngagementBoostSettingsRow>(
    `SELECT account_player_tag, builder_boost_percent, builder_boost_expires_at,
            research_boost_percent, research_boost_expires_at
     FROM re_engagement_boost_settings
     WHERE account_player_tag = ?
     LIMIT 1`,
    [accountTag],
  );

  if (!row) {
    return {
      accountTag,
      builderBoostPercent: 0,
      builderBoostExpiresAt: null,
      researchBoostPercent: 0,
      researchBoostExpiresAt: null,
    };
  }

  return mapSettingsRow(row, accountTag);
}

/** Save percentages and absolute expiry times as an account-scoped upsert. */
export async function saveReEngagementBoostSettings(
  settings: ReEngagementBoostSettings,
): Promise<void> {
  assertAccountTag(settings.accountTag);
  assertPercent(settings.builderBoostPercent, "builder");
  assertExpiresAt(settings.builderBoostExpiresAt, "builder");
  assertPercent(settings.researchBoostPercent, "research");
  assertExpiresAt(settings.researchBoostExpiresAt, "research");

  const db = await getDB();
  await db.runAsync(
    `INSERT INTO re_engagement_boost_settings
       (account_player_tag, builder_boost_percent, builder_boost_expires_at,
        research_boost_percent, research_boost_expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(account_player_tag) DO UPDATE SET
       builder_boost_percent = excluded.builder_boost_percent,
       builder_boost_expires_at = excluded.builder_boost_expires_at,
       research_boost_percent = excluded.research_boost_percent,
       research_boost_expires_at = excluded.research_boost_expires_at`,
    [
      settings.accountTag,
      settings.builderBoostPercent,
      settings.builderBoostExpiresAt,
      settings.researchBoostPercent,
      settings.researchBoostExpiresAt,
    ],
  );
}

/** Delete saved return-to-game boosts for one account. */
export async function deleteReEngagementBoostSettings(
  accountTag: string,
): Promise<void> {
  assertAccountTag(accountTag);

  const db = await getDB();
  await db.runAsync(
    `DELETE FROM re_engagement_boost_settings WHERE account_player_tag = ?`,
    [accountTag],
  );
}
