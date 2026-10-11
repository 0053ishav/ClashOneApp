import type { HammerJamManifest } from "@/engine/magicItems/hammerJam";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import type { ReEngagementBoostSelection } from "@/types/reEngagementBoost";
import type {
  ProgressionData,
} from "@/types/progression";

import type {
  ResolvedEntity,
} from "./ResolvedEntity";

/**
 * Event context for a prospective upgrade. The timestamp is explicit so
 * progression calculations stay deterministic and do not read the system clock.
 */
export interface ProgressionUpgradeStartContext {
  startsAt: number;
  hammerJam: HammerJamManifest;
}

/**
 * Context for live resource production. This is evaluated at observation time,
 * independently from modifiers captured when an upgrade starts.
 */
export interface ResourceProductionContext {
  at: number;
  hammerJam: HammerJamManifest;
}

export interface ProgressionInput {
  entity: ResolvedEntity;
  progression: ProgressionData;
  currentLevel: number;
  currentHallLevel: number;
  upgradeStartContext?: ProgressionUpgradeStartContext;
  resourceProductionContext?: ResourceProductionContext;
  /** Manually selected Gold Pass discount for cost and time projections. */
  goldPassBoost?: GoldPassBoostSelection;
  /** Active, account-scoped return-to-game discount for cost and time projections. */
  reEngagementBoost?: ReEngagementBoostSelection;
}
