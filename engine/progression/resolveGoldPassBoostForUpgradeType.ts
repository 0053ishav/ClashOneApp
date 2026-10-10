import type { GoldPassBoostSelection, GoldPassBoostSettings } from "@/types/goldPass";
import type { Upgrade } from "@/types/upgrade";

/** Select the manually configured Gold Pass discount for an upgrade scheduler. */
export function resolveGoldPassBoostForUpgradeType(
  upgradeType: Upgrade["upgradeType"],
  settings: GoldPassBoostSettings,
): GoldPassBoostSelection {
  switch (upgradeType) {
    case "BUILDER":
      return {
        target: "builder",
        percent: settings.builderBoostPercent,
      };
    case "LAB":
    case "PET":
      return {
        target: "research",
        percent: settings.researchBoostPercent,
      };
    default: {
      const exhaustive: never = upgradeType;
      throw new Error(`UNSUPPORTED_GOLD_PASS_UPGRADE_TYPE:${exhaustive}`);
    }
  }
}
