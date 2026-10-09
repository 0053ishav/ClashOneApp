import type { HammerJamManifest } from "@/engine/magicItems/hammerJam";
import { isHammerJamActive } from "@/engine/magicItems/hammerJam";
import { formatCountdown } from "@/utils/formatCountdown";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  manifest: HammerJamManifest;
};

export function HammerJamBanner({ manifest }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isHammerJamActive(manifest, now) || !manifest.endsAt) {
    return null;
  }

  const remainingMs = Math.max(Date.parse(manifest.endsAt) - now, 0);

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.iconContainer}>
        <Ionicons name="hammer" size={20} color="#451a03" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{manifest.title}</Text>
        <Text style={styles.subtitle}>
          {Math.round((1 - manifest.timeMultiplier) * 100)}% less upgrade time ·{" "}
          {Math.round((1 - manifest.costMultiplier) * 100)}% lower upgrade costs
        </Text>
        <Text style={styles.subtitle}>
          {Math.round((manifest.resourceMultiplier - 1) * 100)}% more resource production
        </Text>
        <Text style={styles.countdown}>
          Ends in {formatCountdown(remainingMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fbbf24",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: "#451a03",
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    color: "#78350f",
    fontSize: 11,
    fontWeight: "600",
  },
  countdown: {
    color: "#78350f",
    fontSize: 12,
    fontWeight: "700",
  },
});
