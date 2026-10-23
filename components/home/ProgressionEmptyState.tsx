import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
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
  accentColor = "#FBBF24",
}: ProgressionEmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}14` }]}>
        <Ionicons name={icon} size={23} color={accentColor} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#121A2B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222D44",
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
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
  },
});
