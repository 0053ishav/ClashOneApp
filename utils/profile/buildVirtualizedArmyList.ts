import type { ParsedArmy, ParsedArmyEntity } from "@/utils/profile/parseArmy";
import type { ProgressionCategory } from "@/components/Profile/ProgressionBreakdownSheet";

export type ArmyCategoryIcon = "flash" | "person" | "paw" | "hammer" | "construct";

export interface ArmyDisplayCategory extends ProgressionCategory {
  icon: ArmyCategoryIcon;
  showViewAll?: boolean;
}

export type VirtualizedArmyListItem =
  | { type: "army-header"; key: "army-header"; total: number }
  | {
      type: "category-row";
      key: string;
      category: ArmyDisplayCategory;
      rowItems: ParsedArmyEntity[];
      rowIndex: number;
      rowCount: number;
    };

export interface VirtualizedArmyList {
  categories: ArmyDisplayCategory[];
  items: VirtualizedArmyListItem[];
}

const DEFAULT_ROW_SIZE = 6;

export function buildVirtualizedArmyList(
  army: ParsedArmy,
  rowSize = DEFAULT_ROW_SIZE,
): VirtualizedArmyList {
  if (!Number.isInteger(rowSize) || rowSize < 1) {
    throw new RangeError("rowSize must be a positive integer");
  }

  const categories: ArmyDisplayCategory[] = [
    { key: "home-troops", title: "Home troops", icon: "flash", items: army.home.troops, showViewAll: true },
    { key: "super-troops", title: "Super Troops", icon: "flash", items: army.home.superTroops },
    { key: "heroes", title: "Heroes", icon: "person", items: army.home.heroes },
    { key: "pets", title: "Pets", icon: "paw", items: army.home.pets },
    { key: "siege-machines", title: "Siege machines", icon: "hammer", items: army.home.siegeMachines },
    { key: "builder-troops", title: "Builder base troops", icon: "construct", items: army.builderBase.troops },
    { key: "builder-heroes", title: "Builder base heroes", icon: "person", items: army.builderBase.heroes },
  ].filter((category) => category.items.length > 0);

  const total = categories.reduce((count, category) => count + category.items.length, 0);
  if (total === 0) return { categories, items: [] };

  const items: VirtualizedArmyListItem[] = [
    { type: "army-header", key: "army-header", total },
  ];

  for (const category of categories) {
    const rowCount = Math.ceil(category.items.length / rowSize);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const start = rowIndex * rowSize;
      items.push({
        type: "category-row",
        key: `${category.key}:row:${rowIndex}`,
        category,
        rowItems: category.items.slice(start, start + rowSize),
        rowIndex,
        rowCount,
      });
    }
  }

  return { categories, items };
}
