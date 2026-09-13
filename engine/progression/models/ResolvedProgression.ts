import { ProgressionData } from "@/types/progression";
import type {
  ProgressionLevel,
  ResolvedEntity
} from "./index";

export interface ResolvedProgression {
  entity: ResolvedEntity;
  progression: ProgressionData;
  currentLevel: number;
  current?: ProgressionLevel;
  next?: ProgressionLevel;
  maxLevel: number;
}