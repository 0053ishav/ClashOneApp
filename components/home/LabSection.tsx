import { ENV } from "@/config/env";
import { Village } from "@/types/entity";
import { Upgrade } from "@/types/upgrade";
import { calculateProgress } from "@/utils/calculateProgress";
import { formatCountdown } from "@/utils/formatCountdown";
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
            <Ionicons name="add-circle" size={22} color="#22d3ee" />
          </Pressable>
        )}
      </View>

      {/* NORMAL LAB */}
      {labNormal && <LabCard label="Lab" lab={labNormal} onPress={onPress} />}

      {/* GOBLIN LAB */}
      {labGoblin && (
        <LabCard label="Goblin" lab={labGoblin} onPress={onPress} isGoblin />
      )}

      {/* EMPTY STATE */}
      {!labNormal && !labGoblin && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="flask" size={28} color="#475569" />
          </View>

          <Text style={styles.emptyText}>No research in progress</Text>

          {onAddPress && (
            <Pressable
              style={({ pressed }) => [
                styles.emptyAddButton,
                styles.labEmptyButton,
                pressed && styles.emptyAddButtonPressed,
              ]}
              onPress={onAddPress}
            >
              <Text style={styles.labEmptyText}>Start Research</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function LabCard({
  lab,
  label,
  isGoblin,
  onPress,
}: {
  lab: Upgrade;
  label: string;
  isGoblin?: boolean;
  onPress?: (lab: Upgrade) => void;
}) {
  const now = Date.now();

  const progress = calculateProgress(lab.startTime, lab.endTime);
  const remainingMs = Math.max(lab.endTime - now, 0);
  const totalMs = lab.endTime - lab.startTime;

  const iconUri = lab.dataId != null ? resolveEntityIcon(lab.dataId) : null;
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

                    {(lab.helperAppliedSeconds ?? 0) && (
                      <Text style={styles.helperSaved}>
                        -{" "}
                        {formatCountdown(
                          (lab.helperAppliedSeconds ?? 0) * 1000,
                        )}
                      </Text>
                    )}

                    {lab.recurrentHelper && (
                      <View style={styles.recurrentBadge}>
                        <Ionicons name="repeat" size={10} color="#fbbf24" />
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
    marginTop: 32,
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
    color: "#f1f5f9",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  labDotBusy: {
    backgroundColor: "#06b6d4",
  },

  dotFree: {
    backgroundColor: "#22c55e",
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
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 8,
  },

  labCard: {
    backgroundColor: "#1e293b",
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
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#263244",
    gap: 10,
  },

  builderBadge: {
    position: "absolute",
    top: -8,
    right: 0,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#06b6d4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },

  goblinBadge: {
    backgroundColor: "#22c55e",
  },

  builderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
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
    color: "#f1f5f9",
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
    color: "#06b6d4",
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
    color: "#fbbf24",
    fontWeight: "600",
  },

  helperSaved: {
    marginLeft: 4,
    fontSize: 10,
    color: "#94a3b8",
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
    color: "#22d3ee",
  },

  goblinLabTime: {
    color: "#22c55e",
  },

  totalTime: {
    fontSize: 11,
    color: "#94a3b8",
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
    backgroundColor: "#06b6d4",
  },

  labProgressBar: {
    backgroundColor: "#06b6d4",
  },

  goblinProgress: {
    backgroundColor: "#22c55e",
  },

  emptyCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#334155",
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
    color: "#64748b",
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
    color: "#22d3ee",
  },
});
