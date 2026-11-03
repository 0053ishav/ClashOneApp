import * as Sentry from "@sentry/react-native";
import { fetchCategory, fetchManifest } from "@/services/cdnEntities";
import {
  loadEntityGlobalManifestVersion,
  loadEntityVersion,
  saveEntityCategory,
  saveEntityGlobalManifestVersion,
  saveEntityManifest,
  saveEntityVersion,
} from "@/storage/entityStorage";
import { syncEntities } from "@/storage/syncEntities";

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));
jest.mock("@/services/cdnEntities", () => ({
  fetchCategory: jest.fn(),
  fetchManifest: jest.fn(),
}));
jest.mock("@/storage/entityStorage", () => ({
  loadEntityGlobalManifestVersion: jest.fn(),
  loadEntityVersion: jest.fn(),
  saveEntityCategory: jest.fn(),
  saveEntityGlobalManifestVersion: jest.fn(),
  saveEntityManifest: jest.fn(),
  saveEntityVersion: jest.fn(),
}));

const mockedFetchManifest = jest.mocked(fetchManifest);
const mockedFetchCategory = jest.mocked(fetchCategory);
const mockedLoadGlobalVersion = jest.mocked(loadEntityGlobalManifestVersion);
const mockedLoadCategoryVersion = jest.mocked(loadEntityVersion);

describe("syncEntities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchManifest.mockResolvedValue({
      version: 2,
      metadataVersion: 2,
      progressionVersion: 1,
      eventsVersion: 1,
      metadata: { troops: 5 },
      progression: {},
      events: {},
    });
    mockedLoadGlobalVersion.mockReturnValue(1);
    mockedLoadCategoryVersion.mockReturnValue(4);
  });

  it("does not advance checkpoints after a category failure and retries on the next run", async () => {
    const networkError = new Error("metadata request failed");
    mockedFetchCategory
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce([]);

    await syncEntities();

    expect(Sentry.captureException).toHaveBeenCalledWith(
      networkError,
      expect.objectContaining({
        tags: {
          sync_dataset: "entity_metadata",
          sync_category: "troops",
        },
      }),
    );
    expect(saveEntityCategory).not.toHaveBeenCalled();
    expect(saveEntityVersion).not.toHaveBeenCalled();
    expect(saveEntityManifest).not.toHaveBeenCalled();
    expect(saveEntityGlobalManifestVersion).not.toHaveBeenCalled();

    await syncEntities();

    expect(mockedFetchCategory).toHaveBeenCalledTimes(2);
    expect(saveEntityCategory).toHaveBeenCalledWith("troops", []);
    expect(saveEntityVersion).toHaveBeenCalledWith("troops", 5);
    expect(saveEntityManifest).toHaveBeenCalledWith({
      version: 2,
      categories: { troops: 5 },
    });
    expect(saveEntityGlobalManifestVersion).toHaveBeenCalledWith(2);
  });
});
