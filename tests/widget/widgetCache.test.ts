import { STORAGE_KEYS } from "@/storage/keys";
import { storage } from "@/storage/mmkv";
import type { WidgetCacheData } from "@/types/widgetTypes";
import {
  deleteWidgetCaches,
  getUpcomingWidgetCache,
  getWidgetCache,
  setUpcomingWidgetCache,
  setWidgetCache,
} from "@/utils/widget/widgetCache";

jest.mock("@/storage/mmkv", () => {
  const values = new Map<string, string>();
  return {
    storage: {
      getString: jest.fn((key: string) => values.get(key)),
      set: jest.fn((key: string, value: string) => values.set(key, value)),
      remove: jest.fn((key: string) => values.delete(key)),
      __values: values,
    },
  };
});

const mockStorage = storage as typeof storage & {
  __values: Map<string, string>;
};

describe("widget cache lifecycle", () => {
  beforeEach(() => {
    mockStorage.__values.clear();
    jest.clearAllMocks();
  });

  it("round-trips cached builder data through persistent storage serialization", () => {
    const data = {
      cachedAt: 1_800_000_000_000,
      title: "Archer Tower",
      subtitle: "Builder upgrade",
      progress: 0,
      showProgress: true,
      upgradeKind: "SUPERCHARGE",
      currentSuperchargeLevel: 1,
      nextSuperchargeLevel: 2,
    } satisfies WidgetCacheData;

    setWidgetCache("#PLAYER", "builder", data);

    expect(getWidgetCache("#PLAYER", "builder")).toEqual(data);
    expect(mockStorage.set).toHaveBeenCalledWith(
      `${STORAGE_KEYS.WIDGET_CACHE}_#PLAYER_builder`,
      JSON.stringify(data),
    );
  });

  it("invalidates the target account's widget caches and the shared upcoming cache", () => {
    const data = { cachedAt: 1, title: "Old upgrade", subtitle: "Builder upgrade", progress: 0, showProgress: true };

    setWidgetCache("#PLAYER", "builder", data);
    setWidgetCache("#PLAYER", "lab", data);
    setWidgetCache("#PLAYER", "pet", data);
    setWidgetCache("#OTHER", "builder", data);
    setUpcomingWidgetCache({ rows: [{ title: "Old upgrade" }] });

    deleteWidgetCaches("#PLAYER");

    expect(getWidgetCache("#PLAYER", "builder")).toBeNull();
    expect(getWidgetCache("#PLAYER", "lab")).toBeNull();
    expect(getWidgetCache("#PLAYER", "pet")).toBeNull();
    expect(getWidgetCache("#OTHER", "builder")).toEqual(data);
    expect(getUpcomingWidgetCache()).toBeNull();
  });

  it("does not remove caches for an empty tag", () => {
    const data = { cachedAt: 1, title: "Keep me", subtitle: "Builder upgrade", progress: 0, showProgress: true };
    setWidgetCache("#PLAYER", "builder", data);

    deleteWidgetCaches("");

    expect(getWidgetCache("#PLAYER", "builder")).toEqual(data);
    expect(mockStorage.remove).not.toHaveBeenCalled();
  });
});
