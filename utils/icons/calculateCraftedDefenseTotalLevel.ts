/**
 * Calculates the overall crafted-defense level from every module's level.
 * When previewing an upgrade, override only the module being upgraded.
 */
export function calculateCraftedDefenseTotalLevel(
  moduleLevels: Record<number, number>,
  moduleId?: number,
  moduleLevelOverride?: number,
): number {
  return Object.entries(moduleLevels).reduce((total, [id, level]) => {
    const resolvedLevel =
      moduleId != null &&
      Number(id) === moduleId &&
      moduleLevelOverride != null
        ? moduleLevelOverride
        : level;

    return total + resolvedLevel;
  }, 0);
}
