import { calculateCraftedDefenseTotalLevel } from "@/utils/icons/calculateCraftedDefenseTotalLevel";

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
});
