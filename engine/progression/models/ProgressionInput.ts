import type {
    ProgressionData,
} from "@/types/progression";

import type {
    ResolvedEntity
} from "./ResolvedEntity";

export interface ProgressionInput {
  entity: ResolvedEntity;
  progression: ProgressionData;
  currentLevel: number;
  currentHallLevel: number;
}