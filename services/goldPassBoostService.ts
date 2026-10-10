import { getDB } from "@/db/database";
import {
  GOLD_PASS_BOOST_PERCENTAGES,
  type GoldPassBoostPercent,
  type GoldPassBoostSettings,
} from "@/types/goldPass";

type GoldPassSettingsRow = {
  account_player_tag: string;
  builder_boost_percent: number;
  research_boost_percent: number;
};

const DEFAULT_BOOST_PERCENT: GoldPassBoostPercent = 0;

function assertAccountTag(accountTag: string): void {
  if (!accountTag.trim()) {
    throw new Error("INVALID_ACCOUNT_TAG");
  }
}

function assertBoostPercent(
  value: number,
  boost: "builder" | "research",
): asserts value is GoldPassBoostPercent {
  if (!GOLD_PASS_BOOST_PERCENTAGES.some((percent) => percent === value)) {
    throw new Error(`INVALID_GOLD_PASS_${boost.toUpperCase()}_BOOST_PERCENT`);
  }
}

function mapSettingsRow(
  row: GoldPassSettingsRow,
  accountTag: string,
): GoldPassBoostSettings {
  const builderBoostPercent = Number(row.builder_boost_percent);
  const researchBoostPercent = Number(row.research_boost_percent);

  // Validate persisted data instead of silently using corrupted settings.
  assertBoostPercent(builderBoostPercent, "builder");
  assertBoostPercent(researchBoostPercent, "research");

  return {
    accountTag,
    builderBoostPercent,
    researchBoostPercent,
  };
}

/** Read Gold Pass settings for one account, defaulting to no discount. */
export async function getGoldPassBoostSettings(
  accountTag: string,
): Promise<GoldPassBoostSettings> {
  assertAccountTag(accountTag);

  const db = await getDB();
  const row = await db.getFirstAsync<GoldPassSettingsRow>(
    `SELECT account_player_tag, builder_boost_percent, research_boost_percent
     FROM gold_pass_settings
     WHERE account_player_tag = ?
     LIMIT 1`,
    [accountTag],
  );

  if (!row) {
    return {
      accountTag,
      builderBoostPercent: DEFAULT_BOOST_PERCENT,
      researchBoostPercent: DEFAULT_BOOST_PERCENT,
    };
  }

  return mapSettingsRow(row, accountTag);
}

/** Persist both manually configured Gold Pass discounts for one account. */
export async function saveGoldPassBoostSettings(
  settings: GoldPassBoostSettings,
): Promise<void> {
  assertAccountTag(settings.accountTag);
  assertBoostPercent(settings.builderBoostPercent, "builder");
  assertBoostPercent(settings.researchBoostPercent, "research");

  const db = await getDB();
  await db.runAsync(
    `INSERT INTO gold_pass_settings
       (account_player_tag, builder_boost_percent, research_boost_percent)
     VALUES (?, ?, ?)
     ON CONFLICT(account_player_tag) DO UPDATE SET
       builder_boost_percent = excluded.builder_boost_percent,
       research_boost_percent = excluded.research_boost_percent`,
    [
      settings.accountTag,
      settings.builderBoostPercent,
      settings.researchBoostPercent,
    ],
  );
}
