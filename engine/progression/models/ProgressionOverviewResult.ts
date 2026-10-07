import type { OverallProgressionResult } from "./OverallProgressionResult";
import { ProgressionApplicationResult } from "./ProgressionApplicationResult";

export interface ProgressionOverviewResult {
  entities: ProgressionApplicationResult[];
  overall: OverallProgressionResult;
}