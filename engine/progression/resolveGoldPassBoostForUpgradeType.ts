import type { EntityType, Village } from "@/types/entity";
import type { GoldPassBoostSelection, GoldPassBoostSettings } from "@/types/goldPass";
import type { Upgrade } from "@/types/upgrade";
import { isGoldPassBoostApplicable } from "./isGoldPassBoostApplicable";

export type GoldPassUpgradeContext = {
  upgradeType: Upgrade["upgradeType"];
  entityType: EntityType;
  village: Village;
};

/** Select an eligible, manually configured Gold Pass boost for an upgrade. */
export function resolveGoldPassBoostForUpgradeType(
  upgrade: GoldPassUpgradeContext,
  settings: GoldPassBoostSettings,
): GoldPassBoostSelection | undefined {
  switch (upgrade.upgradeType) {
    case "BUILDER":
      if (
        !isGoldPassBoostApplicable({
          village: upgrade.village,
          entityType: upgrade.entityType,
          target: "builder",
        })
      ) {
        return undefined;
      }
      return {
        target: "builder",
        percent: settings.builderBoostPercent,
      };
    case "LAB":
      if (
        !isGoldPassBoostApplicable({
          village: upgrade.village,
          entityType: upgrade.entityType,
          target: "research",
        })
      ) {
        return undefined;
      }
      return {
        target: "research",
        percent: settings.researchBoostPercent,
      };
    case "PET":
      return undefined;
    default: {
      const exhaustive: never = upgrade.upgradeType;
      throw new Error(`UNSUPPORTED_GOLD_PASS_UPGRADE_TYPE:${exhaustive}`);
    }
  }
}
