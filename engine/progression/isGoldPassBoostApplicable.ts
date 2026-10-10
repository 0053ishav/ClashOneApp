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
 * Builder Boost covers Home Village buildings and heroes. Research Boost
 * covers Home Village Laboratory troops, spells, and siege machines only.
 * Pets and all Builder Base upgrades are explicitly excluded.
 */
export function isGoldPassBoostApplicable({
  village,
  entityType,
  target,
}: GoldPassBoostApplicabilityInput): boolean {
  if (village !== "home") return false;

  switch (target) {
    case "builder":
      return entityType === "building" || entityType === "hero";
    case "research":
      return (
        entityType === "troop" ||
        entityType === "spell" ||
        entityType === "siege"
      );
    default:
      return false;
  }
}
