import { resolveGoldPassBoostForImport } from "@/services/jsonImport/resolveGoldPassBoostForImport";
import type { GoldPassBoostSettings } from "@/types/goldPass";

describe("resolveGoldPassBoostForImport", () => {
  const settings: GoldPassBoostSettings = {
    accountTag: "#ACCOUNT",
    builderBoostPercent: 15,
    researchBoostPercent: 20,
  };

  it("uses Builder Boost for Home Village buildings", () => {
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "BUILDER", entityType: "building", village: "home" },
        settings,
      ),
    ).toEqual({ target: "builder", percent: 15 });
  });

  it("uses Builder Boost for Home Village heroes", () => {
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "BUILDER", entityType: "hero", village: "home" },
        settings,
      ),
    ).toEqual({ target: "builder", percent: 15 });
  });

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

  it("does not apply Research Boost to pets", () => {
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "PET", entityType: "pet", village: "home" },
        settings,
      ),
    ).toBeUndefined();
  });

  it("does not apply Builder Boost to traps", () => {
    expect(
      resolveGoldPassBoostForImport(
        { upgradeType: "BUILDER", entityType: "trap", village: "home" },
        settings,
      ),
    ).toBeUndefined();
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
  });
});
