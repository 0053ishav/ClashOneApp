import type { ProgressionData } from "@/types/progression";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import type {
  ProgressionLevel,
} from "./ProgressionLevel";
import type { ResolvedEntity } from "./ResolvedEntity";
import type {
  ProgressionUpgradeStartContext,
  ResourceProductionContext,
} from "./ProgressionInput";

export interface ResolvedProgression {
  entity: ResolvedEntity;
  progression: ProgressionData;
  currentLevel: number;
  currentHallLevel: number;
  current?: ProgressionLevel;
  next?: ProgressionLevel;
  maxLevel: number;
  upgradeStartContext?: ProgressionUpgradeStartContext;
  resourceProductionContext?: ResourceProductionContext;
  goldPassBoost?: GoldPassBoostSelection;
}
