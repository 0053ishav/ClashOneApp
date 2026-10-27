import { resolveResourceIcon } from "@/utils/icons/resolveResourceIcon";
import { ResourceType } from "@/types/resource";
import { useHomeColors } from "@/theme/useHomeColors";
import type { HomeColors } from "@/theme/home";
import { Image, StyleSheet, View } from "react-native";

export function getResourceColor(
  resource: ResourceType | undefined,
  colors: HomeColors,
): string {
  switch (resource) {
    case ResourceType.GOLD:
    case ResourceType.BUILDER_GOLD:
      return "#facc15";
    case ResourceType.ELIXIR:
      return "#d946ef";
    case ResourceType.DARK_ELIXIR:
      return "#a78bfa";
    case ResourceType.BUILDER_ELIXIR:
      return "#fb923c";
    case ResourceType.GEMS:
      return "#22d3ee";
    case ResourceType.SEASON_POINTS:
      return "#f59e0b";
    default:
      return colors.textSecondary;
  }
}

interface ResourceIconProps {
  resource: ResourceType;
  size?: number;
  background?: boolean;
}

export function ResourceIcon({ resource, size = 20, background = false }: ResourceIconProps) {
  const colors = useHomeColors();
  const uri = resolveResourceIcon(resource);
  const color = getResourceColor(resource, colors);

  if (!uri) return null;

  return (
    <View style={[
      styles.container,
      { width: size + (background ? 12 : 0), height: size + (background ? 12 : 0) },
      background && { backgroundColor: color + "20", borderRadius: 8 },
    ]}>
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
});
