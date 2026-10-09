import { ENV } from "@/config/env";
import { fetchManifest } from "@/services/cdnEntities/manifest";
import type { Village } from "@/types/entity";
import {
  DEFAULT_HAMMER_JAM_MANIFEST,
  type HammerJamManifest,
  type HammerJamTarget,
} from "@/engine/magicItems/hammerJam";

const VALID_TARGETS = new Set<HammerJamTarget>([
  "building",
  "troop",
  "spell",
  "hero",
  "pet",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestampOrNull(value: unknown): value is string | null {
  return value === null || (
    typeof value === "string" && Number.isFinite(Date.parse(value))
  );
}

function isVillage(value: unknown): value is Village {
  return value === "home" || value === "builderBase" || value === "global";
}

function parseHammerJamPayload(
  payload: unknown,
  expectedVersion: number,
): HammerJamManifest | null {
  if (
    !isRecord(payload) ||
    payload.version !== expectedVersion ||
    !isRecord(payload.hammerJam)
  ) {
    return null;
  }

  const event = payload.hammerJam;

  if (
    typeof event.title !== "string" ||
    typeof event.enabled !== "boolean" ||
    !isTimestampOrNull(event.startsAt) ||
    !isTimestampOrNull(event.endsAt) ||
    typeof event.timeMultiplier !== "number" ||
    !Number.isFinite(event.timeMultiplier) ||
    event.timeMultiplier <= 0 ||
    event.timeMultiplier > 1 ||
    typeof event.costMultiplier !== "number" ||
    !Number.isFinite(event.costMultiplier) ||
    event.costMultiplier <= 0 ||
    event.costMultiplier > 1 ||
    typeof event.resourceMultiplier !== "number" ||
    !Number.isFinite(event.resourceMultiplier) ||
    event.resourceMultiplier <= 0 ||
    !Array.isArray(event.appliesTo) ||
    !Array.isArray(event.villages)
  ) {
    return null;
  }

  const appliesTo = event.appliesTo.filter(
    (target): target is HammerJamTarget =>
      typeof target === "string" &&
      VALID_TARGETS.has(target as HammerJamTarget),
  );

  const villages = event.villages.filter(isVillage);

  // Reject unknown values rather than silently applying a partial configuration.
  if (
    appliesTo.length !== event.appliesTo.length ||
    villages.length !== event.villages.length
  ) {
    return null;
  }

  return {
    title: event.title,
    enabled: event.enabled,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeMultiplier: event.timeMultiplier,
    costMultiplier: event.costMultiplier,
    resourceMultiplier: event.resourceMultiplier,
    appliesTo,
    villages,
  };
}

/**
 * Reads the global manifest first, then loads the matching Hammer Jam
 * configuration version from the backend. Invalid or unavailable remote
 * configuration safely disables the event.
 */
export async function fetchHammerJamManifest(): Promise<HammerJamManifest> {
  if (!ENV.BACKEND) {
    return DEFAULT_HAMMER_JAM_MANIFEST;
  }

  try {
    const globalManifest = await fetchManifest();
    const expectedVersion = globalManifest.events?.hammerJam;

    if (
      typeof expectedVersion !== "number" ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1
    ) {
      return DEFAULT_HAMMER_JAM_MANIFEST;
    }

    const response = await fetch(`${ENV.BACKEND}/v2/events/hammer-jam`);

    if (!response.ok) {
      return DEFAULT_HAMMER_JAM_MANIFEST;
    }

    const payload: unknown = await response.json();

    return (
      parseHammerJamPayload(payload, expectedVersion) ??
      DEFAULT_HAMMER_JAM_MANIFEST
    );
  } catch {
    return DEFAULT_HAMMER_JAM_MANIFEST;
  }
}
