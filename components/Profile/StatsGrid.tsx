import { HOME_COLORS } from "@/theme/home";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;

export interface StatItem {
  icon: IconName;
  label: string;
  value?: string | number;
  /** Highlights the value using the shared gold accent. */
  highlight?: boolean;
  /** Icon and value tint for non-highlighted stats. */
  color?: string;
}

interface StatsGridProps {
  title?: string;
  stats: StatItem[];
}

/**
 * Shared horizontal profile-stat strip used by the profile screen and dropdown.
 * Each stat keeps its label above its value, matching the compact game-style layout.
 */
export default function StatsGrid({ title = "Stats", stats }: StatsGridProps) {
  const visible = stats.filter((stat) => stat.value !== undefined);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.row}>
        {visible.map((stat) => {
          const tint = stat.highlight ? HOME_COLORS.gold : (stat.color ?? HOME_COLORS.textMuted);

          return (
            <View key={stat.label} style={styles.statItem}>
              <View style={[styles.iconChip, { backgroundColor: tint + "20" }]}>
                <Ionicons name={stat.icon} size={11} color={tint} />
              </View>

              <Text style={styles.label} numberOfLines={1}>
                {stat.label}
              </Text>
              <Text
                style={[styles.value, stat.highlight && styles.highlightValue]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 14,
  },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  statItem: {
    width: "23.5%",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
  },

  iconChip: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  label: {
    width: "100%",
    fontSize: 9,
    fontWeight: "600",
    color: HOME_COLORS.textSecondary,
    textAlign: "center",
  },

  value: {
    maxWidth: "100%",
    fontSize: 13,
    fontWeight: "800",
    color: HOME_COLORS.textBright,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  highlightValue: {
    color: HOME_COLORS.gold,
  },
});
