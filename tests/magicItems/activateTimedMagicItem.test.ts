import { getMagicItem } from "@/config/magicItems";
import { activateTimedMagicItem } from "@/services/activateTimedMagicItem";
import { recordMagicItemActivation } from "@/services/magicItemService";

jest.mock("@/services/magicItemService", () => ({
  recordMagicItemActivation: jest.fn(),
}));

describe("activateTimedMagicItem", () => {
  beforeEach(() => jest.clearAllMocks());

  it("consumes a Home Village Study Soup and creates a one-hour effect", async () => {
    const result = await activateTimedMagicItem({
      accountTag: "#ACCOUNT",
      itemId: "study-soup",
      village: "home",
      target: "research",
      now: 1_000,
      effectId: "effect-1",
    });

    expect(result).toEqual({
      activated: true,
      effect: {
        id: "effect-1",
        itemId: "study-soup",
        startedAt: 1_000,
        expiresAt: 3_601_000,
        village: "home",
      },
    });
    expect(recordMagicItemActivation).toHaveBeenCalledWith({
      accountTag: "#ACCOUNT",
      itemId: "study-soup",
      effect: {
        id: "effect-1",
        itemId: "study-soup",
        startedAt: 1_000,
        expiresAt: 3_601_000,
        village: "home",
      },
    });
  });

  it("extends the effect duration by the requested quantity", async () => {
    const result = await activateTimedMagicItem({
      accountTag: "#ACCOUNT",
      itemId: "study-soup",
      village: "home",
      target: "research",
      now: 1_000,
      effectId: "effect-three",
      quantity: 3,
    });

    expect(result).toEqual({
      activated: true,
      effect: {
        id: "effect-three",
        itemId: "study-soup",
        startedAt: 1_000,
        expiresAt: 10_801_000,
        village: "home",
      },
    });
    expect(recordMagicItemActivation).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3 }),
    );
  });

  it("records activation without passing inventory state", async () => {
    const effect = {
      id: "effect-untracked", itemId: "study-soup", startedAt: 1_000,
      expiresAt: 14_401_000, village: "home",
    };
    await activateTimedMagicItem({
      accountTag: "#ACCOUNT", itemId: "study-soup", village: "home",
      target: "research", now: 1_000, effectId: "effect-untracked", quantity: 4,
    });
    expect(recordMagicItemActivation).toHaveBeenCalledWith({
      accountTag: "#ACCOUNT", itemId: "study-soup", effect, quantity: 4,
    });
  });

  it("rejects Builder Bite in Builder Base without consuming inventory", async () => {
    await expect(
      activateTimedMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "builder-bite",
        village: "builderBase",
        target: "builders",
        now: 1_000,
        effectId: "effect-1",
      }),
    ).resolves.toEqual({
      activated: false,
      reason: "unsupported-village",
    });

    expect(recordMagicItemActivation).not.toHaveBeenCalled();
  });

  it("rejects a timed item used on an incompatible target", async () => {
    await expect(
      activateTimedMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "research-potion",
        village: "home",
        target: "builders",
        now: 1_000,
        effectId: "effect-1",
      }),
    ).resolves.toEqual({
      activated: false,
      reason: "incompatible-target",
    });

    expect(recordMagicItemActivation).not.toHaveBeenCalled();
  });

  it("rejects Books and Hammers from the timed-item path", async () => {
    const item = getMagicItem("book-of-building");
    expect(item).toBeDefined();

    await expect(
      activateTimedMagicItem({
        accountTag: "#ACCOUNT",
        itemId: "book-of-building",
        village: "home",
        target: "building",
        now: 1_000,
        effectId: "effect-1",
      }),
    ).resolves.toEqual({
      activated: false,
      reason: "not-a-timed-speed-item",
    });

    expect(recordMagicItemActivation).not.toHaveBeenCalled();
  });
});
