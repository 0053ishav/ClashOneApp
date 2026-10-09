import { ENV } from "@/config/env";
import {
  DEFAULT_HAMMER_JAM_MANIFEST,
  type HammerJamManifest,
} from "@/engine/magicItems/hammerJam";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHammerJamManifest(value: unknown): HammerJamManifest | null {
  if (!isRecord(value) || !isRecord(value.hammerJam)) return null;

  const event = value.hammerJam;
  if (
    typeof event.enabled !== "boolean" ||
    !(event.startsAt === null || typeof event.startsAt === "string") ||
    !(event.endsAt === null || typeof event.endsAt === "string") ||
    typeof event.timeMultiplier !== "number" ||
    typeof event.costMultiplier !== "number" ||
    !Array.isArray(event.appliesTo) ||
    !event.appliesTo.every((target) => typeof target === "string") ||
    !Array.isArray(event.villages) ||
    !event.villages.every((village) => village === "home" || village === "builderBase")
  ) {
    return null;
  }

  return {
    enabled: event.enabled,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeMultiplier: event.timeMultiplier,
    costMultiplier: event.costMultiplier,
    appliesTo: event.appliesTo as HammerJamManifest["appliesTo"],
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
