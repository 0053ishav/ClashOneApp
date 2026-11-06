import * as Sentry from "@sentry/react-native";
import { fetchManifest } from "@/services/cdnEntities";
import {
  fetchProgressionCategory,
} from "@/services/progression/progression";
import {
  loadProgressionGlobalManifestVersion,
  loadProgressionManifest,
  loadProgressionVersion,
  saveProgressionCategory,
  saveProgressionGlobalManifestVersion,
  saveProgressionManifest,
  saveProgressionVersion,
} from "@/storage/progressionStorage";
import { syncProgression } from "@/services/progression/syncProgression";

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));
jest.mock("@/services/cdnEntities", () => ({
  fetchManifest: jest.fn(),
}));
jest.mock("@/services/progression/progression", () => ({
  fetchProgressionCategory: jest.fn(),
}));
jest.mock("@/storage/progressionStorage", () => ({
  loadProgressionGlobalManifestVersion: jest.fn(),
  loadProgressionManifest: jest.fn(),
  loadProgressionVersion: jest.fn(),
  saveProgressionCategory: jest.fn(),
  saveProgressionGlobalManifestVersion: jest.fn(),
  saveProgressionManifest: jest.fn(),
  saveProgressionVersion: jest.fn(),
}));

const mockedFetchManifest = jest.mocked(fetchManifest);
const mockedFetchCategory = jest.mocked(fetchProgressionCategory);
const mockedLoadGlobalVersion = jest.mocked(loadProgressionGlobalManifestVersion);
const mockedLoadManifest = jest.mocked(loadProgressionManifest);
const mockedLoadCategoryVersion = jest.mocked(loadProgressionVersion);

describe("syncProgression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchManifest.mockResolvedValue({
      version: 2,
      metadataVersion: 1,
      progressionVersion: 2,
      eventsVersion: 1,
      metadata: {},
      progression: { troops: 8 },
      events: {},
    });
    mockedLoadGlobalVersion.mockReturnValue(2);
    mockedLoadManifest.mockReturnValue(null);
    mockedLoadCategoryVersion.mockReturnValue(7);
  });

  it("does not advance checkpoints after a category failure and retries on the next run", async () => {
    const networkError = new Error("progression request failed");
    mockedFetchCategory
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce([]);

    await syncProgression();

    expect(Sentry.captureException).toHaveBeenCalledWith(
      networkError,
      expect.objectContaining({
        tags: {
          sync_dataset: "progression",
          sync_category: "troops",
        },
      }),
    );
    expect(saveProgressionCategory).not.toHaveBeenCalled();
    expect(saveProgressionVersion).not.toHaveBeenCalled();
    expect(saveProgressionManifest).not.toHaveBeenCalled();
    expect(saveProgressionGlobalManifestVersion).not.toHaveBeenCalled();

    await syncProgression();

    expect(mockedFetchCategory).toHaveBeenCalledTimes(2);
    expect(saveProgressionCategory).toHaveBeenCalledWith("troops", []);
    expect(saveProgressionVersion).toHaveBeenCalledWith("troops", 8);
    expect(saveProgressionManifest).toHaveBeenCalledWith({
      version: 2,
      categories: { troops: 8 },
    });
    // The global version was already current; a redundant write is unnecessary.
    expect(saveProgressionGlobalManifestVersion).not.toHaveBeenCalled();
  });
});
