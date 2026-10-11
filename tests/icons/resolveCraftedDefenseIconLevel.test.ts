import { resolveCraftedDefenseIconLevel } from "@/utils/icons/resolveCraftedDefenseIconLevel";
import type { CraftedDefenseImageRange } from "@/types/craftedDefenseProgression";

describe("resolveCraftedDefenseIconLevel", () => {
  const images: CraftedDefenseImageRange[] = [
    { from: 3, to: 11, normal: 1 },
    { from: 12, to: 20, normal: 2 },
    { from: 21, to: 29, normal: 3 },
    { from: 30, to: 30, normal: 4 },
  ];

  it.each([
    [3, 1],
    [11, 1],
    [12, 2],
    [20, 2],
    [21, 3],
    [29, 3],
    [30, 4],
  ])("maps progression level %i to icon level %i", (level, expected) => {
    expect(resolveCraftedDefenseIconLevel(level, images)).toBe(expected);
  });

  it("preserves the supplied level when no image range matches", () => {
    expect(resolveCraftedDefenseIconLevel(2, images)).toBe(2);
    expect(resolveCraftedDefenseIconLevel(31, images)).toBe(31);
  });

  it("preserves the supplied level when image ranges are absent", () => {
    expect(resolveCraftedDefenseIconLevel(7)).toBe(7);
  });
});
