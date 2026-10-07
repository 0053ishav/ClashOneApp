import type { CraftedProgressionResult } from "@/engine/crafted/model";
import type { ProgressionResult } from "./ProgressionResult";

export type ProgressionApplicationResult =
  | ProgressionResult
  | CraftedProgressionResult;