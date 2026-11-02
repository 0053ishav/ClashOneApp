import type { ProgressionData } from "@/types/progression";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import type { HammerJamBoostSelection } from "@/types/hammerJam";
import type { ReEngagementBoostSelection } from "@/types/reEngagementBoost";
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
  hammerJamBoost?: HammerJamBoostSelection;
  goldPassBoost?: GoldPassBoostSelection;
  reEngagementBoost?: ReEngagementBoostSelection;
}
