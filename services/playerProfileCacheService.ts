import { getDB } from "@/db/database";
import type { PlayerFull } from "@/types/playerFull";

export interface CachedPlayerProfile {
  profile: PlayerFull;
  updatedAt: number;
}

const MAX_IN_MEMORY_PROFILES = 8;
const inMemoryProfiles = new Map<string, CachedPlayerProfile>();

function rememberProfile(playerTag: string, snapshot: CachedPlayerProfile): void {
  inMemoryProfiles.delete(playerTag);
  inMemoryProfiles.set(playerTag, snapshot);

  // Keep a small, account-scoped LRU so switching among saved accounts is fast
  // without retaining an unbounded number of full player payloads.
  if (inMemoryProfiles.size > MAX_IN_MEMORY_PROFILES) {
    const oldestTag = inMemoryProfiles.keys().next().value;
    if (oldestTag) inMemoryProfiles.delete(oldestTag);
  }
}

/** Synchronous cache for profiles already read during this app session. */
export function getInMemoryCachedPlayerProfile(
  playerTag: string,
): CachedPlayerProfile | null {
  const normalizedTag = normalizePlayerTag(playerTag);
  const cached = inMemoryProfiles.get(normalizedTag);
  if (!cached) return null;

  // Refresh LRU order on access.
  rememberProfile(normalizedTag, cached);
  return cached;
}

/** Store a validated profile in the session cache, even if SQLite is unavailable. */
export function rememberPlayerProfileInMemory(
  playerTag: string,
  profile: PlayerFull,
  updatedAt: number | null = Date.now(),
): void {
  const normalizedTag = normalizePlayerTag(playerTag);
  if (!isPlayerFull(profile, normalizedTag)) {
    throw new Error("INVALID_PLAYER_PROFILE");
  }

  rememberProfile(normalizedTag, {
    profile,
    updatedAt: updatedAt ?? Date.now(),
  });
}

/** Clear the process-local cache; exported to keep tests isolated. */
export function clearInMemoryPlayerProfileCache(): void {
  inMemoryProfiles.clear();
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
  const inMemory = inMemoryProfiles.get(normalizedTag);
  if (inMemory) {
    rememberProfile(normalizedTag, inMemory);
    return inMemory;
  }

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

    const snapshot = { profile: parsed, updatedAt: row.updated_at };
    rememberProfile(normalizedTag, snapshot);
    return snapshot;
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

  const updatedAt = Date.now();
  await db.runAsync(
    `INSERT INTO player_profile_cache (player_tag, profile_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(player_tag) DO UPDATE SET
       profile_json = excluded.profile_json,
       updated_at = excluded.updated_at`,
    [normalizedTag, JSON.stringify(profile), updatedAt],
  );
  rememberProfile(normalizedTag, { profile, updatedAt });
}
