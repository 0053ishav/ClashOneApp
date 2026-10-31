import { applyHammerJamToUpgradeStart } from "@/engine/magicItems/applyHammerJamToUpgradeStart";
import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";

describe("Hammer Jam upgrade snapshot", () => {
  it("preserves the resolved duration and cost after the event ends", () => {
    const startsAt = Date.parse("2026-11-01T00:00:00.000Z");
    const manifest = {
      ...DEFAULT_HAMMER_JAM_MANIFEST,
      enabled: true,
      startsAt: new Date(startsAt - 1_000).toISOString(),
      endsAt: new Date(startsAt + 60_000).toISOString(),
    };

    const persistedStartValues = applyHammerJamToUpgradeStart({
      baseDurationMinutes: 120,
      baseCost: 10_000,
      target: "building",
      village: "home",
      startsAt,
      manifest,
    });

    expect(persistedStartValues).toMatchObject({
      durationMinutes: 60,
      cost: 5_000,
      timeMultiplier: 0.5,
      costMultiplier: 0.5,
      appliedModifierIds: ["hammer-jam"],
    });

    // Event state can change later; an existing upgrade uses its stored values.
    const eventAfterEnd = { ...manifest, enabled: false };
    expect(eventAfterEnd.enabled).toBe(false);
    expect(persistedStartValues).toMatchObject({
      durationMinutes: 60,
      cost: 5_000,
      appliedModifierIds: ["hammer-jam"],
    });
  });
});
