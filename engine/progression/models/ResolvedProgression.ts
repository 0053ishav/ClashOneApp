import { ProgressionData } from "@/types/progression";
import type {
  ProgressionLevel,
} from "./ProgressionLevel";
import { ResolvedEntity } from "./ResolvedEntity";


export interface ResolvedProgression {
  entity: ResolvedEntity;
  progression: ProgressionData;
  currentLevel: number;
  currentHallLevel: number;
  current?: ProgressionLevel;
  next?: ProgressionLevel;
  maxLevel: number;
}