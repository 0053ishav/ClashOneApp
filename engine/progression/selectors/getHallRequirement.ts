import type { ResolvedProgression } from "../models";

export function getHallRequirement(
  progression: ResolvedProgression,
): number | undefined {
  if (progression.next) {
    return progression.next.requiredHallLevel;
  }

  return progression.current?.requiredHallLevel;
}