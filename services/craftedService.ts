import { ENV } from "@/config/env";
import { useCraftedStore } from "@/stores/crafted";

const CRAFTED_URL = `${ENV.BACKEND}/v2/events/crafted-defenses-event`;
const CACHE_TIME = 5 * 60 * 1000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const NETWORK_FAILURE_COOLDOWN_MS = 15 * 1000;

let isLoaded = false;
let lastFetch = 0;
let inFlightRequest: Promise<void> | null = null;
let retryNotBefore = 0;

function parseRetryAfterMs(value: string | null, now: number): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : null;
}

/**
 * Loads crafted-event data once per cache window. Concurrent callers share
 * one request; failures leave the last store value intact and apply a cooldown.
 */
export async function ensureCraftedLoaded(): Promise<void> {
  const now = Date.now();

  if (isLoaded && now - lastFetch < CACHE_TIME) return;
  if (inFlightRequest) return inFlightRequest;
  if (now < retryNotBefore) return;

  const request = (async (): Promise<void> => {
    let receivedResponse = false;

    try {
      const res = await fetch(CRAFTED_URL);
      receivedResponse = true;

      if (!res.ok) {
        if (res.status === 429) {
          retryNotBefore = Date.now() + (
            parseRetryAfterMs(res.headers.get("Retry-After"), Date.now())
            ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS
          );
        } else if (res.status >= 500) {
          retryNotBefore = Date.now() + NETWORK_FAILURE_COOLDOWN_MS;
        }

        throw new Error(`Failed crafted fetch: HTTP ${res.status}`);
      }

      const data: unknown = await res.json();
      useCraftedStore.getState().setCraftedData(data);
      isLoaded = true;
      lastFetch = Date.now();
      retryNotBefore = 0;
      console.log("✅ Crafted loaded");
    } catch (error) {
      if (!receivedResponse && retryNotBefore <= Date.now()) {
        // Network failures get a short cooldown; HTTP status handling above
        // owns the cooldown policy for responses from the backend.
        retryNotBefore = Date.now() + NETWORK_FAILURE_COOLDOWN_MS;
      }

      console.warn("❌ Crafted load failed", error);
      // Do not clear the store: previously loaded crafted data remains usable.
    }
  })();

  inFlightRequest = request;
  try {
    await request;
  } finally {
    if (inFlightRequest === request) {
      inFlightRequest = null;
    }
  }
}
