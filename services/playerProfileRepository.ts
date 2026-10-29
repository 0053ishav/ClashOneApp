import { fetchFullPlayer } from "@/services/clashApi";
import {
  getCachedPlayerProfile,
  saveCachedPlayerProfile,
} from "@/services/playerProfileCacheService";
import type { PlayerFull } from "@/types/playerFull";

export interface PlayerProfileSnapshot {
  profile: PlayerFull;
  updatedAt: number | null;
  source: "cache" | "network";
}

export interface GetPlayerProfileSnapshotOptions {
  forceRefresh?: boolean;
}

/**
 * Shared cache-first read path for profile-related screens.
 * Cache failures are non-fatal; successful API responses remain usable even
 * when SQLite cannot persist them. Explicit refresh bypasses the cache.
 */
export async function getPlayerProfileSnapshot(
  playerTag: string,
  options: GetPlayerProfileSnapshotOptions = {},
): Promise<PlayerProfileSnapshot> {
  if (!options.forceRefresh) {
    try {
      const cached = await getCachedPlayerProfile(playerTag);
      if (cached) {
        return {
          profile: cached.profile,
          updatedAt: cached.updatedAt,
          source: "cache",
        };
      }
    } catch (error) {
      console.warn("Failed to read cached player profile:", error);
    }
  }

  const profile = await fetchFullPlayer(playerTag);
  let updatedAt: number | null = null;

  try {
    await saveCachedPlayerProfile(playerTag, profile);
    updatedAt = Date.now();
  } catch (error) {
    console.warn("Failed to cache player profile:", error);
  }

  return { profile, updatedAt, source: "network" };
}
