import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

export function PetSectionSkeleton() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.title} />
      </View>

      <View style={styles.card}>
        <View style={styles.icon} />

        <View style={styles.content}>
          <View style={styles.name} />
          <View style={styles.level} />

          <View style={styles.bottomRow}>
            <View style={styles.timer} />
            <View style={styles.progress} />
          </View>
        </View>

        <View style={styles.status}>
          <View style={styles.statusLine} />
          <View style={styles.statusSmall} />
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    marginTop: 18,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  title: {
    width: 70,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
  },

  card: {
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
  },

  content: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    width: "60%",
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
  },

  level: {
    width: 70,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.surfaceRaised,
    marginTop: 8,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 9,
  },

  timer: {
    width: 55,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.surfaceRaised,
  },

  progress: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
  },

  status: {
    alignItems: "flex-end",
    gap: 7,
    marginLeft: 8,
  },

  statusLine: {
    width: 42,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceRaised,
  },

  statusSmall: {
    width: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
  },
});
