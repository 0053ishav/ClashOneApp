import { getAccountByTag } from "@/services/accountService";
import type { PlayerProfile } from "@/types/player";
import { switchAccountService } from "@/services/accountSwitchService";
import { setActiveAccount } from "@/storage/activeAccount";
import {
  getPlayerProfile,
  savePlayerProfile,
} from "@/storage/playerProfile";

jest.mock("@/services/accountService", () => ({
  getAccountByTag: jest.fn(),
}));

jest.mock("@/storage/activeAccount", () => ({
  setActiveAccount: jest.fn(),
}));

jest.mock("@/storage/playerProfile", () => ({
  getPlayerProfile: jest.fn(),
  savePlayerProfile: jest.fn(),
}));

const mockGetAccountByTag = jest.mocked(getAccountByTag);
const mockSetActiveAccount = jest.mocked(setActiveAccount);
const mockGetPlayerProfile = jest.mocked(getPlayerProfile);
const mockSavePlayerProfile = jest.mocked(savePlayerProfile);

describe("switchAccountService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an empty tag without changing the active account", async () => {
    await expect(switchAccountService("  ")).rejects.toThrow("INVALID_ACCOUNT_TAG");

    expect(mockGetAccountByTag).not.toHaveBeenCalled();
    expect(mockSetActiveAccount).not.toHaveBeenCalled();
    expect(mockSavePlayerProfile).not.toHaveBeenCalled();
  });

  it("does not persist a nonexistent account as active", async () => {
    mockGetAccountByTag.mockResolvedValue(null);

    await expect(switchAccountService("#MISSING")).rejects.toThrow("ACCOUNT_NOT_FOUND");

    expect(mockGetAccountByTag).toHaveBeenCalledWith("#MISSING");
    expect(mockSetActiveAccount).not.toHaveBeenCalled();
    expect(mockGetPlayerProfile).not.toHaveBeenCalled();
    expect(mockSavePlayerProfile).not.toHaveBeenCalled();
  });

  it("activates and updates only the selected account's profile", async () => {
    mockGetAccountByTag.mockResolvedValue({
      tag: "#TARGET",
      name: "Target village",
      color: "#fbbf24",
      townhall: 16,
      builderCount: 6,
      builderBaseBuilderCount: 2,
    });
    const existingProfile: PlayerProfile & { customField: string } = {
      id: "profile-target",
      playerTag: "#TARGET",
      playerName: "Old name",
      townHallLevel: 15,
      normalBuilderCount: 5,
      builderBaseBuilderCount: 1,
      playerApiConnected: false,
      customField: "preserved",
    };
    mockGetPlayerProfile.mockReturnValue(existingProfile);

    await switchAccountService("#TARGET");

    expect(mockSetActiveAccount).toHaveBeenCalledWith("#TARGET");
    expect(mockSavePlayerProfile).toHaveBeenCalledWith("#TARGET", {
      id: "profile-target",
      playerTag: "#TARGET",
      playerName: "Target village",
      townHallLevel: 16,
      normalBuilderCount: 5,
      builderBaseBuilderCount: 1,
      playerApiConnected: false,
      customField: "preserved",
    });
  });
});
