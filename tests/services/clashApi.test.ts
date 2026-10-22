import * as Sentry from "@sentry/react-native";
import { fetchFullPlayer, fetchPlayerFromApi } from "@/services/clashApi";

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

const originalFetch = global.fetch;
const originalBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const originalAppSecret = process.env.EXPO_PUBLIC_APP_SECRET;
const originalAppKey = process.env.EXPO_PUBLIC_APP_KEY;

const validPlayer = {
  tag: "#ABC123",
  name: "Test Chief",
  expLevel: 220,
  townHallLevel: 16,
  trophies: 5200,
  bestTrophies: 5500,
  attackWins: 1000,
  defenseWins: 300,
  warStars: 250,
  donations: 900,
  donationsReceived: 400,
  troops: [
    { id: 1, name: "Barbarian", level: 11, maxLevel: 12, village: "home" },
  ],
};

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("player API runtime validation", () => {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    process.env.EXPO_PUBLIC_BACKEND_URL = "https://api.example.test";
    process.env.EXPO_PUBLIC_APP_SECRET = "public-client-key";
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalBackendUrl === undefined) {
      delete process.env.EXPO_PUBLIC_BACKEND_URL;
    } else {
      process.env.EXPO_PUBLIC_BACKEND_URL = originalBackendUrl;
    }
    if (originalAppSecret === undefined) {
      delete process.env.EXPO_PUBLIC_APP_SECRET;
    } else {
      process.env.EXPO_PUBLIC_APP_SECRET = originalAppSecret;
    }
    if (originalAppKey === undefined) {
      delete process.env.EXPO_PUBLIC_APP_KEY;
    } else {
      process.env.EXPO_PUBLIC_APP_KEY = originalAppKey;
    }
  });

  it("validates and returns a valid player payload", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { source: "cache", data: validPlayer }));

    await expect(fetchFullPlayer("#ABC123")).resolves.toEqual(validPlayer);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/player/%23ABC123",
      expect.objectContaining({
        headers: { "x-app-key": "public-client-key" },
      }),
    );
  });

  it("uses the same runtime validation for JSON import player lookups", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { data: validPlayer }));

    await expect(fetchPlayerFromApi("#ABC123")).resolves.toEqual(validPlayer);
  });

  it("rejects a successful response with a missing required field", async () => {
    const invalidPlayer = { ...validPlayer, townHallLevel: undefined };
    fetchMock.mockResolvedValueOnce(mockResponse(200, { data: invalidPlayer }));

    await expect(fetchFullPlayer("#ABC123")).rejects.toThrow("INVALID_API_RESPONSE");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "PLAYER_API_SCHEMA_VALIDATION_FAILED" }),
    );
  });

  it("rejects a response with no data envelope", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, validPlayer));

    await expect(fetchFullPlayer("#ABC123")).rejects.toThrow("INVALID_API_RESPONSE");
  });

  it("maps common HTTP errors to stable domain error codes", async () => {
    const cases: Array<[number, string]> = [
      [401, "UNAUTHORIZED"],
      [403, "UNAUTHORIZED"],
      [404, "PLAYER_NOT_FOUND"],
      [429, "RATE_LIMITED"],
      [504, "UPSTREAM_TIMEOUT"],
      [500, "API_FETCH_FAILED"],
    ];

    for (const [status, errorCode] of cases) {
      fetchMock.mockResolvedValueOnce(mockResponse(status, {}));
      await expect(fetchFullPlayer("#ABC123")).rejects.toThrow(errorCode);
    }
  });

  it("rejects malformed JSON without leaking response contents to telemetry", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError("unexpected token")),
    } as unknown as Response);

    await expect(fetchFullPlayer("#ABC123")).rejects.toThrow("INVALID_API_RESPONSE");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "PLAYER_API_INVALID_JSON" }),
    );
  });

  it("maps network failures to a stable API error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket failure"));

    await expect(fetchFullPlayer("#ABC123")).rejects.toThrow("API_FETCH_FAILED");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "PLAYER_API_NETWORK_ERROR" }),
    );
  });

  it("rejects empty player tags before making a request", async () => {
    await expect(fetchFullPlayer("  ")).rejects.toThrow("INVALID_TAG");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails clearly when the backend URL is not configured", async () => {
    delete process.env.EXPO_PUBLIC_BACKEND_URL;

    await expect(fetchFullPlayer("#ABC123")).rejects.toThrow("BACKEND_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
