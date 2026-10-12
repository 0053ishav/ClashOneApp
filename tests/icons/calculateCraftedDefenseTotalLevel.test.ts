import { calculateCraftedDefenseTotalLevel } from "@/utils/icons/calculateCraftedDefenseTotalLevel";
import { resolveCraftedDefenseIconLevel } from "@/utils/icons/resolveCraftedDefenseIconLevel";
import type { CraftedDefenseImageRange } from "@/types/craftedDefenseProgression";

describe("calculateCraftedDefenseTotalLevel", () => {
  const moduleLevels = { 101: 5, 102: 8, 103: 3 };

  it("sums every module for the current crafted-defense level", () => {
    expect(calculateCraftedDefenseTotalLevel(moduleLevels)).toBe(16);
  });

  it("increments only the module being upgraded for the next level", () => {
    expect(calculateCraftedDefenseTotalLevel(moduleLevels, 102, 9)).toBe(17);
  });

  it("keeps other modules unchanged when the upgraded module is overridden", () => {
    expect(calculateCraftedDefenseTotalLevel(moduleLevels, 101, 6)).toBe(17);
  });

  it("maps both current and next aggregate levels to the expected PNG range", () => {
    const images: CraftedDefenseImageRange[] = [
      { from: 3, to: 11, normal: 1 },
      { from: 12, to: 20, normal: 2 },
      { from: 21, to: 29, normal: 3 },
      { from: 30, to: 30, normal: 4 },
    ];

    const currentTotal = calculateCraftedDefenseTotalLevel(moduleLevels);
    const nextTotal = calculateCraftedDefenseTotalLevel(moduleLevels, 102, 9);

    expect(resolveCraftedDefenseIconLevel(currentTotal, images)).toBe(2);
    expect(resolveCraftedDefenseIconLevel(nextTotal, images)).toBe(2);
  });
});
