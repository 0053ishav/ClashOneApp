import type { HammerJamManifest } from "@/engine/magicItems/hammerJam";
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

export interface ProgressionInput {
  entity: ResolvedEntity;
  progression: ProgressionData;
  currentLevel: number;
  currentHallLevel: number;
  upgradeStartContext?: ProgressionUpgradeStartContext;
}
