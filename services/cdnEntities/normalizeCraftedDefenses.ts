import type {
  CraftedDefenseData,
  CraftedDefenseModule,
} from "@/types/craftedDefense";
import { ResourceType } from "@/types/resource";

type RawCraftedDefenseModule = {
  name: string;
  stat: string;
  resource: ResourceType;
};

type RawCraftedDefense = {
  name: string;
  modules: Record<
    string,
    RawCraftedDefenseModule
  >;
};

type RawCraftedDefenses =
  Record<string, RawCraftedDefense>;

export function normalizeCraftedDefenses(
  raw: RawCraftedDefenses,
): CraftedDefenseData[] {
  return Object.entries(raw).map(
    ([defenseId, defense]) => {
      const id = Number(defenseId);

      const modules: Record<
        number,
        CraftedDefenseModule
      > = {};

      for (const [
        moduleId,
        module,
      ] of Object.entries(defense.modules)) {
        const numericModuleId =
          Number(moduleId);

        modules[numericModuleId] = {
          id: numericModuleId,
          name: module.name,
          stat: module.stat,
          resource: module.resource,
        };
      }

      return {
        id,
        name: defense.name,
        modules,
      };
    },
  );
}