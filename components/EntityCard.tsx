import { HOME_COLORS } from "@/theme/home";
import { getUpgradeStatus } from "@/engine/progression/selectors/getUpgradeStatus";
import { getProgressColor } from "@/utils/getProgressColor";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import type { Village } from "@/types/entity";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EntityCardProps {
  dataId: number;
  name: string;
  level: number;
  maxLevel: number;
  onPress?: () => void;
  village?: Village;
  /** Fill a FlatList column instead of using the three-column flex-wrap layout. */
  fillContainer?: boolean;
}

export default function EntityCard({
  dataId,
  name,
  level,
  maxLevel,
  onPress,
  village,
  fillContainer = false,
}: EntityCardProps) {
  const status = getUpgradeStatus(level, maxLevel);
  const progressColor = getProgressColor(status);
  const remaining = Math.max(0, maxLevel - level);
  const isMax = status === "max";

  const content = (
    <View style={styles.card}>
      <View
        style={[
          styles.artwork,
          { borderColor: isMax ? HOME_COLORS.gold : HOME_COLORS.borderStrong },
          isMax && styles.artworkMaxed,
        ]}
      >
        <Image
          accessibilityLabel={name}
          source={{
            uri: resolveEntityIcon(
              dataId,
              village ? { village, level } : undefined,
            ),
          }}
          style={styles.cardImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />

        <View
          style={[
            styles.levelBadge,
            isMax ? styles.levelBadgeMaxed : styles.levelBadgeDefault,
          ]}
        >
          <Text style={styles.levelText}>{level}</Text>
          {isMax && (
            <Ionicons name="flame" size={12} color={HOME_COLORS.orangeLight} />
          )}
        </View>
      </View>

      <Text style={styles.cardName} numberOfLines={1}>
        {name}
      </Text>

      {!isMax && remaining > 0 && (
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
    </View>
  );

  if (!onPress) {
    return (
      <View style={fillContainer ? styles.pressableFill : styles.pressable}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isMax
          ? `${name}, max level ${level}`
          : `${name}, level ${level} of ${maxLevel}, ${remaining} levels left`
      }
      onPress={onPress}
      style={({ pressed }) => [
        fillContainer ? styles.pressableFill : styles.pressable,
        pressed && styles.pressablePressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "31.5%",
  },

  pressableFill: {
    width: "31.5%",
  },

  pressablePressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },

  card: {
    width: "100%",
    alignItems: "center",
    gap: 5,
  },

  artwork: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 92,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: HOME_COLORS.borderStrong,
    backgroundColor: HOME_COLORS.surfaceRaised,
  },

  artworkMaxed: {
    borderColor: HOME_COLORS.gold,
  },

  cardImage: {
    width: "70%",
    height: "70%",
  },

  levelBadge: {
    position: "absolute",
    left: 3,
    bottom: 3,
    minWidth: 20,
    height: 18,
    paddingHorizontal: 4,
    flexDirection: "row",
    gap: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },

  levelBadgeDefault: {
    backgroundColor: "rgba(15,23,42,0.94)",
  },

  levelBadgeMaxed: {
    backgroundColor: "rgba(15,23,42,0.96)",
    minWidth: 29,
  },

  levelText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    color: HOME_COLORS.textBright,
    fontVariant: ["tabular-nums"],
  },


  cardName: {
    width: "100%",
    minHeight: 14,
    textAlign: "center",
    color: HOME_COLORS.textPrimary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },

  remainingBadge: {
    minHeight: 16,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  remainingText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
