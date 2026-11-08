import { ENV } from "@/config/env";
import {
  fetchManifest,
  invalidateManifestCache,
} from "@/services/cdnEntities/manifest";
import type { Village } from "@/types/entity";
import {
  DEFAULT_HAMMER_JAM_MANIFEST,
  type HammerJamManifest,
  type HammerJamTarget,
} from "@/engine/magicItems/hammerJam";

const VALID_TARGETS = new Set<HammerJamTarget>([
  "building",
  "trap",
  "troop",
  "spell",
  "hero",
  "pet",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The event API sends Unix timestamps in seconds. Normalize them to ISO
 * strings at the network boundary so the domain model and event resolver use
 * one consistent timestamp representation. ISO strings remain accepted for
 * backward compatibility with older manifest payloads.
 */
function normalizeTimestamp(value: unknown): string | null | undefined {
  if (value === null) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;

    const milliseconds = value * 1000;
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }

  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  return undefined;
}

function isVillage(value: unknown): value is Village {
  return value === "home" || value === "builderBase" || value === "global";
}

function resolveExpectedEventVersion(
  manifest: Awaited<ReturnType<typeof fetchManifest>>,
): number | null {
  // Prefer the event-specific version when the global manifest publishes one.
  // Fall back to eventsVersion, the shared version field used by the other
  // versioned event manifests.
  const version = manifest.events?.hammerJam ?? manifest.eventsVersion;

  return Number.isInteger(version) && version > 0 ? version : null;
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
  const startsAt = normalizeTimestamp(event.startsAt);
  const endsAt = normalizeTimestamp(event.endsAt);

  if (
    typeof event.title !== "string" ||
    typeof event.enabled !== "boolean" ||
    startsAt === undefined ||
    endsAt === undefined ||
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
    startsAt,
    endsAt,
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
    let globalManifest = await fetchManifest();
    let expectedVersion = resolveExpectedEventVersion(globalManifest);

    if (expectedVersion === null) {
      console.warn(
        "[HammerJam] Global manifest has no valid events.hammerJam or eventsVersion",
      );
      return DEFAULT_HAMMER_JAM_MANIFEST;
    }

    let response = await fetch(`${ENV.BACKEND}/v2/events/hammer-jam`);

    if (!response.ok) {
      return DEFAULT_HAMMER_JAM_MANIFEST;
    }

    let payload: unknown = await response.json();

    // The global manifest is memory-cached for five minutes. If the event
    // endpoint has already advanced to a different version, refresh the global
    // manifest once before rejecting the event config as stale.
    if (
      isRecord(payload) &&
      typeof payload.version === "number" &&
      payload.version !== expectedVersion
    ) {
      invalidateManifestCache();
      globalManifest = await fetchManifest();
      expectedVersion = resolveExpectedEventVersion(globalManifest);

      if (expectedVersion === null) {
        console.warn(
          "[HammerJam] Refreshed global manifest has no valid event version",
        );
        return DEFAULT_HAMMER_JAM_MANIFEST;
      }

      response = await fetch(`${ENV.BACKEND}/v2/events/hammer-jam`);

      if (!response.ok) {
        return DEFAULT_HAMMER_JAM_MANIFEST;
      }

      payload = await response.json();
    }

    const manifest = parseHammerJamPayload(payload, expectedVersion);

    if (!manifest) {
      const payloadVersion =
        isRecord(payload) && typeof payload.version === "number"
          ? payload.version
          : "missing";
      console.warn(
        `[HammerJam] Rejected event manifest (expected version ${expectedVersion}, received ${payloadVersion})`,
      );
      return DEFAULT_HAMMER_JAM_MANIFEST;
    }

    return manifest;
  } catch (error) {
    console.warn("[HammerJam] Failed to fetch event manifest", error);
    return DEFAULT_HAMMER_JAM_MANIFEST;
  }
}
