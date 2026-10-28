import {
  __resetFetchJsonForTesting,
  fetchJson,
  HttpRequestError,
} from "@/services/http/fetchJson";

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("fetchJson", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    __resetFetchJsonForTesting();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("coalesces concurrent requests to the same URL", async () => {
    let resolveFetch!: (value: Response) => void;
    const mockFetch = jest.fn(
      () => new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    globalThis.fetch = mockFetch as typeof fetch;

    const first = fetchJson<{ value: number }>("https://example.test/data");
    const second = fetchJson<{ value: number }>("https://example.test/data");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    resolveFetch(response(200, { value: 1 }));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { value: 1 },
      { value: 1 },
    ]);
  });

  it("honors Retry-After and suppresses requests during a 429 cooldown", async () => {
    jest.useFakeTimers();
    const mockFetch = jest.fn()
      .mockResolvedValueOnce(response(429, {}, { "Retry-After": "10" }))
      .mockResolvedValueOnce(response(200, { value: 2 }));
    globalThis.fetch = mockFetch as typeof fetch;

    await expect(fetchJson("https://example.test/limited"))
      .rejects.toMatchObject({ status: 429, retryAfterMs: 10_000 });

    await expect(fetchJson("https://example.test/limited"))
      .rejects.toMatchObject({ status: 429, retryAfterMs: 10_000 });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10_001);
    await expect(fetchJson("https://example.test/limited"))
      .resolves.toEqual({ value: 2 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("applies a short cooldown after network failures", async () => {
    jest.useFakeTimers();
    const mockFetch = jest.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response(200, { value: 3 }));
    globalThis.fetch = mockFetch as typeof fetch;

    await expect(fetchJson("https://example.test/offline"))
      .rejects.toBeInstanceOf(HttpRequestError);
    await expect(fetchJson("https://example.test/offline"))
      .rejects.toMatchObject({ status: null });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(15_001);
    await expect(fetchJson("https://example.test/offline"))
      .resolves.toEqual({ value: 3 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("preserves HTTP status for non-retryable client errors", async () => {
    const mockFetch = jest.fn().mockResolvedValue(response(404, {}));
    globalThis.fetch = mockFetch as typeof fetch;

    await expect(fetchJson("https://example.test/missing"))
      .rejects.toMatchObject({ status: 404, retryAfterMs: null });
    await expect(fetchJson("https://example.test/missing"))
      .rejects.toMatchObject({ status: 404 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
