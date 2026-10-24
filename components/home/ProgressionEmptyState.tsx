import { Ionicons } from "@expo/vector-icons";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { useMemo, type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

type EmptyStateIcon = ComponentProps<typeof Ionicons>["name"];

interface ProgressionEmptyStateProps {
  icon: EmptyStateIcon;
  title: string;
  description: string;
  accentColor?: string;
}

/**
 * Shared empty state for progression sections on Home.
 * Keep the same hierarchy and spacing across builders, research, and pets.
 */
export function ProgressionEmptyState({
  icon,
  title,
  description,
  accentColor,
}: ProgressionEmptyStateProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedAccentColor = accentColor ?? colors.gold;
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${resolvedAccentColor}14` }]}>
        <Ionicons name={icon} size={23} color={resolvedAccentColor} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  card: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
