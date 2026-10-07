import { ENV } from "@/config/env";
import {
  loadRemoteConfigFromStorage,
  resetGoblinBannerDismissal,
  saveRemoteConfigToStorage,
} from "@/storage/goblinStorage";

export type GoblinRemoteConfig = {
  goblinBuilderEnabled: boolean;
  goblinLabEnabled: boolean;

  workForHireEvents: {
    startsAt: number;
    endsAt: number;
  }[];
};

const DEFAULT_CONFIG: GoblinRemoteConfig = {
  goblinBuilderEnabled: false,
  goblinLabEnabled: false,
  workForHireEvents: [],
};

/**
 * Refresh policy
 *
 * The app does not need to fetch Goblin config constantly.
 *
 * 1. Refresh shortly before an event boundary.
 * 2. Otherwise refresh periodically as a safety check.
 * 3. If the server returns 429/error, keep the cached config.
 * 4. Retry later instead of hammering the server.
 */
const EVENT_REFRESH_BUFFER_MS =
  5 * 60 * 1000; // 5 minutes

const MAX_REFRESH_INTERVAL_MS =
  6 * 60 * 60 * 1000; // 6 hours

const RETRY_INTERVAL_MS =
  30 * 60 * 1000; // 30 minutes

const CONFIG_URL =
  `${ENV.BACKEND}/v2/events/goblin-config`;

let cachedConfig: GoblinRemoteConfig =
  DEFAULT_CONFIG;

let lastFetchTime = 0;

let nextRetryTime = 0;

let isInitialized = false;

let isFetching = false;

/**
 * Find the next meaningful event boundary.
 *
 * We refresh shortly before:
 *
 * - an upcoming event starts
 * - an active event ends
 *
 * Past boundaries are ignored.
 */
function getNextEventRefreshTime(
  now: number,
): number | null {
  const boundaries =
    cachedConfig.workForHireEvents
      .flatMap((event) => [
        event.startsAt -
          EVENT_REFRESH_BUFFER_MS,

        event.endsAt -
          EVENT_REFRESH_BUFFER_MS,
      ])
      .filter(
        (time) =>
          Number.isFinite(time) &&
          time > now,
      );

  if (boundaries.length === 0) {
    return null;
  }

  return Math.min(...boundaries);
}

/**
 * Determine when the next refresh should happen.
 */
function getNextRefreshTime(
  now: number,
): number {
  const safetyRefresh =
    lastFetchTime > 0
      ? lastFetchTime +
        MAX_REFRESH_INTERVAL_MS
      : now;

  const eventRefresh =
    getNextEventRefreshTime(now);

  if (eventRefresh == null) {
    return safetyRefresh;
  }

  return Math.min(
    safetyRefresh,
    eventRefresh,
  );
}

/**
 * Initialize remote config.
 *
 * Load cached config first so the app has
 * something usable even when the network fails.
 *
 * Then attempt a refresh.
 */
export async function initRemoteConfig(): Promise<void> {
  if (isInitialized) {
    return;
  }

  const cachedFromStorage =
    loadRemoteConfigFromStorage();

  if (cachedFromStorage) {
    cachedConfig =
      cachedFromStorage;
  }

  isInitialized = true;

  await refreshRemoteConfig();
}

/**
 * Fetch fresh config from the backend.
 */
async function fetchRemoteConfig(): Promise<void> {
  if (isFetching) {
    return;
  }

  isFetching = true;

  try {
    const response =
      await fetch(CONFIG_URL);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const parsed =
      await response.json();

    validateAndSetConfig(parsed);

    /**
     * Only replace local config after
     * the response has been validated.
     */
    saveRemoteConfigToStorage(
      cachedConfig,
    );

    lastFetchTime =
      Date.now();

    /**
     * Successful request clears
     * any previous retry delay.
     */
    nextRetryTime = 0;

    console.log(
      "✅ Goblin remote config refreshed",
    );
  } catch (error) {
    /**
     * IMPORTANT:
     *
     * Never replace cachedConfig with
     * DEFAULT_CONFIG here.
     *
     * A 429/network failure must not
     * invalidate a previously valid config.
     */
    console.warn(
      "⚠️ Remote config fetch failed, using cached config",
      {
        message:
          error instanceof Error
            ? error.message
            : String(error),

        url: CONFIG_URL,
      },
    );

    /**
     * Don't immediately hammer the
     * backend again.
     */
    nextRetryTime =
      Date.now() +
      RETRY_INTERVAL_MS;
  } finally {
    isFetching = false;
  }
}

/**
 * Validate and update the in-memory config.
 */
function validateAndSetConfig(
  parsed: unknown,
): void {
  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "Invalid config format.",
    );
  }

  const config =
    parsed as Record<
      string,
      unknown
    >;

  const goblinBuilderEnabled =
    typeof config.goblinBuilderEnabled ===
    "boolean"
      ? config.goblinBuilderEnabled
      : false;

  const goblinLabEnabled =
    typeof config.goblinLabEnabled ===
    "boolean"
      ? config.goblinLabEnabled
      : false;

  let workForHireEvents:
    GoblinRemoteConfig[
      "workForHireEvents"
    ] = [];

  if (
    Array.isArray(
      config.workForHireEvents,
    )
  ) {
    workForHireEvents =
      config.workForHireEvents.filter(
        (event) => {
          if (
            !event ||
            typeof event !== "object"
          ) {
            return false;
          }

          const item =
            event as Record<
              string,
              unknown
            >;

          return (
            typeof item.startsAt ===
              "number" &&
            Number.isFinite(
              item.startsAt,
            ) &&
            typeof item.endsAt ===
              "number" &&
            Number.isFinite(
              item.endsAt,
            ) &&
            item.endsAt >
              item.startsAt
          );
        },
      ) as GoblinRemoteConfig[
        "workForHireEvents"
      ];
  }

  cachedConfig = {
    goblinBuilderEnabled,
    goblinLabEnabled,
    workForHireEvents,
  };
}

export function getGoblinRemoteConfig():
  GoblinRemoteConfig {
  return cachedConfig;
}

/**
 * Refresh config if the service considers
 * a refresh necessary.
 *
 * The Provider can safely call this every
 * 10 minutes.
 *
 * The service decides whether an actual
 * network request is necessary.
 */
export async function refreshRemoteConfig():
  Promise<void> {
  const now = Date.now();

  /**
   * If we're waiting for a retry after
   * a failed request, don't request again.
   */
  if (
    nextRetryTime > now
  ) {
    return;
  }

  const nextRefreshTime =
    getNextRefreshTime(now);

  if (
    now < nextRefreshTime
  ) {
    return;
  }

  await fetchRemoteConfig();
}

export function resetRemoteConfig():
  void {
  cachedConfig =
    DEFAULT_CONFIG;

  lastFetchTime = 0;

  nextRetryTime = 0;

  isInitialized = false;

  isFetching = false;
}

/**
 * ==============================
 * DEV / TEST UTILITIES
 * ==============================
 */

export function __setRemoteConfigForTesting(
  config: GoblinRemoteConfig,
): void {
  cachedConfig = config;

  isInitialized = true;

  lastFetchTime =
    Date.now();

  nextRetryTime = 0;

  console.log(
    "🧪 Remote config manually injected:",
    cachedConfig,
  );
}

export function __enableGoblinForTesting():
  void {
  cachedConfig = {
    goblinBuilderEnabled: true,

    goblinLabEnabled: true,

    workForHireEvents: [
      {
        startsAt:
          Date.now() - 1000,

        endsAt:
          Date.now() +
          1000 *
            60 *
            60 *
            24,
      },
    ],
  };

  resetGoblinBannerDismissal();

  isInitialized = true;

  lastFetchTime =
    Date.now();

  nextRetryTime = 0;

  console.log(
    "🧪 Goblin test event enabled",
  );
}

export function __disableGoblinForTesting():
  void {
  cachedConfig =
    DEFAULT_CONFIG;

  isInitialized = true;

  lastFetchTime =
    Date.now();

  nextRetryTime = 0;

  console.log(
    "🧪 Goblin disabled (test)",
  );
}