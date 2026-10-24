import { Appearance } from "react-native";
import { storage } from "@/storage/mmkv";
import {
  getHomeColors,
  resolveColorScheme,
  type ColorScheme,
  type HomeColors,
} from "@/theme/home";

const COLOR_SCHEME_STORAGE_KEY = "appearance.colorScheme";

/** Resolve the persisted app theme for Android widget rendering. */
export function getWidgetColors(): HomeColors {
  const saved = storage.getString(COLOR_SCHEME_STORAGE_KEY);
  const preference: ColorScheme =
    saved === "light" || saved === "dark" || saved === "system"
      ? saved
      : "dark";
  const scheme = resolveColorScheme(preference, Appearance.getColorScheme());
  return getHomeColors(scheme);
}
