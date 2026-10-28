import { ENV } from "@/config/env";
import type { Manifest } from "@/types/progression";

const MANIFEST_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const NETWORK_FAILURE_COOLDOWN_MS = 15 * 1000;

export class ManifestFetchError extends Error {
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(message: string, options: { status?: number; retryAfterMs?: number } = {}) {
    super(message);
    this.name = "ManifestFetchError";
    this.status = options.status ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

let cachedManifest: { value: Manifest; expiresAt: number } | null = null;
let inFlightRequest: Promise<Manifest> | null = null;
let retryNotBefore = 0;

function parseRetryAfter(value: string | null, now: number): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : null;
}

/**
 * Return a fresh manifest while coalescing concurrent callers.
 * The short memory cache prevents independent startup flows from re-fetching
 * the same version metadata. Call invalidateManifestCache after an explicit
 * data refresh when the caller needs a new server snapshot.
 */
export async function fetchManifest(): Promise<Manifest> {
  if (!ENV.BACKEND) {
    throw new Error("Backend URL is not configured");
  }

  const now = Date.now();
  if (cachedManifest && now < cachedManifest.expiresAt) {
    return cachedManifest.value;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  if (now < retryNotBefore) {
    const retryAfterMs = retryNotBefore - now;
    throw new ManifestFetchError(
      `Manifest request is cooling down; retry in ${Math.ceil(retryAfterMs / 1000)}s`,
      { status: 429, retryAfterMs },
    );
  }

  const request = (async (): Promise<Manifest> => {
    let response: Response;
    try {
      response = await fetch(`${ENV.BACKEND}/v2/manifest`);
    } catch (error) {
      retryNotBefore = Date.now() + NETWORK_FAILURE_COOLDOWN_MS;
      throw new ManifestFetchError(
        `Failed to fetch manifest: network error${error instanceof Error ? `: ${error.message}` : ""}`,
      );
    }

    if (!response.ok) {
      const nowAtFailure = Date.now();
      const retryAfterMs = response.status === 429
        ? parseRetryAfter(response.headers.get("Retry-After"), nowAtFailure)
          ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS
        : null;

      if (retryAfterMs !== null) {
        retryNotBefore = nowAtFailure + retryAfterMs;
      }

      throw new ManifestFetchError(
        `Failed to fetch manifest: HTTP ${response.status}`,
        { status: response.status, retryAfterMs },
      );
    }

    let manifest: Manifest;
    try {
      manifest = (await response.json()) as Manifest;
    } catch (error) {
      throw new ManifestFetchError(
        `Failed to parse manifest response${error instanceof Error ? `: ${error.message}` : ""}`,
      );
    }

    cachedManifest = {
      value: manifest,
      expiresAt: Date.now() + MANIFEST_CACHE_TTL_MS,
    };
    retryNotBefore = 0;
    return manifest;
  })();

  inFlightRequest = request;
  try {
    return await request;
  } finally {
    if (inFlightRequest === request) {
      inFlightRequest = null;
    }
  }
}

/** Explicitly discard the in-memory manifest and any retry cooldown. */
export function invalidateManifestCache(): void {
  cachedManifest = null;
  retryNotBefore = 0;
}
