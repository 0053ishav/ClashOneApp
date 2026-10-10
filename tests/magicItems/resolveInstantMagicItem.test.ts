import { resolveInstantMagicItem } from "@/engine/magicItems/resolveInstantMagicItem";

describe("resolveInstantMagicItem", () => {
  it("allows a Book of Building to complete an active building upgrade", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "book-of-building",
        village: "home",
        target: "building",
        hasActiveUpgrade: true,
      }),
    ).toEqual({
      allowed: true,
      action: {
        kind: "complete-current-upgrade",
        itemId: "book-of-building",
        target: "building",
        village: "home",
      },
    });
  });

  it("rejects a Book when there is no active upgrade timer", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "book-of-building",
        village: "home",
        target: "building",
      }),
    ).toEqual({ allowed: false, reason: "no-active-upgrade" });
  });

  it("allows Book of Heroes to complete Hero and Pet upgrades", () => {
    for (const target of ["hero", "pet"] as const) {
      expect(
        resolveInstantMagicItem({
          itemId: "book-of-heroes",
          village: "home",
          target,
          hasActiveUpgrade: true,
        }),
      ).toMatchObject({
        allowed: true,
        action: { kind: "complete-current-upgrade", target },
      });
    }
  });

  it("allows Book of Everything for an active eligible upgrade target", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "book-of-everything",
        village: "builderBase",
        target: "building",
        hasActiveUpgrade: true,
      }),
    ).toMatchObject({
      allowed: true,
      action: { kind: "complete-current-upgrade" },
    });
  });

  it("rejects a Book of Spells in Builder Base", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "book-of-spells",
        village: "builderBase",
        target: "spell",
        hasActiveUpgrade: true,
      }),
    ).toEqual({ allowed: false, reason: "unsupported-village" });
  });

  it("rejects a Book when its target does not match", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "book-of-fighting",
        village: "home",
        target: "spell",
        hasActiveUpgrade: true,
      }),
    ).toEqual({ allowed: false, reason: "incompatible-target" });
  });

  it("requires a free Builder for Hammer of Building", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "hammer-of-building",
        village: "home",
        target: "building",
        hasNextLevel: true,
      }),
    ).toEqual({ allowed: false, reason: "free-builder-required" });

    expect(
      resolveInstantMagicItem({
        itemId: "hammer-of-building",
        village: "home",
        target: "building",
        hasNextLevel: true,
        freeBuilderAvailable: true,
      }),
    ).toMatchObject({
      allowed: true,
      action: {
        kind: "upgrade-to-next-level",
        includesUpgradeCost: true,
      },
    });
  });

  it("allows Hammer of Building in Builder Base when a Builder is free", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "hammer-of-building",
        village: "builderBase",
        target: "building",
        hasNextLevel: true,
        freeBuilderAvailable: true,
      }),
    ).toMatchObject({
      allowed: true,
      action: { kind: "upgrade-to-next-level", village: "builderBase" },
    });
  });

  it("requires a next level for Hammers", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "hammer-of-fighting",
        village: "home",
        target: "troop",
      }),
    ).toEqual({ allowed: false, reason: "no-next-level" });
  });

  it("rejects an unknown item and a timed potion", () => {
    expect(
      resolveInstantMagicItem({
        itemId: "missing-item",
        village: "home",
        target: "building",
        hasActiveUpgrade: true,
        hasNextLevel: true,
      }),
    ).toEqual({ allowed: false, reason: "unknown-item" });

    expect(
      resolveInstantMagicItem({
        itemId: "builder-potion",
        village: "home",
        target: "builders",
      }),
    ).toEqual({ allowed: false, reason: "not-an-instant-item" });
  });
});
