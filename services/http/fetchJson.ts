/**
 * Shared GET/JSON boundary for CDN-backed game data.
 *
 * Concurrent callers for the same URL share one request. Rate-limited,
 * server-error, and network failures receive a bounded cooldown instead of
 * allowing every caller to immediately retry the same endpoint.
 */
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000;
const TRANSIENT_FAILURE_COOLDOWN_MS = 15_000;

type Cooldown = {
  retryAt: number;
  status: number | null;
};

export class HttpRequestError extends Error {
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    options: { status?: number | null; retryAfterMs?: number | null } = {},
  ) {
    super(message);
    this.name = "HttpRequestError";
    this.status = options.status ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

const inFlightRequests = new Map<string, Promise<unknown>>();
const cooldowns = new Map<string, Cooldown>();

function parseRetryAfterMs(value: string | null, now: number): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }

  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : null;
}

function setCooldown(url: string, status: number | null, delayMs: number): void {
  cooldowns.set(url, {
    retryAt: Date.now() + delayMs,
    status,
  });
}

export async function fetchJson<T>(url: string): Promise<T> {
  const now = Date.now();
  const cooldown = cooldowns.get(url);

  if (cooldown) {
    if (now < cooldown.retryAt) {
      const retryAfterMs = cooldown.retryAt - now;
      throw new HttpRequestError(
        `Request is cooling down; retry in ${Math.ceil(retryAfterMs / 1_000)}s`,
        { status: cooldown.status, retryAfterMs },
      );
    }

    cooldowns.delete(url);
  }

  const existingRequest = inFlightRequests.get(url);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = (async (): Promise<T> => {
    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      setCooldown(url, null, TRANSIENT_FAILURE_COOLDOWN_MS);
      throw new HttpRequestError(
        `Network request failed${error instanceof Error ? `: ${error.message}` : ""}`,
        { retryAfterMs: TRANSIENT_FAILURE_COOLDOWN_MS },
      );
    }

    if (!response.ok) {
      const status = response.status;
      const retryAfterMs =
        status === 429
          ? parseRetryAfterMs(response.headers.get("Retry-After"), Date.now())
            ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS
          : status >= 500
            ? TRANSIENT_FAILURE_COOLDOWN_MS
            : null;

      if (retryAfterMs !== null) {
        setCooldown(url, status, retryAfterMs);
      }

      throw new HttpRequestError(
        `HTTP request failed with status ${status}`,
        { status, retryAfterMs },
      );
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new HttpRequestError(
        `Response was not valid JSON${error instanceof Error ? `: ${error.message}` : ""}`,
        { status: response.status },
      );
    }
  })();

  inFlightRequests.set(url, request);

  try {
    return await request;
  } finally {
    if (inFlightRequests.get(url) === request) {
      inFlightRequests.delete(url);
    }
  }
}

/** Clear process-local request state for deterministic tests. */
export function __resetFetchJsonForTesting(): void {
  inFlightRequests.clear();
  cooldowns.clear();
}
