import { CraftedDefenseData } from "@/types/craftedDefense";
import { CraftedDefenseModuleProgression, CraftedDefenseProgressionData, CraftedDefenseProgressionLevel } from "@/types/craftedDefenseProgression";
import { ResourceType } from "@/types/resource";


export interface CraftedProgressionInput {
  defense: CraftedDefenseData;
  progression: CraftedDefenseProgressionData;

  module: CraftedDefenseModuleProgression;

  currentLevel: number;
  currentHallLevel: number;
  nextLevel: number;
}

export interface CraftedResolvedProgression {
  defense: CraftedDefenseData;
  progression: CraftedDefenseProgressionData;

  module: CraftedDefenseModuleProgression;

  currentLevel: number;
  currentHallLevel: number;

  current:
  | CraftedDefenseProgressionLevel
  | undefined;
  next:
  | CraftedDefenseProgressionLevel
  | undefined;

  maxLevel: number;
}

export interface CraftedProgressionResult {
  dataId: number;
  defenseName: string;

  moduleId: number;
  moduleName: string;

  currentLevel: number;
  nextLevel: number | undefined;

  maxLevel: number;

  remainingLevels: number;
  isMaxLevel: boolean;

  resource: ResourceType;

  nextCost?: number | undefined;
  nextUpgradeTime?: number | undefined;

  remainingCost: number;
  remainingUpgradeTime: number;

  currentHallLevel: number | undefined;
  requiredHallLevel: number | undefined;

  sparkyStones: number | undefined;

  currentStats: Record<string, number>;
  nextStats: Record<string, number>;

  currentXp?: number;
  nextXp?: number;
  progressPercent: number;

  achievableLevel: number;
}