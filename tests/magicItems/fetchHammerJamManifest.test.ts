import { fetchManifest } from "@/services/cdnEntities/manifest";
import { ENV } from "@/config/env";
import { fetchHammerJamManifest } from "@/services/fetchHammerJamManifest";
import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";

jest.mock("@/services/cdnEntities/manifest", () => ({
  fetchManifest: jest.fn(),
}));

jest.mock("@/config/env", () => ({
  ENV: {
    BACKEND: "https://clashwidget.online",
  },
}));

const mockedFetchManifest = jest.mocked(fetchManifest);

const validPayload = {
  version: 1,
  hammerJam: {
    title: "Hammer Jam 2026",
    enabled: true,
    startsAt: "2026-11-01T00:00:00+05:30",
    endsAt: "2026-11-17T00:00:00+05:30",
    timeMultiplier: 0.5,
    costMultiplier: 0.5,
    resourceMultiplier: 2,
    appliesTo: ["building", "troop", "spell", "hero", "pet"],
    villages: ["home"],
  },
};

describe("fetchHammerJamManifest", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockedFetchManifest.mockResolvedValue({
      version: 6,
      metadataVersion: 6,
      progressionVersion: 6,
      eventsVersion: 2,
      metadata: {},
      progression: {},
      events: { hammerJam: 1 },
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("loads the event endpoint after reading the global manifest", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => validPayload,
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      validPayload.hammerJam,
    );

    expect(mockedFetchManifest).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `${ENV.BACKEND}/v2/events/hammer-jam`,
    );
  });

  it("returns the safe default when the global manifest has no Hammer Jam version", async () => {
    mockedFetchManifest.mockResolvedValueOnce({
      version: 6,
      metadataVersion: 6,
      progressionVersion: 6,
      eventsVersion: 2,
      metadata: {},
      progression: {},
      events: {},
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a configuration whose version differs from the global manifest", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...validPayload, version: 2 }),
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("rejects unknown targets instead of asserting an unsafe array type", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...validPayload,
        hammerJam: {
          ...validPayload.hammerJam,
          appliesTo: ["building", "future-category"],
        },
      }),
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("preserves the resource production multiplier from the server", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => validPayload,
    });

    const manifest = await fetchHammerJamManifest();

    expect(manifest.resourceMultiplier).toBe(2);
  });

  it("returns the safe default when the event endpoint fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });
});
