import { ResourceType } from "./resource";

export interface CraftedDefenseProgressionLevel {
  level: number;
  hallLevel: number;

  stats: Record<
    string,
    number
  >;

  cost: number;
  upgradeTime: number;
  xp: number;
  sparkyStones: number;

  extras?: Record<
    string,
    unknown
  >;
}

export interface CraftedDefenseModuleProgression {
  id: number;

  name: string;
  controls: string;
  resource: ResourceType;

  maxLevel: number;

  levels: Record<
    number,
    CraftedDefenseProgressionLevel
  >;
}

export interface CraftedDefenseImageRange {
  from: number;
  to: number;
}

export interface CraftedDefenseProgressionData {
  id: number;

  craftingPhase: number;
  targetType: string;

  maxHallLevel: number;

  modules: Record<
    number,
    CraftedDefenseModuleProgression
  >;

  images?: CraftedDefenseImageRange[];
}