import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;

const GOLD = "#fbbf24";
const MUTED = "#64748b";

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
                <Ionicons name={stat.icon} size={17} color={tint} />
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
    gap: 12,
    marginBottom: 20,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e2e8f0",
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  // flexGrow lets an odd last tile fill its row automatically
  statItem: {
    flexGrow: 1,
    flexBasis: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },

  statItemWide: {
    flexBasis: "100%",
  },

  statItemHighlight: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },

  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  textCol: {
    flex: 1,
    gap: 1,
  },

  value: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.4,
  },

  highlightValue: {
    color: GOLD,
  },

  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94a3b8",
  },
});
