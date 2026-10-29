import type { ParsedArmy, ParsedArmyEntity } from "@/utils/profile/parseArmy";
import { buildVirtualizedArmyList } from "@/utils/profile/buildVirtualizedArmyList";

function entity(dataId: number): ParsedArmyEntity {
  return {
    dataId,
    name: `Entity ${dataId}`,
    level: 1,
    maxLevel: 10,
    village: "home",
  };
}

function emptyArmy(): ParsedArmy {
  return {
    home: { troops: [], superTroops: [], pets: [], siegeMachines: [], heroes: [] },
    builderBase: { troops: [], heroes: [] },
  };
}

describe("buildVirtualizedArmyList", () => {
  it("groups category entities into stable rows of six without dropping items", () => {
    const army = emptyArmy();
    army.home.troops = Array.from({ length: 13 }, (_, index) => entity(index + 1));

    const result = buildVirtualizedArmyList(army);

    expect(result.items[0]).toEqual({ type: "army-header", key: "army-header", total: 13 });
    const rows = result.items.filter((item) => item.type === "category-row");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.type === "category-row" ? row.rowItems.length : 0)).toEqual([6, 6, 1]);
    expect(rows.map((row) => row.key)).toEqual([
      "home-troops:row:0",
      "home-troops:row:1",
      "home-troops:row:2",
    ]);
    expect(rows.flatMap((row) => row.type === "category-row" ? row.rowItems : []).map((item) => item.dataId))
      .toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
  });

  it("omits empty categories and returns no rows for an empty army", () => {
    const result = buildVirtualizedArmyList(emptyArmy());
    expect(result.categories).toEqual([]);
    expect(result.items).toEqual([]);
  });

  it("preserves category metadata and handles a custom row size", () => {
    const army = emptyArmy();
    army.home.troops = [entity(1), entity(2), entity(3)];
    const result = buildVirtualizedArmyList(army, 2);

    expect(result.categories[0]).toMatchObject({
      key: "home-troops",
      title: "Home troops",
      icon: "flash",
      showViewAll: true,
    });
    const rows = result.items.filter((item) => item.type === "category-row");
    expect(rows.map((row) => row.type === "category-row" ? row.rowItems.length : 0)).toEqual([2, 1]);
  });

  it("rejects a non-positive row size", () => {
    expect(() => buildVirtualizedArmyList(emptyArmy(), 0)).toThrow(RangeError);
  });
});
