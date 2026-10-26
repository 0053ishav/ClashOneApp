import {
  resolveProgressionIconLevel,
  resolveProgressionIconLevelOrFirst,
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

  it("returns undefined for invalid levels or invalid image ranges", () => {
    expect(resolveProgressionIconLevel(Number.NaN, images)).toBeUndefined();
    expect(resolveProgressionIconLevel(1, [
      { from: 1, to: 3, normal: 0 },
    ])).toBeUndefined();
  });

  it("returns undefined when image ranges are absent", () => {
    expect(resolveProgressionIconLevel(5)).toBeUndefined();
    expect(resolveProgressionIconLevel(5, [])).toBeUndefined();
  });
});

describe("resolveProgressionIconLevelOrFirst", () => {
  const images: ProgressionImageRange[] = [
    { from: 1, to: 3, normal: 1 },
    { from: 4, to: 6, normal: 2 },
    { from: 7, to: 9, normal: 3 },
  ];

  it("uses the matching image level when a range matches", () => {
    expect(resolveProgressionIconLevelOrFirst(5, images)).toBe(2);
  });

  it.each([0, 10, Number.NaN])(
    "falls back to the first valid configured icon for level %s",
    (level) => {
      expect(resolveProgressionIconLevelOrFirst(level, images)).toBe(1);
    },
  );

  it("skips invalid ranges when selecting the fallback", () => {
    expect(resolveProgressionIconLevelOrFirst(10, [
      { from: 0, to: 3, normal: 0 },
      { from: 1, to: 3, normal: 2 },
    ])).toBe(2);
  });

  it("returns undefined when no valid configured image exists", () => {
    expect(resolveProgressionIconLevelOrFirst(10)).toBeUndefined();
    expect(resolveProgressionIconLevelOrFirst(10, [
      { from: 1, to: 3, normal: 0 },
    ])).toBeUndefined();
  });
});