import { getArmyGridLayout } from "@/utils/profile/getArmyGridLayout";

describe("getArmyGridLayout", () => {
  it.each([
    [264, 5],
    [304, 6],
    [374, 7],
    [700, 8],
  ])("uses %i columns at %i points of available width", (width, columns) => {
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
