import { DEFAULT_HAMMER_JAM_MANIFEST } from "@/engine/magicItems/hammerJam";
import { fetchHammerJamManifestResult } from "@/services/fetchHammerJamManifest";
import { useHammerJamStore } from "@/stores/hammerJamStore";

jest.mock("@/services/fetchHammerJamManifest", () => ({
  fetchHammerJamManifestResult: jest.fn(),
}));

const mockedFetchResult = jest.mocked(fetchHammerJamManifestResult);

describe("useHammerJamStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHammerJamStore.setState({
      manifest: DEFAULT_HAMMER_JAM_MANIFEST,
      availability: "loading",
    });
  });

  it("distinguishes confirmed disabled from unavailable configuration", async () => {
    mockedFetchResult.mockResolvedValueOnce({
      status: "disabled",
      manifest: { ...DEFAULT_HAMMER_JAM_MANIFEST, enabled: false },
    });

    await useHammerJamStore.getState().sync();
    expect(useHammerJamStore.getState().availability).toBe("disabled");

    mockedFetchResult.mockResolvedValueOnce({
      status: "unavailable",
      manifest: DEFAULT_HAMMER_JAM_MANIFEST,
    });

    await useHammerJamStore.getState().sync();
    expect(useHammerJamStore.getState().availability).toBe("unavailable");
  });

  it("fails closed while refreshing and after a fetch failure", async () => {
    mockedFetchResult.mockImplementationOnce(
      () => new Promise((resolve) => {
        expect(useHammerJamStore.getState().availability).toBe("loading");
        expect(useHammerJamStore.getState().manifest).toEqual(
          DEFAULT_HAMMER_JAM_MANIFEST,
        );
        resolve({
          status: "unavailable",
          manifest: DEFAULT_HAMMER_JAM_MANIFEST,
        });
      }),
    );

    await useHammerJamStore.getState().sync();

    expect(useHammerJamStore.getState().availability).toBe("unavailable");
    expect(useHammerJamStore.getState().manifest.enabled).toBe(false);
  });

  it("refreshes availability at the event start and end boundaries", async () => {
    const startsAt = "2026-11-01T00:00:00.000Z";
    const endsAt = "2026-11-02T00:00:00.000Z";
    useHammerJamStore.setState({
      availability: "disabled",
      manifest: {
        ...DEFAULT_HAMMER_JAM_MANIFEST,
        enabled: true,
        startsAt,
        endsAt,
      },
    });

    useHammerJamStore.getState().refreshAvailability(Date.parse(startsAt));
    expect(useHammerJamStore.getState().availability).toBe("active");

    useHammerJamStore.getState().refreshAvailability(Date.parse(endsAt));
    expect(useHammerJamStore.getState().availability).toBe("disabled");
  });
});
