import { storage } from "@/storage/mmkv";
import { getHomeColors, type ColorScheme, type HomeColors } from "@/theme/home";

const COLOR_SCHEME_STORAGE_KEY = "appearance.colorScheme";

/** Resolve the persisted app theme for Android widget rendering. */
export function getWidgetColors(): HomeColors {
  const saved = storage.getString(COLOR_SCHEME_STORAGE_KEY);
  const scheme: ColorScheme = saved === "light" ? "light" : "dark";
  return getHomeColors(scheme);
}
