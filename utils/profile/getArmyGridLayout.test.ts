import { getArmyGridLayout } from "@/utils/profile/getArmyGridLayout";

describe("getArmyGridLayout", () => {
  it.each([
    [5, 264],
    [6, 304],
    [7, 374],
    [8, 700],
  ])("uses %i columns at %i points of available width", (columns, width) => {
    expect(getArmyGridLayout(width).columns).toBe(columns);
  });

  it("returns a safe default before the container has been measured", () => {
    expect(getArmyGridLayout(0)).toEqual({ columns: 5, cardWidth: 0 });
  });

  it("calculates card widths after accounting for inter-card gaps", () => {
    const layout = getArmyGridLayout(304);

    expect(layout.columns).toBe(6);
    expect(layout.cardWidth).toBeCloseTo((304 - 5 * 5) / 6);
  });

  it("handles very narrow containers without returning zero columns", () => {
    expect(getArmyGridLayout(30).columns).toBe(1);
  });
});
