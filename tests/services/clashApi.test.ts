import * as Sentry from "@sentry/react-native";
import { fetchFullPlayer, fetchPlayerFromApi } from "@/services/clashApi";

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

const originalFetch = globalThis.fetch;
const originalBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const originalAppSecret = process.env.EXPO_PUBLIC_APP_SECRET;

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

describe("Clash API player fetch functions", () => {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    process.env.EXPO_PUBLIC_BACKEND_URL = "https://api.example.test";
    process.env.EXPO_PUBLIC_APP_SECRET = "public-client-key";
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

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
  });

  describe("fetchFullPlayer", () => {
    it("returns the data envelope and sends the configured app key", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(200, { source: "cache", data: validPlayer }),
      );

      await expect(fetchFullPlayer("#ABC123")).resolves.toEqual(validPlayer);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.test/player/%23ABC123",
        expect.objectContaining({
          headers: { "x-app-key": "public-client-key" },
        }),
      );
    });

    it("maps non-success HTTP responses to API_FETCH_FAILED and reports the response", async () => {
      const response = mockResponse(401, { message: "unauthorized" });
      fetchMock.mockResolvedValueOnce(response);

      await expect(fetchFullPlayer("#ABC123")).rejects.toThrow(
        "API_FETCH_FAILED",
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(response);
    });

    it("propagates JSON parsing errors from the response", async () => {
      const parseError = new SyntaxError("unexpected token");
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(parseError),
      } as unknown as Response);

      await expect(fetchFullPlayer("#ABC123")).rejects.toBe(parseError);
    });

    it("propagates network errors", async () => {
      const networkError = new Error("socket failure");
      fetchMock.mockRejectedValueOnce(networkError);

      await expect(fetchFullPlayer("#ABC123")).rejects.toBe(networkError);
    });
  });

  describe("fetchPlayerFromApi", () => {
    it("rejects an empty tag before making a request", async () => {
      await expect(fetchPlayerFromApi("")).rejects.toThrow("INVALID_TAG");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns the data envelope for a successful response", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse(200, { source: "cache", data: validPlayer }),
      );

      await expect(fetchPlayerFromApi("#ABC123")).resolves.toEqual(validPlayer);
    });

    it.each<[number, string]>([
      [401, "UNAUTHORIZED"],
      [404, "PLAYER_NOT_FOUND"],
      [429, "RATE_LIMITED"],
      [504, "UPSTREAM_TIMEOUT"],
      [500, "API_FETCH_FAILED"],
    ])("maps HTTP %i to %s", async (status, errorCode) => {
      fetchMock.mockResolvedValueOnce(mockResponse(status, {}));

      await expect(fetchPlayerFromApi("#ABC123")).rejects.toThrow(errorCode);
    });
  });
});
