import type { Village } from "@/types/entity";
import {
  isHammerJamActive,
  type HammerJamManifest,
} from "./hammerJam";

export interface ResourceProductionInput {
  baseProduction: number;
  village: Village;
  at: number;
  manifest: HammerJamManifest;
}

export interface ResourceProductionResult {
  baseProduction: number;
  production: number;
  multiplier: number;
  appliedModifierIds: string[];
}

/**
 * Resolves the live resource-production rate for a resource-producing entity.
 *
 * This is deliberately separate from upgrade-start modifiers: resource
 * production is evaluated at the supplied observation time, while an upgrade's
 * cost and duration are fixed at its start time.
 */
export function resolveHammerJamResourceProduction({
  baseProduction,
  village,
  at,
  manifest,
}: ResourceProductionInput): ResourceProductionResult {
  if (!Number.isFinite(baseProduction) || baseProduction < 0) {
    throw new Error("INVALID_BASE_RESOURCE_PRODUCTION");
  }

  const multiplier = manifest.resourceMultiplier;
  const isValidMultiplier =
    Number.isFinite(multiplier) && multiplier > 0;
  const appliesToVillage = manifest.villages.includes(village);
  const isActive = Number.isFinite(at) && isHammerJamActive(manifest, at);

  if (!isValidMultiplier || !isActive || !appliesToVillage) {
    return {
      baseProduction,
      production: baseProduction,
      multiplier: 1,
      appliedModifierIds: [],
    };
  }

  return {
    baseProduction,
    production: baseProduction * multiplier,
    multiplier,
    appliedModifierIds: ["hammer-jam-resource-production"],
  };
}
