import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";

type IconName = keyof typeof Ionicons.glyphMap;

interface EntitySectionProps {
  title: string;
  icon?: IconName;
  count: number;
  children: React.ReactNode;
  onViewAll?: () => void;
  onPressHeader?: () => void;
  accent?: string;
}

export default function EntitySection({
  title,
  icon,
  count,
  children,
  onViewAll,
  onPressHeader,
  accent,
}: EntitySectionProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedAccent = accent ?? colors.gold;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole={onPressHeader ? "button" : undefined}
          accessibilityLabel={onPressHeader ? "View " + title + " progression details" : undefined}
          onPress={onPressHeader}
          disabled={!onPressHeader}
          style={styles.headerLeft}
        >
          {icon && (
            <View style={[styles.iconChip, { backgroundColor: resolvedAccent + "1f" }]}>
              <Ionicons name={icon} size={14} color={resolvedAccent} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
          </View>
          {onPressHeader && <Ionicons name="chevron-down" size={14} color={resolvedAccent} />}
        </Pressable>

        {onViewAll && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View all ${title}`}
            onPress={onViewAll}
            hitSlop={8}
            style={({ pressed }) => [
              styles.viewAll,
              { backgroundColor: resolvedAccent + "14" },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.viewAllText, { color: resolvedAccent }]}>
              View all
            </Text>
            <Ionicons name="chevron-forward" size={12} color={resolvedAccent} />
          </Pressable>
        )}
      </View>

      {children}
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    gap: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },

  iconChip: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
    flexShrink: 1,
  },

  countBadge: {
    minWidth: 22,
    alignItems: "center",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },

  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },

  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: 999,
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.6,
  },
});
