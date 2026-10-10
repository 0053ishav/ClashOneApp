import { DEFAULT_HAMMER_JAM_MANIFEST } from "./hammerJam";
import { resolveHammerJamResourceProduction } from "./resolveHammerJamResourceProduction";

const EVENT_START = Date.parse("2026-11-01T00:00:00+05:30");
const EVENT_END = Date.parse("2026-11-17T00:00:00+05:30");

const activeManifest = {
  ...DEFAULT_HAMMER_JAM_MANIFEST,
  enabled: true,
  startsAt: new Date(EVENT_START).toISOString(),
  endsAt: new Date(EVENT_END).toISOString(),
  resourceMultiplier: 2,
};

describe("resolveHammerJamResourceProduction", () => {
  it("applies the configured multiplier while the event is active in an eligible village", () => {
    expect(resolveHammerJamResourceProduction({
      baseProduction: 100,
      village: "home",
      at: EVENT_START,
      manifest: activeManifest,
    })).toEqual({
      baseProduction: 100,
      production: 200,
      multiplier: 2,
      appliedModifierIds: ["hammer-jam-resource-production"],
    });
  });

  it("uses the base rate when the event is disabled or outside its time window", () => {
    const disabled = resolveHammerJamResourceProduction({
      baseProduction: 100,
      village: "home",
      at: EVENT_START,
      manifest: { ...activeManifest, enabled: false },
    });
    const beforeStart = resolveHammerJamResourceProduction({
      baseProduction: 100,
      village: "home",
      at: EVENT_START - 1,
      manifest: activeManifest,
    });
    const atEnd = resolveHammerJamResourceProduction({
      baseProduction: 100,
      village: "home",
      at: EVENT_END,
      manifest: activeManifest,
    });

    expect(disabled.production).toBe(100);
    expect(beforeStart.production).toBe(100);
    expect(atEnd.production).toBe(100);
    expect(disabled.appliedModifierIds).toEqual([]);
    expect(beforeStart.appliedModifierIds).toEqual([]);
    expect(atEnd.appliedModifierIds).toEqual([]);
  });

  it("does not apply a Home Village resource modifier to Builder Base", () => {
    const result = resolveHammerJamResourceProduction({
      baseProduction: 100,
      village: "builderBase",
      at: EVENT_START,
      manifest: activeManifest,
    });

    expect(result.production).toBe(100);
    expect(result.multiplier).toBe(1);
    expect(result.appliedModifierIds).toEqual([]);
  });

  it("fails closed for invalid configured multipliers", () => {
    for (const resourceMultiplier of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = resolveHammerJamResourceProduction({
        baseProduction: 100,
        village: "home",
        at: EVENT_START,
        manifest: { ...activeManifest, resourceMultiplier },
      });

      expect(result.production).toBe(100);
      expect(result.multiplier).toBe(1);
      expect(result.appliedModifierIds).toEqual([]);
    }
  });

  it("rejects invalid base production values", () => {
    expect(() => resolveHammerJamResourceProduction({
      baseProduction: -1,
      village: "home",
      at: EVENT_START,
      manifest: activeManifest,
    })).toThrow("INVALID_BASE_RESOURCE_PRODUCTION");
  });
});
