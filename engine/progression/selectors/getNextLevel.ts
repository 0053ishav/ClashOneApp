import type {
    ProgressionLevel,
    ResolvedProgression,
} from "../models";

export function getNextLevel(
  progression: ResolvedProgression,
): ProgressionLevel | undefined {
  return progression.next;
}