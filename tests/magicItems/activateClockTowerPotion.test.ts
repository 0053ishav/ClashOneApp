jest.mock("@/services/magicItemService", () => ({
  recordMagicItemActivation: jest.fn(),
}));

import { activateClockTowerPotion } from "@/services/activateClockTowerPotion";
import { recordMagicItemActivation } from "@/services/magicItemService";

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

    expect(recordMagicItemActivation).toHaveBeenCalledWith({
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

  it("extends Clock Tower Potion duration by the requested quantity", async () => {
    const result = await activateClockTowerPotion({
      accountTag: "#ACCOUNT",
      itemId: "clock-tower-potion",
      village: "builderBase",
      now: 10_000,
      effectId: "clock-effect-three",
      quantity: 3,
    });

    expect(result).toEqual({
      activated: true,
      effect: {
        id: "clock-effect-three",
        itemId: "clock-tower-potion",
        startedAt: 10_000,
        expiresAt: 5_410_000,
        village: "builderBase",
      },
    });
    expect(recordMagicItemActivation).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3 }),
    );
  });

  it("records Clock Tower activation without passing inventory state", async () => {
    const effect = {
      id: "clock-effect-untracked", itemId: "clock-tower-potion", startedAt: 10_000,
      expiresAt: 7_210_000, village: "builderBase",
    };
    await activateClockTowerPotion({
      accountTag: "#ACCOUNT", itemId: "clock-tower-potion", village: "builderBase",
      now: 10_000, effectId: "clock-effect-untracked", quantity: 4,
    });
    expect(recordMagicItemActivation).toHaveBeenCalledWith({
      accountTag: "#ACCOUNT", itemId: "clock-tower-potion", effect, quantity: 4,
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

    expect(recordMagicItemActivation).not.toHaveBeenCalled();
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

    expect(recordMagicItemActivation).not.toHaveBeenCalled();
  });
});
