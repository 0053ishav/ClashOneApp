import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { getUpgradeStatus } from "@/engine/progression/selectors/getUpgradeStatus";
import { getProgressColor } from "@/utils/getProgressColor";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import type { Village } from "@/types/entity";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";

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
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          allowDownscaling={false}
          cachePolicy="memory-disk"
        />

        <View
          style={[
            styles.levelBadge,
            isMax ? styles.levelBadgeMaxed : styles.levelBadgeDefault,
          ]}
        >
          <Text style={[styles.levelText, isMax && styles.levelTextMaxed]}>
            {level}
          </Text>
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

const createStyles = (colors: HomeColors) => StyleSheet.create({
  pressable: {
    width: "31.5%",
  },

  pressableFill: {
    width: "31.5%",
  },

  pressablePressed: {
    opacity: 0.88,
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
    maxWidth: 88,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 9,
    borderWidth: 1.5,
    backgroundColor: "#263449",
    padding: 3,
  },

  artworkDefault: {
    borderColor: "#53657e",
  },

  artworkMaxed: {
    borderColor: colors.gold,
    borderWidth: 2,
    backgroundColor: "#3b3527",
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  levelBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    minWidth: 22,
    height: 20,
    paddingHorizontal: 4,
    flexDirection: "row",
    gap: 2,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  levelBadgeDefault: {
    backgroundColor: "#1b2637",
    borderRadius: 5,
    minWidth: 22,
    height: 20,
  },

  levelBadgeMaxed: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: 3,
    minWidth: 20,
    height: 18,
    paddingHorizontal: 3,
  },

  levelText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },

  levelTextMaxed: {
    color: colors.textDark,
    fontSize: 11,
    lineHeight: 13,
  },



  cardName: {
    width: "100%",
    minHeight: 15,
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },

  remainingBadge: {
    minHeight: 17,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    gap: 3,
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
