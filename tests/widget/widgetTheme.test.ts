import { storage } from "@/storage/mmkv";
import { getHomeColors } from "@/theme/home";
import { getWidgetColors } from "@/utils/widget/widgetTheme";

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

describe("widget theme resolver", () => {
  beforeEach(() => {
    mockStorage.__values.clear();
    jest.clearAllMocks();
  });

  it("uses dark mode when no preference has been persisted", () => {
    expect(getWidgetColors()).toEqual(getHomeColors("dark"));
    expect(storage.getString).toHaveBeenCalledWith("appearance.colorScheme");
  });

  it("uses the persisted light palette for Android widget rendering", () => {
    mockStorage.__values.set("appearance.colorScheme", "light");

    expect(getWidgetColors()).toEqual(getHomeColors("light"));
  });

  it("uses the persisted dark palette after switching back from light mode", () => {
    mockStorage.__values.set("appearance.colorScheme", "light");
    expect(getWidgetColors()).toEqual(getHomeColors("light"));

    mockStorage.__values.set("appearance.colorScheme", "dark");
    expect(getWidgetColors()).toEqual(getHomeColors("dark"));
  });

  it("falls back to dark mode for invalid persisted values", () => {
    mockStorage.__values.set("appearance.colorScheme", "system");

    expect(getWidgetColors()).toEqual(getHomeColors("dark"));
  });
});
