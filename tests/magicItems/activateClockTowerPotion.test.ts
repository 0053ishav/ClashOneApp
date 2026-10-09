jest.mock("@/services/magicItemService", () => ({
  consumeMagicItem: jest.fn(),
}));

import { activateClockTowerPotion } from "@/services/activateClockTowerPotion";
import { consumeMagicItem } from "@/services/magicItemService";

describe("activateClockTowerPotion", () => {
  beforeEach(() => jest.clearAllMocks());

  it("activates the potion for 30 minutes in Builder Base", async () => {
    await expect(
      activateClockTowerPotion({
        accountTag: "#ACCOUNT",
        itemId: "clock-tower-potion",
        village: "builderBase",
        now: 10_000,
        effectId: "clock-effect-1",
      }),
    ).resolves.toEqual({
      activated: true,
      effect: {
        id: "clock-effect-1",
        itemId: "clock-tower-potion",
        startedAt: 10_000,
        expiresAt: 1_810_000,
        village: "builderBase",
      },
    });

    expect(consumeMagicItem).toHaveBeenCalledWith({
      accountTag: "#ACCOUNT",
      itemId: "clock-tower-potion",
      effect: {
        id: "clock-effect-1",
        itemId: "clock-tower-potion",
        startedAt: 10_000,
        expiresAt: 1_810_000,
        village: "builderBase",
      },
    });
  });

  it("rejects Clock Tower Potion in Home Village without consuming it", async () => {
    await expect(
      activateClockTowerPotion({
        accountTag: "#ACCOUNT",
        itemId: "clock-tower-potion",
        village: "home",
        now: 10_000,
        effectId: "clock-effect-1",
      }),
    ).resolves.toEqual({
      activated: false,
      reason: "unsupported-village",
    });

    expect(consumeMagicItem).not.toHaveBeenCalled();
  });

  it("rejects a non-Clock-Tower item", async () => {
    await expect(
      activateClockTowerPotion({
        accountTag: "#ACCOUNT",
        itemId: "builder-potion",
        village: "builderBase",
        now: 10_000,
        effectId: "clock-effect-1",
      }),
    ).resolves.toEqual({
      activated: false,
      reason: "not-clock-tower-potion",
    });

    expect(consumeMagicItem).not.toHaveBeenCalled();
  });
});
