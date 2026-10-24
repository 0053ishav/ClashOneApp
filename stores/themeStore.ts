import { create } from "zustand";
import { storage } from "@/storage/mmkv";
import type { ColorScheme } from "@/theme/home";

const COLOR_SCHEME_STORAGE_KEY = "appearance.colorScheme";

interface ThemeState {
  colorScheme: ColorScheme;
  setColorScheme: (colorScheme: ColorScheme) => void;
  hydrateColorScheme: () => void;
}

function readColorScheme(): ColorScheme {
  const saved = storage.getString(COLOR_SCHEME_STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system"
    ? saved
    : "dark";
}

/**
 * App-wide appearance preference. Dark mode remains the default for existing
 * installs; the choice is stored independently of account/game data.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  colorScheme: readColorScheme(),
  setColorScheme: (colorScheme) => {
    storage.set(COLOR_SCHEME_STORAGE_KEY, colorScheme);
    set({ colorScheme });
  },
  hydrateColorScheme: () => set({ colorScheme: readColorScheme() }),
}));
