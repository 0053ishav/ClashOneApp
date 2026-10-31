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
const STARTS_AT_SECONDS = 1_793_491_200;
const ENDS_AT_SECONDS = 1_794_873_600;

const validPayload = {
  version: 2,
  hammerJam: {
    title: "Hammer Jam 2026",
    enabled: true,
    startsAt: STARTS_AT_SECONDS,
    endsAt: ENDS_AT_SECONDS,
    timeMultiplier: 0.5,
    costMultiplier: 0.5,
    resourceMultiplier: 2,
    appliesTo: ["building", "troop", "spell", "hero", "pet"],
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
      events: { hammerJam: 2 },
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  function mockPayload(payload: unknown): void {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
  }

  it("accepts v2 Unix epoch seconds and converts them once to ISO timestamps", async () => {
    mockPayload(validPayload);

    await expect(fetchHammerJamManifest()).resolves.toEqual({
      ...validPayload.hammerJam,
      startsAt: new Date(STARTS_AT_SECONDS * 1000).toISOString(),
      endsAt: new Date(ENDS_AT_SECONDS * 1000).toISOString(),
    });

    expect(mockedFetchManifest).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
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
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a payload version that differs from the global manifest version", async () => {
    mockPayload({ ...validPayload, version: 1 });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("rejects millisecond timestamps instead of interpreting them as seconds", async () => {
    mockPayload({
      ...validPayload,
      hammerJam: {
        ...validPayload.hammerJam,
        startsAt: STARTS_AT_SECONDS * 1000,
      },
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it.each([
    ["reversed event window", { startsAt: ENDS_AT_SECONDS, endsAt: STARTS_AT_SECONDS }],
    ["zero-length event window", { startsAt: STARTS_AT_SECONDS, endsAt: STARTS_AT_SECONDS }],
    ["incomplete event window", { startsAt: STARTS_AT_SECONDS, endsAt: null }],
  ])("rejects a %s", async (_label, timestamps) => {
    mockPayload({
      ...validPayload,
      hammerJam: { ...validPayload.hammerJam, ...timestamps },
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("allows a disabled event without a scheduled window", async () => {
    mockPayload({
      ...validPayload,
      hammerJam: {
        ...validPayload.hammerJam,
        enabled: false,
        startsAt: null,
        endsAt: null,
      },
    });

    await expect(fetchHammerJamManifest()).resolves.toMatchObject({
      enabled: false,
      startsAt: null,
      endsAt: null,
      resourceMultiplier: 2,
    });
  });

  it("rejects a enabled event without a schedule", async () => {
    mockPayload({
      ...validPayload,
      hammerJam: {
        ...validPayload.hammerJam,
        startsAt: null,
        endsAt: null,
      },
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("rejects unknown targets and villages instead of applying a partial configuration", async () => {
    mockPayload({
      ...validPayload,
      hammerJam: {
        ...validPayload.hammerJam,
        appliesTo: ["building", "future-category"],
      },
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );

    mockPayload({
      ...validPayload,
      hammerJam: {
        ...validPayload.hammerJam,
        villages: ["home", "future-village"],
      },
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("rejects missing required fields and invalid multipliers", async () => {
    const { title: _title, ...missingTitle } = validPayload.hammerJam;
    mockPayload({ ...validPayload, hammerJam: missingTitle });
    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );

    mockPayload({
      ...validPayload,
      hammerJam: { ...validPayload.hammerJam, resourceMultiplier: 0 },
    });
    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("returns the safe default when the response body is malformed JSON", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });

  it("returns the safe default when the event endpoint fails", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false });

    await expect(fetchHammerJamManifest()).resolves.toEqual(
      DEFAULT_HAMMER_JAM_MANIFEST,
    );
  });
});
