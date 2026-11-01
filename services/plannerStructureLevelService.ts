import type { EntityData } from "@/types/entities";

export interface PlannerStructureLevels {
  laboratoryLevel: number;
  petHouseLevel: number;
}

const STRUCTURE_SLUGS = {
  laboratory: new Set(["laboratory", "lab"]),
  petHouse: new Set(["pethouse"]),
} as const;

function normalizeSlug(slug: string): string {
  return slug.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve prerequisite structures from the imported account level snapshot.
 * Missing metadata or an untracked structure remains level 0 so the planner
 * fails closed rather than unlocking upgrades on an assumed prerequisite.
 */
export function resolvePlannerStructureLevels(
  entities: readonly EntityData[],
  currentLevels: Readonly<Record<string, number>>,
): PlannerStructureLevels {
  let laboratoryLevel = 0;
  let petHouseLevel = 0;

  for (const entity of entities) {
    if (entity.village !== "home") continue;
    const slug = normalizeSlug(entity.slug);
    const level = currentLevels[String(entity.id)];
    if (!Number.isSafeInteger(level) || level < 0) continue;

    if (STRUCTURE_SLUGS.laboratory.has(slug)) {
      laboratoryLevel = Math.max(laboratoryLevel, level);
    } else if (STRUCTURE_SLUGS.petHouse.has(slug)) {
      petHouseLevel = Math.max(petHouseLevel, level);
    }
  }

  return { laboratoryLevel, petHouseLevel };
}
