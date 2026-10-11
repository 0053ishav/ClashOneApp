import { resolveReEngagementBoostModifier } from "@/engine/progression/resolveReEngagementBoost";

describe("resolveReEngagementBoostModifier", () => {
  it.each([
    [0, 1],
    [10, 0.9],
    [25, 0.75],
    [50, 0.5],
    [100, 0],
  ])("resolves %i%% to cost/time multiplier %f", (percent, multiplier) => {
    expect(resolveReEngagementBoostModifier({
      target: "builder",
      percent,
    })).toEqual({
      costMultiplier: multiplier,
      timeMultiplier: multiplier,
      appliedModifierIds: percent === 0 ? [] : ["re-engagement-builder-boost"],
    });
  });

  it("supports the Research target independently", () => {
    expect(resolveReEngagementBoostModifier({
      target: "research",
      percent: 20,
    })).toEqual({
      costMultiplier: 0.8,
      timeMultiplier: 0.8,
      appliedModifierIds: ["re-engagement-research-boost"],
    });
  });

  it.each([-1, 101, 12, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid percentages (%s)",
    (percent) => {
      expect(() => resolveReEngagementBoostModifier({
        target: "builder",
        percent,
      })).toThrow("INVALID_RE_ENGAGEMENT_BOOST_PERCENT");
    },
  );
});
