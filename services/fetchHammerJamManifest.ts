import { ENV } from "@/config/env";
import {
  DEFAULT_HAMMER_JAM_MANIFEST,
  type HammerJamManifest,
  type HammerJamTarget,
} from "@/engine/magicItems/hammerJam";
import type { Village } from "@/types/entity";

const HAMMER_JAM_TARGETS: readonly HammerJamTarget[] = [
  "building",
  "troop",
  "spell",
  "hero",
  "pet",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHammerJamTarget(value: unknown): value is HammerJamTarget {
  return typeof value === "string" &&
    HAMMER_JAM_TARGETS.some((target) => target === value);
}

function isVillage(value: unknown): value is Village {
  return value === "home" || value === "builderBase";
}

function parseHammerJamManifest(value: unknown): HammerJamManifest | null {
  if (!isRecord(value) || !isRecord(value.hammerJam)) return null;

  const event = value.hammerJam;
  if (
    typeof event.enabled !== "boolean" ||
    !(event.startsAt === null || typeof event.startsAt === "string") ||
    !(event.endsAt === null || typeof event.endsAt === "string") ||
    typeof event.timeMultiplier !== "number" ||
    !Number.isFinite(event.timeMultiplier) ||
    typeof event.costMultiplier !== "number" ||
    !Number.isFinite(event.costMultiplier) ||
    !Array.isArray(event.appliesTo) ||
    !event.appliesTo.every(isHammerJamTarget) ||
    !Array.isArray(event.villages) ||
    !event.villages.every(isVillage)
  ) {
    return null;
  }

  return {
    enabled: event.enabled,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeMultiplier: event.timeMultiplier,
    costMultiplier: event.costMultiplier,
    appliesTo: event.appliesTo,
    villages: event.villages,
  };
}

/**
 * Loads the event schedule from the CDN manifest.
 * Invalid or unavailable remote configuration safely disables Hammer Jam.
 */
export async function fetchHammerJamManifest(): Promise<HammerJamManifest> {
  if (!ENV.CDN_BASE) return DEFAULT_HAMMER_JAM_MANIFEST;

  try {
    const response = await fetch(`${ENV.CDN_BASE}/v2/manifest.json`);
    if (!response.ok) return DEFAULT_HAMMER_JAM_MANIFEST;

    const payload: unknown = await response.json();
    const manifest = parseHammerJamManifest(payload);

    return manifest ?? DEFAULT_HAMMER_JAM_MANIFEST;
  } catch {
    return DEFAULT_HAMMER_JAM_MANIFEST;
  }
}
