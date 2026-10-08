import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";

describe("resolveUpgradeCompletionTime", () => {
  const startedAt = 1_000_000;

  it("applies the Builder Potion at 10x speed", () => {
    const result = resolveUpgradeCompletionTime({
      baseDurationMs: 20 * 60 * 60 * 1000,
      startedAt,
      target: "builders",
      village: "home",
      effects: [
        {
          id: "builder-potion-1",
          itemId: "builder-potion",
          startedAt,
          expiresAt: startedAt + 60 * 60 * 1000,
          village: "home",
        },
      ],
    });

    expect(result).toBe(
      startedAt + 11 * 60 * 60 * 1000,
    );
  });

  it("applies the Research Potion at 24x speed", () => {
    const result = resolveUpgradeCompletionTime({
      baseDurationMs: 48 * 60 * 60 * 1000,
      startedAt,
      target: "research",
      village: "home",
      effects: [
        {
          id: "research-potion-1",
          itemId: "research-potion",
          startedAt,
          expiresAt: startedAt + 60 * 60 * 1000,
          village: "home",
        },
      ],
    });

    expect(result).toBe(
      startedAt + 3 * 60 * 60 * 1000,
    );
  });

  it("applies the Pet Potion at 24x speed", () => {
    const result = resolveUpgradeCompletionTime({
      baseDurationMs: 48 * 60 * 60 * 1000,
      startedAt,
      target: "pet",
      village: "home",
      effects: [
        {
          id: "pet-potion-1",
          itemId: "pet-potion",
          startedAt,
          expiresAt: startedAt + 60 * 60 * 1000,
          village: "home",
        },
      ],
    });

    expect(result).toBe(
      startedAt + 3 * 60 * 60 * 1000,
    );
  });

  it("does not apply a potion to the wrong target", () => {
    const result = resolveUpgradeCompletionTime({
      baseDurationMs: 2 * 60 * 60 * 1000,
      startedAt,
      target: "builders",
      village: "home",
      effects: [
        {
          id: "research-potion-1",
          itemId: "research-potion",
          startedAt,
          expiresAt: startedAt + 60 * 60 * 1000,
          village: "home",
        },
      ],
    });

    expect(result).toBe(
      startedAt + 2 * 60 * 60 * 1000,
    );
  });

  it("does not stack overlapping potion effects", () => {
    const result = resolveUpgradeCompletionTime({
      baseDurationMs: 20 * 60 * 60 * 1000,
      startedAt,
      target: "builders",
      village: "home",
      effects: [
        {
          id: "builder-potion-1",
          itemId: "builder-potion",
          startedAt,
          expiresAt: startedAt + 60 * 60 * 1000,
          village: "home",
        },
        {
          id: "builder-potion-2",
          itemId: "builder-potion",
          startedAt: startedAt + 30 * 60 * 1000,
          expiresAt: startedAt + 90 * 60 * 1000,
          village: "home",
        },
      ],
    });

    expect(result).toBe(
      startedAt + 10 * 60 * 60 * 1000,
    );
  });

  it("allows a potion to begin after the upgrade starts", () => {
    const result = resolveUpgradeCompletionTime({
      baseDurationMs: 20 * 60 * 60 * 1000,
      startedAt,
      target: "builders",
      village: "home",
      effects: [
        {
          id: "builder-potion-1",
          itemId: "builder-potion",
          startedAt: startedAt + 2 * 60 * 60 * 1000,
          expiresAt: startedAt + 3 * 60 * 60 * 1000,
          village: "home",
        },
      ],
    });

    expect(result).toBe(
      startedAt + 13 * 60 * 60 * 1000,
    );
  });
});
