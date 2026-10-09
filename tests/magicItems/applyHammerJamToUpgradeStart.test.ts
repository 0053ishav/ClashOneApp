import { applyHammerJamToUpgradeStart } from "@/engine/magicItems/applyHammerJamToUpgradeStart";
import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";

describe("applyHammerJamToUpgradeStart", () => {
  const manifest = {
    ...DEFAULT_HAMMER_JAM_MANIFEST,
    enabled: true,
    startsAt: "2026-11-01T00:00:00+05:30",
    endsAt: "2026-11-17T00:00:00+05:30",
  };
  const startsAt = Date.parse(manifest.startsAt);

  it("locks the reduced duration and cost at upgrade start", () => {
    expect(
      applyHammerJamToUpgradeStart({
        baseDurationMinutes: 1_001,
        baseCost: 1_001,
        target: "building",
        village: "home",
        startsAt,
        manifest,
      }),
    ).toEqual({
      durationMinutes: 501,
      cost: 501,
      timeMultiplier: 0.5,
      costMultiplier: 0.5,
      appliedModifierIds: ["hammer-jam"],
    });
  });

  it("uses normal duration and cost when Hammer Jam is inactive", () => {
    expect(
      applyHammerJamToUpgradeStart({
        baseDurationMinutes: 120,
        baseCost: 10_000,
        target: "building",
        village: "home",
        startsAt: startsAt - 1,
        manifest,
      }),
    ).toEqual({
      durationMinutes: 120,
      cost: 10_000,
      timeMultiplier: 1,
      costMultiplier: 1,
      appliedModifierIds: [],
    });
  });

  it("rejects invalid base duration", () => {
    expect(() =>
      applyHammerJamToUpgradeStart({
        baseDurationMinutes: -1,
        target: "building",
        village: "home",
        startsAt,
        manifest,
      }),
    ).toThrow("INVALID_BASE_UPGRADE_DURATION");
  });
});
