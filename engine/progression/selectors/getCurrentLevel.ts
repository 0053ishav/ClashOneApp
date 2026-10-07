import type {
    ProgressionLevel,
    ResolvedProgression,
} from "../models";

export function getCurrentLevel(
  progression: ResolvedProgression,
): ProgressionLevel | undefined {
  return progression.current;
}