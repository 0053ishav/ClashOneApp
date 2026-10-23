import { MagicItemTimeSaved } from "@/components/home/MagicItemActivitySummary";
import { HOME_COLORS } from "@/theme/home";
import { ProgressionEmptyState } from "@/components/home/ProgressionEmptyState";
import { ENV } from "@/config/env";
import { Village } from "@/types/entity";
import { Upgrade } from "@/types/upgrade";
import { calculateProgress } from "@/utils/calculateProgress";
import { formatCountdown } from "@/utils/formatCountdown";
import { formatUpgradeFinishDateTime } from "@/utils/formatUpgradeFinishDateTime";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function LabSection({
  village,
  labNormal,
  labGoblin,
  onAddPress,
  onPress,
}: {
  village: Village;
  labNormal?: Upgrade | null;
  labGoblin?: Upgrade | null;
  onAddPress?: () => void;
  onPress?: (lab: Upgrade) => void;
}) {
  const isNormalBusy = !!labNormal && !labNormal.isCompleted;
  const isGoblinBusy = !!labGoblin && !labGoblin.isCompleted;

  const isAnyBusy = isNormalBusy || isGoblinBusy;
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <View style={{}}>
              <Image
                source={
                  village === "home"
                    ? { uri: `${ENV.CDN_BASE}/entities/buildings/1000007.png` }
                    : {
                        uri: `${ENV.CDN_BASE}/entities/builder/buildings/1000046.png`,
                      }
                }
                style={{ width: 30, height: 30 }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
            <Text style={styles.sectionTitle}>
              {village === "home" ? "Laboratory" : "Star Laboratory"}
            </Text>
          </View>

          <View
            style={[
              styles.statusDot,
              isAnyBusy ? styles.labDotBusy : styles.dotFree,
            ]}
          />
        </View>

        {/* Add button only when at least 1 slot free */}
        {onAddPress && (!isNormalBusy || !isGoblinBusy) && (
          <Pressable
            onPress={onAddPress}
            style={({ pressed }) => [
              styles.addIconButton,
              pressed && styles.addIconButtonPressed,
            ]}
          >
            <Ionicons name="add-circle" size={22} color=HOME_COLORS.cyanBright />
          </Pressable>
        )}
      </View>

      {/* NORMAL LAB */}
      {labNormal && (
        <LabCard
          village={village}
          label="Lab"
          lab={labNormal}
          onPress={onPress}
        />
      )}

      {/* GOBLIN LAB */}
      {labGoblin && (
        <LabCard
          village={village}
          label="Goblin"
          lab={labGoblin}
          onPress={onPress}
          isGoblin
        />
      )}

      {/* EMPTY STATE */}
      {!labNormal && !labGoblin && (
        <ProgressionEmptyState
          icon="flask-outline"
          title="No research in progress"
          description="Your Laboratory is ready for the next troop or spell upgrade."
          accentColor=HOME_COLORS.blue
        />
      )}
    </View>
  );
}

function LabCard({
  village,
  lab,
  label,
  isGoblin,
  onPress,
}: {
  village: Village;
  lab: Upgrade;
  label: string;
  isGoblin?: boolean;
  onPress?: (lab: Upgrade) => void;
}) {
  const now = Date.now();

  const progress = calculateProgress(lab.startTime, lab.endTime);
  const remainingMs = Math.max(lab.endTime - now, 0);
  const totalMs = lab.endTime - lab.startTime;

  const iconUri =
    lab.dataId != null
      ? resolveEntityIcon(lab.dataId, {
          village: village,
          level: lab.currentLevel,
        })
      : null;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        styles.labCard,
        isGoblin && styles.goblinCard,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress?.(lab)}
      delayLongPress={300}
    >
      <View style={styles.cardContent}>
        <View style={[styles.builderBadge, isGoblin && styles.goblinBadge]}>
          <Text style={styles.builderBadgeText}>{isGoblin ? "G" : "LAB"}</Text>

          {isGoblin && (
            <Image
              source={require("@/assets/images/clash/goblin-builder.png")}
              style={styles.goblinBadgeIcon}
              contentFit="contain"
            />
          )}
        </View>
        <View style={styles.upgradeMain}>
          {/* LEFT */}
          <View style={styles.upgradeLeft}>
            <View style={[styles.iconContainer, styles.labIconContainer]}>
              <Image
                source={
                  iconUri
                    ? { uri: iconUri }
                    : require("@/assets/images/builder/builder-working.png")
                }
                style={styles.labIcon}
              />
            </View>

            <View style={styles.upgradeNameSection}>
              <View style={styles.topRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {lab.entity}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {lab.currentLevel !== undefined &&
                  lab.nextLevel !== undefined && (
                    <View style={[styles.levelBadge, styles.labLevelBadge]}>
                      <Text style={styles.levelText}>
                        Lv {lab.currentLevel} → {lab.nextLevel}
                      </Text>
                    </View>
                  )}
                {lab.hasHelper && (
                  <View style={styles.helperRow}>
                    <Image
                      source={{
                        uri: resolveEntityIcon(93000001),
                      }}
                      style={styles.helperIcon}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />

                    {(lab.helperAppliedSeconds ?? 0) > 0 && (
                      <Text style={styles.helperSaved}>
                        -
                        {formatCountdown(
                          (lab.helperAppliedSeconds ?? 0) * 1000,
                        )}
                      </Text>
                    )}

                    {lab.recurrentHelper && (
                      <View style={styles.recurrentBadge}>
                        <Ionicons name="repeat" size={10} color=HOME_COLORS.gold />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* RIGHT */}
          <View style={styles.upgradeRight}>
            <Text
              style={[
                styles.remainingTime,
                styles.labTime,
                isGoblin && styles.goblinLabTime,
              ]}
            >
              {formatCountdown(remainingMs)}
            </Text>

            <Text style={styles.totalTime}>of {formatCountdown(totalMs)}</Text>
            <Text style={styles.totalTime}>
              {formatUpgradeFinishDateTime(lab.endTime)}
            </Text>
            <MagicItemTimeSaved milliseconds={lab.magicItemTimeSavedMs} />
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              isGoblin && styles.goblinProgress,
              {
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  emoji: {
    fontSize: 18,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  labDotBusy: {
    backgroundColor: HOME_COLORS.cyan,
  },

  dotFree: {
    backgroundColor: HOME_COLORS.success,
  },

  addIconButton: {
    padding: 4,
    borderRadius: 20,
  },

  addIconButtonPressed: {
    opacity: 0.6,
  },

  card: {
    borderRadius: 14,
    overflow: "visible",
    shadowColor: HOME_COLORS.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 8,
  },

  labCard: {
    backgroundColor: HOME_COLORS.surface,
  },

  goblinCard: {
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  cardPressed: {
    opacity: 0.9,
  },

  cardContent: {
    backgroundColor: HOME_COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    gap: 10,
  },

  builderBadge: {
    position: "absolute",
    top: -8,
    right: 0,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: HOME_COLORS.cyan,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },

  goblinBadge: {
    backgroundColor: HOME_COLORS.success,
  },

  builderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: HOME_COLORS.textDark,
  },

  goblinBadgeIcon: {
    width: 14,
    height: 14,
    marginLeft: 3,
  },

  upgradeMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  upgradeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  upgradeRight: {
    alignItems: "flex-end",
    gap: 4,
  },

  upgradeNameSection: {
    flex: 1,
    gap: 6,
  },

  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  labIconContainer: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
  },

  labIcon: {
    width: 40,
    height: 40,
  },

  infoSection: {
    flex: 1,
    gap: 8,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
    flex: 1,
  },

  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  labLevelBadge: {
    backgroundColor: "rgba(6, 182, 212, 0.2)",
  },

  levelText: {
    fontSize: 11,
    fontWeight: "600",
    color: HOME_COLORS.cyan,
  },

  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  helperIcon: {
    width: 14,
    height: 14,
  },

  recurrentBadge: {
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  helperText: {
    marginLeft: 4,
    fontSize: 11,
    color: HOME_COLORS.gold,
    fontWeight: "600",
  },

  helperSaved: {
    marginLeft: 4,
    fontSize: 10,
    color: HOME_COLORS.textSecondary,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },

  remainingTime: {
    fontSize: 15,
    fontWeight: "800",
  },

  labTime: {
    color: HOME_COLORS.cyanBright,
  },

  goblinLabTime: {
    color: HOME_COLORS.success,
  },

  totalTime: {
    fontSize: 11,
    color: HOME_COLORS.textSecondary,
    fontWeight: "500",
  },

  progressTrack: {
    height: 4,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: HOME_COLORS.progress,
  },

  labProgressBar: {
    backgroundColor: HOME_COLORS.progress,
  },

  goblinProgress: {
    backgroundColor: HOME_COLORS.progress,
  },

  emptyCard: {
    backgroundColor: HOME_COLORS.surfaceRaised,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderMuted,
    borderStyle: "dashed",
  },

  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(71, 85, 105, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 14,
    color: HOME_COLORS.textSecondary,
    fontWeight: "500",
  },

  emptyAddButton: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  labEmptyButton: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
  },

  emptyAddButtonPressed: {
    opacity: 0.7,
  },

  emptyAddText: {
    fontSize: 13,
    fontWeight: "600",
  },

  labEmptyText: {
    color: HOME_COLORS.cyanBright,
  },
});
