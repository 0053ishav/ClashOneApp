import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

export function ActiveUpgradesSkeleton() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitle} />
        <View style={styles.countBadge} />
      </View>

      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.card}>
          {/* Builder badge */}
          <View style={styles.builderBadge} />

          <View style={styles.content}>
            <View style={styles.mainRow}>
              {/* Entity icon */}
              <View style={styles.icon} />

              {/* Name + level */}
              <View style={styles.info}>
                <View style={styles.name} />
                <View style={styles.level} />
              </View>

              {/* Timer */}
              <View style={styles.timer}>
                <View style={styles.timerValue} />
                <View style={styles.timerTotal} />
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    marginTop: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    width: 105,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
  },

  countBadge: {
    width: 24,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
  },

  card: {
    minHeight: 88,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: "hidden",
    flexDirection: "row",
  },

  builderBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    marginLeft: 10,
    marginTop: 14,
  },

  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },

  info: {
    flex: 1,
    marginLeft: 10,
    gap: 8,
  },

  name: {
    width: "65%",
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
  },

  level: {
    width: 72,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceRaised,
  },

  timer: {
    alignItems: "flex-end",
    gap: 7,
    marginLeft: 8,
  },

  timerValue: {
    width: 55,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
  },

  timerTotal: {
    width: 42,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.surfaceRaised,
  },

  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
    marginTop: 10,
    overflow: "hidden",
  },

  progressFill: {
    width: "45%",
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
});
