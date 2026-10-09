import {
  DEFAULT_HAMMER_JAM_MANIFEST,
  isHammerJamActive,
  resolveHammerJamStartModifier,
} from "@/engine/magicItems/hammerJam";

describe("Hammer Jam", () => {
  const manifest = {
    ...DEFAULT_HAMMER_JAM_MANIFEST,
    enabled: true,
    startsAt: "2026-11-01T00:00:00+05:30",
    endsAt: "2026-11-17T00:00:00+05:30",
  };

  it("is inactive when disabled", () => {
    expect(isHammerJamActive({ ...manifest, enabled: false }, Date.parse(manifest.startsAt))).toBe(false);
  });

  it("uses an inclusive start and exclusive end boundary", () => {
    expect(isHammerJamActive(manifest, Date.parse(manifest.startsAt))).toBe(true);
    expect(isHammerJamActive(manifest, Date.parse(manifest.endsAt) - 1)).toBe(true);
    expect(isHammerJamActive(manifest, Date.parse(manifest.endsAt))).toBe(false);
  });

  it("applies 50% time and cost modifiers to supported Home Village upgrades", () => {
    expect(
      resolveHammerJamStartModifier({
        manifest,
        target: "building",
        village: "home",
        startsAt: Date.parse(manifest.startsAt),
      }),
    ).toEqual({
      timeMultiplier: 0.5,
      costMultiplier: 0.5,
      appliedModifierIds: ["hammer-jam"],
    });
  });

  it("does not apply to Builder Base or unsupported target types", () => {
    const startsAt = Date.parse(manifest.startsAt);

    expect(
      resolveHammerJamStartModifier({
        manifest,
        target: "building",
        village: "builderBase",
        startsAt,
      }),
    ).toEqual({
      timeMultiplier: 1,
      costMultiplier: 1,
      appliedModifierIds: [],
    });

    expect(
      resolveHammerJamStartModifier({
        manifest,
        target: "crafted-defense",
        village: "home",
        startsAt,
      }),
    ).toEqual({
      timeMultiplier: 1,
      costMultiplier: 1,
      appliedModifierIds: [],
    });
  });

  it("uses normal values when the upgrade starts outside the event", () => {
    expect(
      resolveHammerJamStartModifier({
        manifest,
        target: "building",
        village: "home",
        startsAt: Date.parse(manifest.startsAt) - 1,
      }),
    ).toEqual({
      timeMultiplier: 1,
      costMultiplier: 1,
      appliedModifierIds: [],
    });
  });
});
