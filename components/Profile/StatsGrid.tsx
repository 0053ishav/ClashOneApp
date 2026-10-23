import { HOME_COLORS } from "@/theme/home";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;

const GOLD = HOME_COLORS.gold;
const MUTED = HOME_COLORS.textMuted;

export interface StatItem {
  icon: IconName;
  label: string;
  value?: string | number;
  /** Gold tile. Overrides `color`. */
  highlight?: boolean;
  /** Icon tint for non-highlighted tiles. */
  color?: string;
  /** Span the full row. */
  wide?: boolean;
}

interface StatsGridProps {
  title?: string;
  stats: StatItem[];
}

export default function StatsGrid({ title = "Stats", stats }: StatsGridProps) {
  const visible = stats.filter((s) => s.value !== undefined);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.grid}>
        {visible.map((stat) => {
          const tint = stat.highlight ? GOLD : (stat.color ?? MUTED);

          return (
            <View
              key={stat.label}
              style={[
                styles.statItem,
                stat.wide && styles.statItemWide,
                stat.highlight && styles.statItemHighlight,
              ]}
            >
              <View style={[styles.iconChip, { backgroundColor: tint + "26" }]}>
                <Ionicons name={stat.icon} size={14} color={tint} />
              </View>

              <View style={styles.textCol}>
                <Text
                  style={[
                    styles.value,
                    stat.highlight && styles.highlightValue,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </Text>
                <Text style={styles.label} numberOfLines={1}>
                  {stat.label}
                </Text>
              </View>
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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  // flexGrow lets an odd last tile fill its row automatically
  statItem: {
    flexGrow: 1,
    flexBasis: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: HOME_COLORS.surface,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
  },

  statItemWide: {
    flexBasis: "100%",
  },

  statItemHighlight: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },

  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  textCol: {
    flex: 1,
    gap: 1,
  },

  value: {
    fontSize: 16,
    fontWeight: "800",
    color: HOME_COLORS.textBright,
    letterSpacing: -0.4,
  },

  highlightValue: {
    color: GOLD,
  },

  label: {
    fontSize: 11,
    fontWeight: "500",
    color: HOME_COLORS.textSecondary,
  },
});
