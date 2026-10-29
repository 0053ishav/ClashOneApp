import { fetchFullPlayer } from "@/services/clashApi";
import {
  getCachedPlayerProfile,
  saveCachedPlayerProfile,
} from "@/services/playerProfileCacheService";
import { getPlayerProfileSnapshot } from "@/services/playerProfileRepository";
import type { PlayerFull } from "@/types/playerFull";

jest.mock("@/services/clashApi", () => ({
  fetchFullPlayer: jest.fn(),
}));

jest.mock("@/services/playerProfileCacheService", () => ({
  getCachedPlayerProfile: jest.fn(),
  saveCachedPlayerProfile: jest.fn(),
}));

const mockFetchFullPlayer = jest.mocked(fetchFullPlayer);
const mockGetCachedPlayerProfile = jest.mocked(getCachedPlayerProfile);
const mockSaveCachedPlayerProfile = jest.mocked(saveCachedPlayerProfile);

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
  troops: [{ name: "Barbarian", level: 10, maxLevel: 12, village: "home" }],
  achievements: [{
    name: "Nice and Tidy",
    stars: 2,
    value: 250,
    target: 500,
    village: "home",
  }],
};

describe("player profile repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveCachedPlayerProfile.mockResolvedValue(undefined);
  });

  it("returns the cached full profile without fetching the network", async () => {
    mockGetCachedPlayerProfile.mockResolvedValue({ profile, updatedAt: 1234 });

    await expect(getPlayerProfileSnapshot("#ABC123")).resolves.toEqual({
      profile,
      updatedAt: 1234,
      source: "cache",
    });

    expect(mockFetchFullPlayer).not.toHaveBeenCalled();
    expect(mockSaveCachedPlayerProfile).not.toHaveBeenCalled();
  });

  it("fetches and caches on a cache miss, including troops and achievements", async () => {
    mockGetCachedPlayerProfile.mockResolvedValue(null);
    mockFetchFullPlayer.mockResolvedValue(profile);

    const result = await getPlayerProfileSnapshot("#ABC123");

    expect(result.profile).toEqual(profile);
    expect(result.source).toBe("network");
    expect(result.updatedAt).toEqual(expect.any(Number));
    expect(mockFetchFullPlayer).toHaveBeenCalledWith("#ABC123");
    expect(mockSaveCachedPlayerProfile).toHaveBeenCalledWith("#ABC123", profile);
  });

  it("bypasses the cache on explicit refresh and updates the cached snapshot", async () => {
    mockFetchFullPlayer.mockResolvedValue(profile);

    const result = await getPlayerProfileSnapshot("#ABC123", { forceRefresh: true });

    expect(mockGetCachedPlayerProfile).not.toHaveBeenCalled();
    expect(mockFetchFullPlayer).toHaveBeenCalledWith("#ABC123");
    expect(mockSaveCachedPlayerProfile).toHaveBeenCalledWith("#ABC123", profile);
    expect(result.source).toBe("network");
  });

  it("continues to the API when reading the cache fails", async () => {
    mockGetCachedPlayerProfile.mockRejectedValue(new Error("SQLite unavailable"));
    mockFetchFullPlayer.mockResolvedValue(profile);

    await expect(getPlayerProfileSnapshot("#ABC123")).resolves.toMatchObject({
      profile,
      source: "network",
    });
  });

  it("returns fresh API data even when writing it to SQLite fails", async () => {
    mockGetCachedPlayerProfile.mockResolvedValue(null);
    mockFetchFullPlayer.mockResolvedValue(profile);
    mockSaveCachedPlayerProfile.mockRejectedValue(new Error("SQLite unavailable"));

    await expect(getPlayerProfileSnapshot("#ABC123")).resolves.toEqual({
      profile,
      updatedAt: null,
      source: "network",
    });
  });

  it("does not swallow API failures on explicit refresh", async () => {
    mockFetchFullPlayer.mockRejectedValue(new Error("API_FETCH_FAILED"));

    await expect(
      getPlayerProfileSnapshot("#ABC123", { forceRefresh: true }),
    ).rejects.toThrow("API_FETCH_FAILED");
  });
});
