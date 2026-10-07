import { getUpgradeStatus } from "@/engine/progression/selectors/getUpgradeStatus";
import { getProgressColor } from "@/utils/getProgressColor";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function EntityCard({
  dataId,
  name,
  level,
  maxLevel,
  onPress,
}: {
  dataId: number;
  name: string;
  level: number;
  maxLevel: number;
  onPress?: () => void;
}) {
  const status = getUpgradeStatus(level, maxLevel);
  const progressColor = getProgressColor(status);
  const progress = maxLevel > 0 ? Math.min((level / maxLevel) * 100, 100) : 0;
  const remaining = maxLevel - level;
  const isMax = status === "max";

  const CardContent = (
    <View style={[styles.card, isMax && styles.cardMaxed]}>
      {/* Maxed Badge (top-right) */}
      {isMax && (
        <View style={styles.maxedBadge}>
          <Ionicons name="checkmark" size={10} color="#0f172a" />
        </View>
      )}

      {/* Icon Container */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${progressColor}15` },
        ]}
      >
        <Image
          source={{
            uri: resolveEntityIcon(dataId),
          }}
          style={styles.cardImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>

      {/* Name */}
      <Text style={styles.cardName} numberOfLines={1}>
        {name}
      </Text>

      {/* Level Display */}
      <View style={styles.levelContainer}>
        <Text style={[styles.levelText, { color: progressColor }]}>
          Lv {level}
        </Text>
        <Text style={styles.maxLevelText}>/ {maxLevel}</Text>
      </View>

      {/* Progress Bar */}
      {!isMax && (
        <>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>

          {/* Remaining Badge */}
          {remaining > 0 && (
            <View
              style={[
                styles.remainingBadge,
                { backgroundColor: `${progressColor}20` },
              ]}
            >
              <Text style={[styles.remainingText, { color: progressColor }]}>
                {remaining} left
              </Text>
            </View>
          )}
        </>
      )}

      {/* Maxed Text */}
      {isMax && (
        <View style={styles.maxBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
          <Text style={styles.maxText}>MAXED</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressablePressed,
        ]}
      >
        {CardContent}
      </Pressable>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  pressable: {
    width: "31.5%",
  },

  pressablePressed: {
    opacity: 0.7,
  },

  card: {
    width: "31%",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  cardMaxed: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.05)",
  },

  maxedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    shadowColor: "#22c55e",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },

  cardImage: {
    width: 48,
    height: 48,
  },

  cardName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f1f5f9",
    textAlign: "center",
    width: "100%",
    minHeight: 14,
  },

  levelContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },

  levelText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  maxLevelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },

  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(51, 65, 85, 0.5)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 2,
  },

  progressFill: {
    height: "100%",
    borderRadius: 2,
  },

  remainingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },

  remainingText: {
    fontSize: 10,
    fontWeight: "700",
  },

  maxBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },

  maxText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#22c55e",
    letterSpacing: 0.5,
  },
});
