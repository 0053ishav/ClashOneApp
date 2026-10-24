import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { getHomeColors, resolveColorScheme } from "@/theme/home";
import { useThemeStore } from "@/stores/themeStore";

/** Subscribe to the selected scheme and return its semantic palette. */
export function useHomeColors() {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  return useMemo(() => getHomeColors(colorScheme), [colorScheme]);
}
