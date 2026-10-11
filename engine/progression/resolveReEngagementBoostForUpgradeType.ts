import type { EntityType, Village } from "@/types/entity";
import type { Upgrade } from "@/types/upgrade";
import type {
  ReEngagementBoostSelection,
  ReEngagementBoostSettings,
} from "@/types/reEngagementBoost";
import { isGoldPassBoostApplicable } from "./isGoldPassBoostApplicable";
import { resolveReEngagementBoostModifier } from "./resolveReEngagementBoost";

export type ReEngagementUpgradeContext = {
  upgradeType: Upgrade["upgradeType"];
  entityType: EntityType;
  village: Village;
};

/**
 * Return the boost for an eligible upgrade only while its account-scoped timer
 * remains active. Eligibility deliberately matches the Gold Pass Home Village
 * rules, including pets for research and excluding Builder Base.
 */
export function resolveReEngagementBoostForUpgradeType(
  upgrade: ReEngagementUpgradeContext,
  settings: ReEngagementBoostSettings,
  now = Date.now(),
): ReEngagementBoostSelection | undefined {
  if (!Number.isFinite(now) || now < 0) {
    throw new Error("INVALID_RE_ENGAGEMENT_BOOST_REFERENCE_TIME");
  }

  let target: ReEngagementBoostSelection["target"];
  let percent: number;
  let expiresAt: number | null;

  switch (upgrade.upgradeType) {
    case "BUILDER":
      target = "builder";
      percent = settings.builderBoostPercent;
      expiresAt = settings.builderBoostExpiresAt;
      break;
    case "LAB":
    case "PET":
      target = "research";
      percent = settings.researchBoostPercent;
      expiresAt = settings.researchBoostExpiresAt;
      break;
    default: {
      const exhaustive: never = upgrade.upgradeType;
      throw new Error(`UNSUPPORTED_RE_ENGAGEMENT_UPGRADE_TYPE:${exhaustive}`);
    }
  }

  const selection = { target, percent };
  // Validate manually entered/persisted percentages before target or expiry
  // checks so invalid settings are not silently hidden by an inactive timer.
  resolveReEngagementBoostModifier(selection);

  if (
    !isGoldPassBoostApplicable({
      village: upgrade.village,
      entityType: upgrade.entityType,
      target,
    }) ||
    percent === 0 ||
    expiresAt === null ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now
  ) {
    return undefined;
  }

  return selection;
}
