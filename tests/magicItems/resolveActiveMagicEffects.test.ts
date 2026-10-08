import { describe, expect, it } from "vitest";
import { resolveActiveMagicEffects } from "@/engine/magicItems/resolveActiveMagicEffects";

describe("resolveActiveMagicEffects", () => {
  const now = 1_000_000;

  it("resolves an active builder potion for a home builder", () => {
    const result = resolveActiveMagicEffects({
      now,
      target: "builders",
      village: "home",
      effects: [
        {
          id: "effect-1",
          itemId: "builder-potion",
          startedAt: now - 10_000,
          expiresAt: now + 50 * 60 * 1000,
          village: "home",
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        itemId: "builder-potion",
        multiplier: 10,
      }),
    ]);
  });

  it("ignores an expired effect", () => {
    const result = resolveActiveMagicEffects({
      now,
      target: "builders",
      village: "home",
      effects: [
        {
          id: "effect-1",
          itemId: "builder-potion",
          startedAt: now - 2 * 60 * 60 * 1000,
          expiresAt: now - 1,
          village: "home",
        },
      ],
    });

    expect(result).toEqual([]);
  });

  it("ignores an effect from another village", () => {
    const result = resolveActiveMagicEffects({
      now,
      target: "builders",
      village: "home",
      effects: [
        {
          id: "effect-1",
          itemId: "clock-tower-potion",
          startedAt: now - 1_000,
          expiresAt: now + 1_000,
          village: "builderBase",
        },
      ],
    });

    expect(result).toEqual([]);
  });
});
