import type {
  CraftedDefenseModuleProgression,
  CraftedDefenseProgressionData,
  CraftedDefenseProgressionLevel,
} from "@/types/craftedDefenseProgression";
import { ResourceType } from "@/types/resource";

type RawCraftedProgressionLevel = {
  hallLevel: number;
  stats: Record<string, number>;
  cost: number;
  upgradeTime: number;
  xp: number;
  sparkyStones: number;
  extras?: Record<string, unknown>;
};

type RawCraftedModuleProgression = {
  name: string;
  controls: string;
  resource: ResourceType;
  maxLevel: number;
  levels: Record<
    string,
    RawCraftedProgressionLevel
  >;
};

type RawCraftedDefenseProgression = {
  id: number;
  craftingPhase: number;
  targetType: string;
  maxHallLevel: number;
  modules: Record<
    string,
    RawCraftedModuleProgression
  >;
  images?: {
    from: number;
    to: number;
  }[];
};

export type RawCraftedDefenseProgressions =
  RawCraftedDefenseProgression[];

export function normalizeCraftedDefenseProgression(
  raw: RawCraftedDefenseProgressions,
): CraftedDefenseProgressionData[] {
  return raw.map((defense) => {
      const modules: Record<
        number,
        CraftedDefenseModuleProgression
      > = {};

      for (const [
        moduleId,
        module,
      ] of Object.entries(defense.modules)) {
        const levels: Record<
          number,
          CraftedDefenseProgressionLevel
        > = {};

        for (const [
          level,
          data,
        ] of Object.entries(module.levels)) {
          levels[Number(level)] = {
            level: Number(level),
            hallLevel: data.hallLevel,
            stats: data.stats,
            cost: data.cost,
            upgradeTime: data.upgradeTime,
            xp: data.xp,
            sparkyStones: data.sparkyStones,
            extras: data.extras,
          };
        }

        modules[Number(moduleId)] = {
          id: Number(moduleId),
          name: module.name,
          controls: module.controls,
          resource: module.resource,
          maxLevel: module.maxLevel,
          levels,
        };
      }

      return {
        id: defense.id,
        craftingPhase: defense.craftingPhase,
        targetType: defense.targetType,
        maxHallLevel: defense.maxHallLevel,
        modules,
        images: defense.images,
      };
    },
  );
}