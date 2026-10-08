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

    expect(result).toBe(startedAt + 11 * 60 * 60 * 1000);
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

    expect(result).toBe(startedAt + 25 * 60 * 60 * 1000);
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

    expect(result).toBe(startedAt + 25 * 60 * 60 * 1000);
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

    expect(result).toBe(startedAt + 2 * 60 * 60 * 1000);
  });

  it("extends the duration when the same potion is used again", () => {
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

    expect(result).toBe(startedAt + 2 * 60 * 60 * 1000);
  });

  it("stacks different compatible effects additively", () => {
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
          id: "builder-bite-1",
          itemId: "builder-bite",
          startedAt,
          expiresAt: startedAt + 60 * 60 * 1000,
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

    expect(result).toBe(startedAt + 11 * 60 * 60 * 1000);
  });

  it("keeps working at the boosted speed after the second compatible effect expires", () => {
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
          id: "builder-bite-1",
          itemId: "builder-bite",
          startedAt,
          expiresAt: startedAt + 30 * 60 * 1000,
          village: "home",
        },
      ],
    });

    // 30m at 11x = 5.5h of work, then 30m at 10x = 5h of work,
    // leaving 9.5h of normal work.
    expect(result).toBe(startedAt + 10.5 * 60 * 60 * 1000);
  });
});
