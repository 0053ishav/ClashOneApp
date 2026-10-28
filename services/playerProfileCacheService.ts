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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * SQLite JSON is untrusted input: TypeScript types cannot validate values
 * written by an older app version or corrupted on disk.
 */
function isPlayerFull(value: unknown, expectedTag: string): value is PlayerFull {
  if (!isRecord(value)) return false;

  if (typeof value.tag !== "string" || typeof value.name !== "string") {
    return false;
  }

  if (!value.tag.trim() || value.tag.trim().toUpperCase() !== expectedTag) {
    return false;
  }

  const requiredNumberFields = [
    "expLevel",
    "townHallLevel",
    "trophies",
    "bestTrophies",
    "attackWins",
    "defenseWins",
    "warStars",
    "donations",
    "donationsReceived",
  ] as const;

  return requiredNumberFields.every(
    (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
  );
}

/**
 * Read the latest locally cached profile for a player.
 * Cache keys and embedded tags are normalized to prevent account mismatches.
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
    const parsed: unknown = JSON.parse(row.profile_json);
    if (!isPlayerFull(parsed, normalizedTag) || !Number.isFinite(row.updated_at)) {
      return null;
    }

    return { profile: parsed, updatedAt: row.updated_at };
  } catch {
    // Invalid or corrupt cache entries are misses and will be replaced by a fetch.
    return null;
  }
}

/** Replace the latest cached profile after a successful network response. */
export async function saveCachedPlayerProfile(
  playerTag: string,
  profile: PlayerFull,
): Promise<void> {
  const normalizedTag = normalizePlayerTag(playerTag);
  if (!isPlayerFull(profile, normalizedTag)) {
    throw new Error("INVALID_PLAYER_PROFILE");
  }

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
