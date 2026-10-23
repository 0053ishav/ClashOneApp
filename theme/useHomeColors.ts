import { useMemo } from "react";
import { getHomeColors } from "@/theme/home";
import { useThemeStore } from "@/stores/themeStore";

/** Subscribe to the selected scheme and return its semantic palette. */
export function useHomeColors() {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  return useMemo(() => getHomeColors(colorScheme), [colorScheme]);
}
