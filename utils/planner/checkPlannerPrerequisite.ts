import type {
  PlannerPrerequisiteStatus,
  UpgradePrerequisite,
} from "@/types/planner";

export interface PlannerPrerequisiteLevels {
  townHallLevel: number;
  laboratoryLevel: number;
  petHouseLevel: number;
  entityLevels: Readonly<Record<string, number>>;
}

export function checkPlannerPrerequisite(
  prerequisite: UpgradePrerequisite,
  levels: PlannerPrerequisiteLevels,
): PlannerPrerequisiteStatus {
  let currentLevel: number;
  switch (prerequisite.kind) {
    case "town-hall-level":
      currentLevel = levels.townHallLevel;
      break;
    case "laboratory-level":
      currentLevel = levels.laboratoryLevel;
      break;
    case "pet-house-level":
      currentLevel = levels.petHouseLevel;
      break;
    case "entity-level":
      if (!Object.prototype.hasOwnProperty.call(levels.entityLevels, prerequisite.entityId)) {
        return { status: "unknown" };
      }
      currentLevel = levels.entityLevels[prerequisite.entityId];
      break;
  }

  if (!Number.isSafeInteger(currentLevel) || currentLevel < 0) {
    return { status: "unknown" };
  }
  return currentLevel >= prerequisite.minimumLevel
    ? { status: "met" }
    : { status: "unmet" };
}
