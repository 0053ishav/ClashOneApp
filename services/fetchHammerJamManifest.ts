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

// The backend contract uses Unix seconds. Cap at year 9999 to reject accidental
// millisecond timestamps rather than silently creating an unusable far-future date.
const MAX_UNIX_SECONDS = 253_402_300_799;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnixSeconds(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= MAX_UNIX_SECONDS
  );
}

function parseUnixSeconds(value: unknown): number | null | undefined {
  if (value === null) return null;
  return isUnixSeconds(value) ? value : undefined;
}

function toIsoTimestamp(value: number | null): string | null {
  return value === null ? null : new Date(value * 1000).toISOString();
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
  const startsAtSeconds = parseUnixSeconds(event.startsAt);
  const endsAtSeconds = parseUnixSeconds(event.endsAt);

  if (
    typeof event.title !== "string" ||
    event.title.trim().length === 0 ||
    typeof event.enabled !== "boolean" ||
    startsAtSeconds === undefined ||
    endsAtSeconds === undefined ||
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

  // A disabled event may intentionally have no schedule. Any configured
  // schedule must be complete and have a strictly positive event window.
  if (
    (startsAtSeconds === null) !== (endsAtSeconds === null) ||
    (startsAtSeconds !== null &&
      endsAtSeconds !== null &&
      endsAtSeconds <= startsAtSeconds) ||
    (event.enabled && (startsAtSeconds === null || endsAtSeconds === null))
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
    startsAt: toIsoTimestamp(startsAtSeconds),
    endsAt: toIsoTimestamp(endsAtSeconds),
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
 * configuration safely disables the event. Unix seconds are converted to the
 * app's ISO timestamp representation only at this boundary.
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
