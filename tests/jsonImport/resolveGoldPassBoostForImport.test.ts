import { resolveGoldPassBoostForImport } from "@/services/jsonImport/resolveGoldPassBoostForImport";
import type { GoldPassBoostSettings } from "@/types/goldPass";

describe("resolveGoldPassBoostForImport", () => {
  const settings: GoldPassBoostSettings = {
    accountTag: "#ACCOUNT",
    builderBoostPercent: 15,
    researchBoostPercent: 20,
  };

  it("uses Builder Boost for builder-scheduled upgrades", () => {
    expect(resolveGoldPassBoostForImport("BUILDER", settings)).toEqual({
      target: "builder",
      percent: 15,
    });
  });

  it("uses Research Boost for laboratory-scheduled upgrades", () => {
    expect(resolveGoldPassBoostForImport("LAB", settings)).toEqual({
      target: "research",
      percent: 20,
    });
  });

  it("uses Research Boost for pet upgrades", () => {
    expect(resolveGoldPassBoostForImport("PET", settings)).toEqual({
      target: "research",
      percent: 20,
    });
  });
});
