import { resolveGoldPassBoostForImport } from "@/services/jsonImport/resolveGoldPassBoostForImport";
import type { GoldPassBoostSettings } from "@/types/goldPass";

describe("resolveGoldPassBoostForImport", () => {
  const settings: GoldPassBoostSettings = {
    accountTag: "#ACCOUNT",
    builderBoostPercent: 15,
    researchBoostPercent: 20,
  };

  it.each([
    "building",
    "hero",
    "trap",
    "crafted",
    "townhall",
    "builderhall",
    "guardian",
  ] as const)(
    "uses Builder Boost for Home Village %s upgrades",
    (entityType) => {
      expect(
        resolveGoldPassBoostForImport(
          { upgradeType: "BUILDER", entityType, village: "home" },
          settings,
        ),
      ).toEqual({ target: "builder", percent: 15 });
    },
  );

  it.each(["troop", "spell", "siege"] as const)(
    "uses Research Boost for Home Village Laboratory %s",
    (entityType) => {
      expect(
        resolveGoldPassBoostForImport(
          { upgradeType: "LAB", entityType, village: "home" },
          settings,
        ),
      ).toEqual({ target: "research", percent: 20 });
    },
  );

  it("uses Research Boost for Home Village pet upgrades", () => {
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "PET", entityType: "pet", village: "home" },
        settings,
      ),
    ).toEqual({ target: "research", percent: 20 });
  });

  it("does not apply either boost in Builder Base", () => {
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "BUILDER", entityType: "building", village: "builderBase" },
        settings,
      ),
    ).toBeUndefined();
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "LAB", entityType: "troop", village: "builderBase" },
        settings,
      ),
    ).toBeUndefined();
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "PET", entityType: "pet", village: "builderBase" },
        settings,
      ),
    ).toBeUndefined();
  });
});
