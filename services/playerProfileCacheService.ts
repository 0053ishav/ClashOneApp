import { getDB } from "@/db/database";
import type { PlayerFull } from "@/types/playerFull";

export interface CachedPlayerProfile {
  profile: PlayerFull;
  updatedAt: number;
}

function normalizePlayerTag(playerTag: string): string {
  const normalizedTag = playerTag.trim().toUpperCase();

  if (!normalizedTag) {
    throw new Error("INVALID_ACCOUNT_TAG");
  }

  return normalizedTag;
}

/**
 * Read the latest locally cached profile for a player.
 * Cache keys are normalized so casing/whitespace differences cannot split accounts.
 */
export async function getCachedPlayerProfile(
  playerTag: string,
): Promise<CachedPlayerProfile | null> {
  const normalizedTag = normalizePlayerTag(playerTag);
  const db = await getDB();

  const row = await db.getFirstAsync<{
    profile_json: string;
    updated_at: number;
  }>(
    `SELECT profile_json, updated_at
     FROM player_profile_cache
     WHERE player_tag = ?`,
    [normalizedTag],
  );

  if (!row) {
    return null;
  }

  try {
    return {
      profile: JSON.parse(row.profile_json) as PlayerFull,
      updatedAt: row.updated_at,
    };
  } catch {
    // A corrupt cache entry is treated as a miss and replaced on the next fetch.
    return null;
  }
}

/** Replace the latest cached profile after a successful network response. */
export async function saveCachedPlayerProfile(
  playerTag: string,
  profile: PlayerFull,
): Promise<void> {
  const normalizedTag = normalizePlayerTag(playerTag);
  const db = await getDB();

  await db.runAsync(
    `INSERT INTO player_profile_cache (player_tag, profile_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(player_tag) DO UPDATE SET
       profile_json = excluded.profile_json,
       updated_at = excluded.updated_at`,
    [normalizedTag, JSON.stringify(profile), Date.now()],
  );
}
