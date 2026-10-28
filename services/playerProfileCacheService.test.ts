import { getDB } from "@/db/database";
import {
  getCachedPlayerProfile,
  saveCachedPlayerProfile,
} from "@/services/playerProfileCacheService";
import type { PlayerFull } from "@/types/playerFull";

jest.mock("@/db/database", () => ({
  getDB: jest.fn(),
}));

const mockGetDB = jest.mocked(getDB);

function setupDatabase() {
  const db = {
    getFirstAsync: jest.fn(),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  };

  mockGetDB.mockResolvedValue(
    db as unknown as Awaited<ReturnType<typeof getDB>>,
  );

  return db;
}

const profile: PlayerFull = {
  tag: "#ABC123",
  name: "Test Player",
  expLevel: 100,
  townHallLevel: 16,
  trophies: 5000,
  bestTrophies: 5200,
  attackWins: 100,
  defenseWins: 50,
  warStars: 200,
  donations: 300,
  donationsReceived: 150,
};

describe("player profile cache service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads a profile using a normalized player tag", async () => {
    const db = setupDatabase();
    db.getFirstAsync.mockResolvedValue({
      profile_json: JSON.stringify(profile),
      updated_at: 1234,
    });

    await expect(getCachedPlayerProfile("  #abc123 ")).resolves.toEqual({
      profile,
      updatedAt: 1234,
    });

    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("FROM player_profile_cache"),
      ["#ABC123"],
    );
  });

  it("returns null when the player has no cached profile", async () => {
    const db = setupDatabase();
    db.getFirstAsync.mockResolvedValue(null);

    await expect(getCachedPlayerProfile("#ABC123")).resolves.toBeNull();
  });

  it("treats malformed cached JSON as a cache miss", async () => {
    const db = setupDatabase();
    db.getFirstAsync.mockResolvedValue({
      profile_json: "{invalid",
      updated_at: 1234,
    });

    await expect(getCachedPlayerProfile("#ABC123")).resolves.toBeNull();
  });

  it("upserts the latest profile and records the save time", async () => {
    const db = setupDatabase();

    await saveCachedPlayerProfile("#abc123", profile);

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT(player_tag) DO UPDATE"),
      ["#ABC123", JSON.stringify(profile), expect.any(Number)],
    );
  });

  it("rejects an empty tag before accessing SQLite", async () => {
    await expect(getCachedPlayerProfile("  ")).rejects.toThrow(
      "INVALID_ACCOUNT_TAG",
    );
    await expect(saveCachedPlayerProfile("", profile)).rejects.toThrow(
      "INVALID_ACCOUNT_TAG",
    );
    expect(mockGetDB).not.toHaveBeenCalled();
  });
});
