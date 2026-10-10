import type { ProgressionData } from "@/types/progression";
import type {
  ProgressionLevel,
} from "./ProgressionLevel";
import type { ResolvedEntity } from "./ResolvedEntity";
import type { ProgressionUpgradeStartContext } from "./ProgressionInput";

export interface ResolvedProgression {
  entity: ResolvedEntity;
  progression: ProgressionData;
  currentLevel: number;
  currentHallLevel: number;
  current?: ProgressionLevel;
  next?: ProgressionLevel;
  maxLevel: number;
  upgradeStartContext?: ProgressionUpgradeStartContext;
}
