import type { EntityType, Village } from "@/types/entity";
import type { GoldPassBoostTarget } from "@/types/goldPass";

export type GoldPassBoostApplicabilityInput = {
  village: Village;
  entityType: EntityType;
  target: GoldPassBoostTarget;
};

/**
 * Gold Pass eligibility rules for upgrade projections.
 *
 * Builder Boost covers Home Village buildings (including walls), heroes,
 * traps, crafted defenses, halls, and guardians. Research Boost covers Home
 * Village Laboratory troops, spells, siege machines, and pets.
 * Every Builder Base upgrade is excluded.
 */
export function isGoldPassBoostApplicable({
  village,
  entityType,
  target,
}: GoldPassBoostApplicabilityInput): boolean {
  if (village !== "home") return false;

  switch (target) {
    case "builder":
      return (
        entityType === "building" ||
        entityType === "hero" ||
        entityType === "trap" ||
        entityType === "crafted" ||
        entityType === "townhall" ||
        entityType === "builderhall" ||
        entityType === "guardian"
      );
    case "research":
      return (
        entityType === "troop" ||
        entityType === "spell" ||
        entityType === "siege" ||
        entityType === "pet"
      );
    default:
      return false;
  }
}
