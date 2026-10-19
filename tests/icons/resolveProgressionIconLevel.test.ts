import {
  resolveProgressionIconLevel,
  type ProgressionImageRange,
} from "@/utils/icons/resolveProgressionIconLevel";

describe("resolveProgressionIconLevel", () => {
  const images: ProgressionImageRange[] = [
    { from: 1, to: 3, normal: 1 },
    { from: 4, to: 6, normal: 2 },
    { from: 7, to: 9, normal: 3 },
  ];

  it.each([
    [1, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
    [9, 3],
  ])("maps progression level %i to icon level %i", (level, expected) => {
    expect(resolveProgressionIconLevel(level, images)).toBe(expected);
  });

  it("returns undefined when no image range matches", () => {
    expect(resolveProgressionIconLevel(0, images)).toBeUndefined();
    expect(resolveProgressionIconLevel(10, images)).toBeUndefined();
  });

  it("returns undefined when image ranges are absent", () => {
    expect(resolveProgressionIconLevel(5)).toBeUndefined();
    expect(resolveProgressionIconLevel(5, [])).toBeUndefined();
  });
});
