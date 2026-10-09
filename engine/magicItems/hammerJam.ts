import type { Village } from "@/types/entity";
import type {
  ResolvedUpgradeStartModifiers,
  UpgradeStartModifier,
} from "@/types/magicItem";

export type HammerJamManifest = {
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  timeMultiplier: number;
  costMultiplier: number;
  appliesTo: readonly ["building", "troop", "spell", "hero", "pet"];
  villages: readonly Village[];
};

export const DEFAULT_HAMMER_JAM_MANIFEST: HammerJamManifest = {
  enabled: false,
  startsAt: null,
  endsAt: null,
  timeMultiplier: 0.5,
  costMultiplier: 0.5,
  appliesTo: ["building", "troop", "spell", "hero", "pet"],
  villages: ["home"],
};

function isValidTimestamp(value: string | null): value is string {
  return value != null && Number.isFinite(Date.parse(value));
}

export function isHammerJamActive(
  manifest: HammerJamManifest,
  now = Date.now(),
): boolean {
  if (!manifest.enabled) return false;
  if (!isValidTimestamp(manifest.startsAt) || !isValidTimestamp(manifest.endsAt)) {
    return false;
  }

  const startsAt = Date.parse(manifest.startsAt);
  const endsAt = Date.parse(manifest.endsAt);

  return endsAt > startsAt && now >= startsAt && now < endsAt;
}

export function resolveHammerJamStartModifier({
  manifest,
  target,
  village,
  startsAt,
}: {
  manifest: HammerJamManifest;
  target: string;
  village: Village;
  startsAt: number;
}): ResolvedUpgradeStartModifiers {
  const activeAtStart = isHammerJamActive(manifest, startsAt);
  const appliesToTarget = manifest.appliesTo.includes(
    target as (typeof manifest.appliesTo)[number],
  );
  const appliesToVillage = manifest.villages.includes(village);

  if (
    !activeAtStart ||
    !appliesToTarget ||
    !appliesToVillage ||
    manifest.timeMultiplier <= 0 ||
    manifest.timeMultiplier > 1 ||
    manifest.costMultiplier <= 0 ||
    manifest.costMultiplier > 1
  ) {
    return {
      timeMultiplier: 1,
      costMultiplier: 1,
      appliedModifierIds: [],
    };
  }

  return {
    timeMultiplier: manifest.timeMultiplier,
    costMultiplier: manifest.costMultiplier,
    appliedModifierIds: ["hammer-jam"],
  };
}

export function toUpgradeStartModifier(
  manifest: HammerJamManifest,
): UpgradeStartModifier | null {
  if (
    !manifest.enabled ||
    !isValidTimestamp(manifest.startsAt) ||
    !isValidTimestamp(manifest.endsAt) ||
    Date.parse(manifest.endsAt) <= Date.parse(manifest.startsAt)
  ) {
    return null;
  }

  return {
    id: "hammer-jam",
    startsAt: Date.parse(manifest.startsAt),
    endsAt: Date.parse(manifest.endsAt),
    timeMultiplier: manifest.timeMultiplier,
    costMultiplier: manifest.costMultiplier,
    appliesTo: [...manifest.appliesTo],
    villages: [...manifest.villages],
  };
}
