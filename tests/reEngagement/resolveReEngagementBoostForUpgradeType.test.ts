import { resolveReEngagementBoostForUpgradeType } from "@/engine/progression/resolveReEngagementBoostForUpgradeType";
import type { ReEngagementBoostSettings } from "@/types/reEngagementBoost";

describe("resolveReEngagementBoostForUpgradeType", () => {
  const now = Date.UTC(2026, 0, 1, 12);
  const settings: ReEngagementBoostSettings = {
    accountTag: "#ACCOUNT",
    builderBoostPercent: 25,
    builderBoostExpiresAt: now + 2 * 60 * 60 * 1_000,
    researchBoostPercent: 40,
    researchBoostExpiresAt: now + 3 * 60 * 60 * 1_000,
  };

  it.each([
    ["building", "BUILDER", "builder", 25],
    ["hero", "BUILDER", "builder", 25],
    ["trap", "BUILDER", "builder", 25],
    ["crafted", "BUILDER", "builder", 25],
    ["townhall", "BUILDER", "builder", 25],
    ["builderhall", "BUILDER", "builder", 25],
    ["guardian", "BUILDER", "builder", 25],
    ["troop", "LAB", "research", 40],
    ["spell", "LAB", "research", 40],
    ["siege", "LAB", "research", 40],
    ["pet", "PET", "research", 40],
  ] as const)(
    "applies the active eligible %s boost",
    (entityType, upgradeType, target, percent) => {
      expect(resolveReEngagementBoostForUpgradeType({
        entityType,
        upgradeType,
        village: "home",
      }, settings, now)).toEqual({ target, percent });
    },
  );

  it("excludes every Builder Base target", () => {
    expect(resolveReEngagementBoostForUpgradeType({
      entityType: "building",
      upgradeType: "BUILDER",
      village: "builderBase",
    }, settings, now)).toBeUndefined();

    expect(resolveReEngagementBoostForUpgradeType({
      entityType: "troop",
      upgradeType: "LAB",
      village: "builderBase",
    }, settings, now)).toBeUndefined();
  });

  it("does not apply a boost with no expiry or an expired expiry", () => {
    expect(resolveReEngagementBoostForUpgradeType({
      entityType: "building",
      upgradeType: "BUILDER",
      village: "home",
    }, {
      ...settings,
      builderBoostExpiresAt: null,
    }, now)).toBeUndefined();

    expect(resolveReEngagementBoostForUpgradeType({
      entityType: "building",
      upgradeType: "BUILDER",
      village: "home",
    }, {
      ...settings,
      builderBoostExpiresAt: now,
    }, now)).toBeUndefined();
  });

  it("does not apply boost after expiry even when its percentage remains configured", () => {
    expect(resolveReEngagementBoostForUpgradeType({
      entityType: "troop",
      upgradeType: "LAB",
      village: "home",
    }, settings, settings.researchBoostExpiresAt!)).toBeUndefined();
  });

  it("rejects a non-finite reference timestamp", () => {
    expect(() => resolveReEngagementBoostForUpgradeType({
      entityType: "building",
      upgradeType: "BUILDER",
      village: "home",
    }, settings, Number.NaN)).toThrow("INVALID_RE_ENGAGEMENT_BOOST_REFERENCE_TIME");
  });
});
