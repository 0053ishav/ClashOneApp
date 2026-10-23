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
          isMax ? styles.artworkMaxed : styles.artworkDefault,
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.artworkGlow, isMax && styles.artworkGlowMaxed]}
        />
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
          {isMax ? (
            <View style={styles.maxLevelFlame}>
              <Ionicons
                name="flame"
                size={29}
                color="#EA580C"
                style={styles.flameLayer}
              />
              <Ionicons
                name="flame"
                size={25}
                color="#FDC262"
                style={styles.flameLayer}
              />
              <Ionicons
                name="flame"
                size={17}
                color="#FFF0B0"
                style={styles.flameLayer}
              />
              <Text style={styles.maxLevelText}>{level}</Text>
            </View>
          ) : (
            <Text style={styles.levelText}>{level}</Text>
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
          <Ionicons name="trending-up" size={10} color={progressColor} />
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
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },

  card: {
    width: "100%",
    alignItems: "center",
    gap: 5,
    paddingBottom: 2,
  },

  artwork: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 92,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: HOME_COLORS.surfaceRaised,
  },

  artworkDefault: {
    borderColor: HOME_COLORS.borderStrong,
  },

  artworkMaxed: {
    borderColor: HOME_COLORS.gold,
    borderWidth: 1.8,
    shadowColor: HOME_COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },

  artworkGlow: {
    position: "absolute",
    width: "74%",
    height: "74%",
    borderRadius: 999,
    backgroundColor: HOME_COLORS.blue,
    opacity: 0.045,
  },

  artworkGlowMaxed: {
    backgroundColor: HOME_COLORS.gold,
    opacity: 0.1,
  },

  cardImage: {
    width: "70%",
    height: "70%",
    zIndex: 1,
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
    minWidth: 29,
    width: 31,
    height: 29,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },

  levelText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    color: HOME_COLORS.textBright,
    fontVariant: ["tabular-nums"],
  },

  maxLevelFlame: {
    width: 31,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
  },

  flameLayer: {
    position: "absolute",
    bottom: 0,
  },

  maxLevelText: {
    position: "absolute",
    top: 9,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    color: HOME_COLORS.white,
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(15,23,42,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },


  cardName: {
    width: "100%",
    minHeight: 15,
    textAlign: "center",
    color: HOME_COLORS.textPrimary,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "800",
  },

  remainingBadge: {
    minHeight: 18,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  remainingText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
