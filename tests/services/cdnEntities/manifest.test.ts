import { ENV } from "@/config/env";
import {
  fetchManifest,
  invalidateManifestCache,
  ManifestFetchError,
} from "@/services/cdnEntities/manifest";

jest.mock("@/config/env", () => ({
  ENV: { BACKEND: "https://clashwidget.online" },
}));

const manifest = {
  version: 2,
  metadataVersion: 1,
  progressionVersion: 1,
  eventsVersion: 1,
  metadata: {},
  progression: {},
  events: {},
};

function response(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? "Too Many Requests" : "Test",
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("fetchManifest", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    invalidateManifestCache();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("coalesces concurrent calls into one request", async () => {
    let resolveFetch!: (value: Response) => void;
    globalThis.fetch = jest.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })) as jest.Mock;

    const first = fetchManifest();
    const second = fetchManifest();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    resolveFetch(response(200, manifest));
    await expect(Promise.all([first, second])).resolves.toEqual([manifest, manifest]);
  });

  it("reuses a successful manifest during the cache TTL", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(response(200, manifest)) as jest.Mock;

    await fetchManifest();
    await fetchManifest();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not permanently cache a failed request", async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(response(503, {}))
      .mockResolvedValueOnce(response(200, manifest)) as jest.Mock;

    await expect(fetchManifest()).rejects.toMatchObject({ status: 503 });
    jest.advanceTimersByTime(15_001);
    await expect(fetchManifest()).resolves.toEqual(manifest);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("honors Retry-After and does not immediately repeat a 429 request", async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(response(429, {}, { "Retry-After": "10" }))
      .mockResolvedValueOnce(response(200, manifest)) as jest.Mock;

    await expect(fetchManifest()).rejects.toMatchObject({ status: 429, retryAfterMs: 10_000 });
    await expect(fetchManifest()).rejects.toMatchObject({ status: 429, retryAfterMs: 10_000 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10_001);
    await expect(fetchManifest()).resolves.toEqual(manifest);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("distinguishes network failure from an HTTP 429", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("offline")) as jest.Mock;

    await expect(fetchManifest()).rejects.toBeInstanceOf(ManifestFetchError);
    try {
      await fetchManifest();
    } catch (error) {
      expect(error).toMatchObject({ status: null });
    }
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(ENV.BACKEND).toBe("https://clashwidget.online");
  });
});
