import { StyleSheet, View } from "react-native";

export function LabSectionSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.title} />
      </View>

      <View style={styles.card}>
        {/* Lab icon */}
        <View style={styles.icon} />

        <View style={styles.content}>
          <View style={styles.name} />
          <View style={styles.level} />

          <View style={styles.bottomRow}>
            <View style={styles.timer} />
            <View style={styles.progress} />
          </View>
        </View>

        {/* Right-side status */}
        <View style={styles.status}>
          <View style={styles.statusLine} />
          <View style={styles.statusLineSmall} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  title: {
    width: 85,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#1e293b",
  },

  card: {
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: "#172033",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#1e293b",
  },

  content: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    width: "65%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1e293b",
  },

  level: {
    width: 70,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#1e293b",
    marginTop: 8,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    gap: 10,
  },

  timer: {
    width: 55,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#1e293b",
  },

  progress: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1e293b",
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
    backgroundColor: "#1e293b",
  },

  statusLineSmall: {
    width: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1e293b",
  },
});
