import { flattenProgressionStats } from "@/utils/flattenProgressionStats";

describe("flattenProgressionStats", () => {
  it("flattens Giant's mode stats into scalar rows with readable labels", () => {
    const current = flattenProgressionStats({
      hp: 400,
      modes: {
        normal: {
          dps: 12,
          damagePerShot: 24,
        },
      },
    });

    expect(current).toEqual([
      { path: "hp", label: "Hitpoints", value: 400 },
      {
        path: "modes.normal.dps",
        label: "Normal · Damage per second",
        value: 12,
      },
      {
        path: "modes.normal.damagePerShot",
        label: "Normal · Damage Per Shot",
        value: 24,
      },
    ]);
  });

  it("supports ordinary scalar stats without changing their labels", () => {
    expect(flattenProgressionStats({ hp: 400, dps: 12 })).toEqual([
      { path: "hp", label: "Hitpoints", value: 400 },
      { path: "dps", label: "Damage per second", value: 12 },
    ]);
  });

  it("flattens nested objects and ignores non-numeric leaves", () => {
    expect(
      flattenProgressionStats({
        modes: {
          normal: { dps: 12 },
          special: { dps: 0, enabled: true, note: "not a stat" },
        },
        metadata: null,
      }),
    ).toEqual([
      {
        path: "modes.normal.dps",
        label: "Normal · Damage per second",
        value: 12,
      },
      {
        path: "modes.special.dps",
        label: "Special · Damage per second",
        value: 0,
      },
    ]);
  });

  it("returns an empty list for absent or non-object stats", () => {
    expect(flattenProgressionStats(null)).toEqual([]);
    expect(flattenProgressionStats(undefined)).toEqual([]);
    expect(flattenProgressionStats("invalid")).toEqual([]);
  });
});
