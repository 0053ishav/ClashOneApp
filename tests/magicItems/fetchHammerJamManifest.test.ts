import {
  fetchManifest,
  invalidateManifestCache,
} from "@/services/cdnEntities/manifest";
import { ENV } from "@/config/env";
import { fetchHammerJamManifest } from "@/services/fetchHammerJamManifest";
import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";

jest.mock("@/services/cdnEntities/manifest", () => ({
  fetchManifest: jest.fn(),
  invalidateManifestCache: jest.fn(),
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
    appliesTo: ["building", "trap", "troop", "spell", "hero", "pet"],
    villages: ["home"],
  },
};

describe("fetchHammerJamManifest", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
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
    globalThis.fetch = originalFetch;
  });

  it("loads the event endpoint after reading the global manifest", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => validPayload,
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual({
      ...validPayload.hammerJam,
      startsAt: "2026-10-31T18:30:00.000Z",
      endsAt: "2026-11-16T18:30:00.000Z",
    });

    expect(mockedFetchManifest).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${ENV.BACKEND}/v2/events/hammer-jam`,
    );
  });

  it("accepts the server's version 3 payload with Unix timestamps in seconds", async () => {
    mockedFetchManifest.mockResolvedValueOnce({
      version: 6,
      metadataVersion: 6,
      progressionVersion: 6,
      eventsVersion: 3,
      metadata: {},
      progression: {},
      events: { hammerJam: 3 },
    });

    const serverPayload = {
      version: 3,
      hammerJam: {
        title: "Hammer Jam 2026",
        enabled: true,
        startsAt: 1793520000,
        endsAt: 1794816000,
        timeMultiplier: 0.5,
        costMultiplier: 0.5,
        resourceMultiplier: 2,
        appliesTo: ["building", "trap", "troop", "spell", "hero", "pet"],
        villages: ["home"],
      },
    };

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => serverPayload,
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual({
      ...serverPayload.hammerJam,
      startsAt: "2026-11-01T08:00:00.000Z",
      endsAt: "2026-11-16T08:00:00.000Z",
    });
  });


  it("refreshes the cached global manifest when the event payload has advanced", async () => {
    mockedFetchManifest
      .mockResolvedValueOnce({
        version: 6,
        metadataVersion: 6,
        progressionVersion: 6,
        eventsVersion: 2,
        metadata: {},
        progression: {},
        events: { hammerJam: 2 },
      })
      .mockResolvedValueOnce({
        version: 7,
        metadataVersion: 6,
        progressionVersion: 6,
        eventsVersion: 3,
        metadata: {},
        progression: {},
        events: { hammerJam: 3 },
      });

    const advancedPayload = {
      version: 3,
      hammerJam: {
        ...validPayload.hammerJam,
        startsAt: 1793520000,
        endsAt: 1794816000,
      },
    };

    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => advancedPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => advancedPayload,
      });

    await expect(fetchHammerJamManifest()).resolves.toEqual({
      ...advancedPayload.hammerJam,
      startsAt: "2026-11-01T08:00:00.000Z",
      endsAt: "2026-11-16T08:00:00.000Z",
    });

    expect(invalidateManifestCache).toHaveBeenCalledTimes(1);
    expect(mockedFetchManifest).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("uses the shared eventsVersion when no event-specific version is published", async () => {
    mockedFetchManifest.mockResolvedValueOnce({
      version: 6,
      metadataVersion: 6,
      progressionVersion: 6,
      eventsVersion: 3,
      metadata: {},
      progression: {},
      events: {},
    });

    const serverPayload = {
      version: 3,
      hammerJam: {
        ...validPayload.hammerJam,
        startsAt: 1793520000,
        endsAt: 1794816000,
      },
    };

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => serverPayload,
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual({
      ...serverPayload.hammerJam,
      startsAt: "2026-11-01T08:00:00.000Z",
      endsAt: "2026-11-16T08:00:00.000Z",
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${ENV.BACKEND}/v2/events/hammer-jam`,
    );
  });

  it("returns the safe default when the global manifest has no valid event version", async () => {
    mockedFetchManifest.mockResolvedValueOnce({
      version: 6,
      metadataVersion: 6,
      progressionVersion: 6,
      eventsVersion: 0,
      metadata: {},
      progression: {},
      events: {},
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a configuration whose version differs from the global manifest", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...validPayload, version: 2 }),
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("rejects unknown targets instead of asserting an unsafe array type", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
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

  it("accepts traps as a Hammer Jam target from the server manifest", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => validPayload,
    });

    const manifest = await fetchHammerJamManifest();

    expect(manifest.appliesTo).toContain("trap");
  });

  it("preserves the resource production multiplier from the server", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => validPayload,
    });

    const manifest = await fetchHammerJamManifest();

    expect(manifest.resourceMultiplier).toBe(2);
  });

  it("returns the safe default when the event endpoint fails", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });
});
