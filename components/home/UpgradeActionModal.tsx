import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { MagicItemTimeSaved } from "@/components/home/MagicItemActivitySummary";
import { ENV } from "@/config/env";
import type { ProgressionApplicationResult } from "@/engine/progression/models";
import type { Village } from "@/types/entity";
import { ResourceType } from "@/types/resource";
import type { Upgrade } from "@/types/upgrade";
import { formatStatName } from "@/utils/formatStatName";
import { resolveResourceIcon } from "@/utils/icons/resolveResourceIcon";
import { resolveUpgradeIcon } from "@/utils/icons/resolveUpgradeIcon";

type UpgradeActionModalProps = {
  visible: boolean;
  upgrade: Upgrade | null;
  progression: ProgressionApplicationResult | null;
  onClose: () => void;
  onDelete: (upgradeId: string) => Promise<void>;
  onUseBook?: (upgrade: Upgrade) => Promise<void>;
};

const SPARKY_ICON = `${ENV.CDN_BASE}/v2/home/other/sparky.png`;

const XP_ICON = `${ENV.CDN_BASE}/v2/home/other/xp.png`;

function resolveHallIcon(village: Village, level?: number) {
  if (level == null) {
    return undefined;
  }

  if (village === "builderBase") {
    return `${ENV.CDN_BASE}/v2/builder/builderhalls/${level}.png`;
  }

  return `${ENV.CDN_BASE}/v2/home/townhalls/${level}.png`;
}

export function UpgradeActionModal({
  visible,
  upgrade,
  progression,
  onClose,
  onDelete,
  onUseBook,
}: UpgradeActionModalProps) {
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [now, setNow] = React.useState(Date.now());

  /*
   * -------------------------------------------------------
   * PRESENT / DISMISS
   * -------------------------------------------------------
   */

  React.useEffect(() => {
    if (!visible || !upgrade) {
      bottomSheetRef.current?.dismiss();
      return;
    }

    requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });

    setShowDeleteConfirm(false);
    setNow(Date.now());
  }, [visible, upgrade]);

  /*
   * -------------------------------------------------------
   * TIMER
   * -------------------------------------------------------
   */

  React.useEffect(() => {
    if (!visible || !upgrade) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [visible, upgrade]);

  /*
   * -------------------------------------------------------
   * EMPTY STATE
   * -------------------------------------------------------
   */

  if (!upgrade) {
    return null;
  }

  /*
   * -------------------------------------------------------
   * SNAP POINTS
   * -------------------------------------------------------
   */

  const snapPoints = ["48%", "92%"];

  /*
   * -------------------------------------------------------
   * TIMER
   * -------------------------------------------------------
   */

  const remainingMs = Math.max(upgrade.endTime - now, 0);

  const totalMs = Math.max(upgrade.endTime - upgrade.startTime, 0);

  const progress =
    totalMs > 0
      ? Math.min(Math.max((now - upgrade.startTime) / totalMs, 0), 1)
      : 0;

  /*
   * -------------------------------------------------------
   * FORMATTERS
   * -------------------------------------------------------
   */

  const formatDuration = (seconds: number) => {
    if (!seconds) {
      return "—";
    }

    const days = Math.floor(seconds / 86400);

    const hours = Math.floor((seconds % 86400) / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  };

  const formatMs = (ms: number) => {
    return formatDuration(Math.floor(ms / 1000));
  };

  const formatNumber = (value?: number) => {
    if (value == null) {
      return "—";
    }

    return value.toLocaleString("en-US");
  };

  const formatGameCost = (value?: number) => {
    if (value == null) {
      return "—";
    }

    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    }

    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    }

    return value.toString();
  };

  /*
   * -------------------------------------------------------
   * GENERAL HELPERS
   * -------------------------------------------------------
   */

  const getTypeIcon = () => {
    if (upgrade.isCrafted) {
      return "construct-outline";
    }

    switch (upgrade.type) {
      case "LAB":
        return "flask-outline";

      case "HERO":
        return "person-outline";

      case "PET":
        return "paw-outline";

      case "GUARDIAN":
        return "shield-outline";

      default:
        return "business-outline";
    }
  };

  const getVillageName = () => {
    return upgrade.village === "builderBase" ? "Builder Base" : "Home Village";
  };

  const getResourceColor = (resource?: ResourceType) => {
    switch (resource) {
      case ResourceType.GOLD:
      case ResourceType.BUILDER_GOLD:
        return "#facc15";

      case ResourceType.ELIXIR:
        return "#d946ef";

      case ResourceType.DARK_ELIXIR:
        return "#a78bfa";

      case ResourceType.BUILDER_ELIXIR:
        return "#fb923c";

      case ResourceType.GEMS:
        return "#22d3ee";

      case ResourceType.SEASON_POINTS:
        return "#f59e0b";

      default:
        return "#cbd5e1";
    }
  };

  /*
   * -------------------------------------------------------
   * PROGRESSION
   * -------------------------------------------------------
   */

  const currentLevel = progression?.currentLevel ?? upgrade.currentLevel;

  const nextLevel = progression?.nextLevel ?? upgrade.nextLevel;

  const maxLevel = progression?.maxLevel;

  const isMaxLevel =
    progression?.isMaxLevel ??
    (maxLevel != null && currentLevel != null && currentLevel >= maxLevel);

  const headerLevel = nextLevel ?? currentLevel;

  /*
   * -------------------------------------------------------
   * ICONS
   * -------------------------------------------------------
   */

  const headerIcon =
    headerLevel != null && upgrade.dataId != null
      ? resolveUpgradeIcon(upgrade.dataId, headerLevel, {
          village: upgrade.village,
          isCrafted: upgrade.isCrafted,
        })
      : null;

  const currentIcon =
    currentLevel != null && upgrade.dataId != null
      ? resolveUpgradeIcon(upgrade.dataId, currentLevel, {
          village: upgrade.village,
          isCrafted: upgrade.isCrafted,
        })
      : null;

  const nextIcon =
    nextLevel != null && upgrade.dataId != null
      ? resolveUpgradeIcon(upgrade.dataId, nextLevel, {
          village: upgrade.village,
          isCrafted: upgrade.isCrafted,
        })
      : null;

  /*
   * -------------------------------------------------------
   * CRAFTED
   * -------------------------------------------------------
   */

  const craftedProgression =
    progression && "moduleId" in progression ? progression : null;

  /*
   * -------------------------------------------------------
   * RESOURCE
   * -------------------------------------------------------
   */

  const resourceIcon =
    progression?.resource != null
      ? resolveResourceIcon(progression.resource)
      : undefined;

  const resourceColor =
    progression?.resource != null
      ? getResourceColor(progression.resource)
      : undefined;

  /*
   * -------------------------------------------------------
   * HALL
   * -------------------------------------------------------
   */

  const hallIcon =
    progression?.requiredHallLevel != null
      ? resolveHallIcon(upgrade.village, progression.requiredHallLevel)
      : undefined;

  const achievableIcon =
    progression && upgrade.dataId != null
      ? resolveUpgradeIcon(upgrade.dataId, progression.achievableLevel, {
          village: upgrade.village,
          isCrafted: upgrade.isCrafted,
        })
      : undefined;
  /*
   * -------------------------------------------------------
   * STATS
   * -------------------------------------------------------
   */

  const hasStats =
    progression && Object.keys(progression.currentStats).length > 0;

  /*
   * -------------------------------------------------------
   * XP
   * -------------------------------------------------------
   */

  const hasXp = progression?.currentXp != null || progression?.nextXp != null;

  /*
   * -------------------------------------------------------
   * DELETE
   * -------------------------------------------------------
   */

  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      await onDelete(upgrade.id);

      setShowDeleteConfirm(false);

      bottomSheetRef.current?.dismiss();
    } catch {
      setShowDeleteConfirm(false);
    }
  };
  const handleDismiss = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  /*
   * -------------------------------------------------------
   * BACKDROP
   * -------------------------------------------------------
   */

  const renderBackdrop = (
    props: React.ComponentProps<typeof BottomSheetBackdrop>,
  ) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.55}
      pressBehavior="close"
    />
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={(index) => {
        console.log("🔥 [Upgrade Action Modal CHANGE]", index);
      }}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      enableDynamicSizing={false}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* =====================================================
            HEADER
        ====================================================== */}

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            {headerIcon ? (
              <Image
                source={{
                  uri: headerIcon,
                }}
                style={styles.headerEntityIcon}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name={getTypeIcon()} size={19} color="#cbd5e1" />
            )}
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {upgrade.isCrafted
                ? (craftedProgression?.defenseName ?? upgrade.entity)
                : upgrade.entity}
            </Text>

            <Text style={styles.subtitle}>
              {getVillageName()}
              {" · "}
              {upgrade.isCrafted ? "Crafted Defense" : upgrade.type}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            onPress={() => bottomSheetRef.current?.dismiss()}
          >
            <Ionicons name="close" size={18} color="#94a3b8" />
          </Pressable>
        </View>

        {/* =====================================================
            CRAFTED MODULE
        ====================================================== */}

        {craftedProgression && (
          <View style={styles.craftedModuleHeader}>
            <View style={styles.craftedModuleIcon}>
              <Ionicons name="construct-outline" size={15} color="#94a3b8" />
            </View>

            <View style={styles.craftedModuleText}>
              <Text style={styles.craftedModuleLabel}>MODULE</Text>

              <Text style={styles.craftedModuleName} numberOfLines={1}>
                {craftedProgression.moduleName}
              </Text>

              <Text style={styles.craftedModuleId}>
                ID {craftedProgression.moduleId}
              </Text>
            </View>

            <View style={styles.craftedModuleLevel}>
              <Text style={styles.craftedModuleLevelText}>
                {currentLevel ?? "—"}
              </Text>

              <Text style={styles.craftedModuleLevelMax}>
                / {maxLevel ?? "—"}
              </Text>
            </View>
          </View>
        )}

        {/* =====================================================
            LEVEL TRANSITION
        ====================================================== */}

        <View style={styles.levelSection}>
          {/* CURRENT */}

          <View style={styles.levelSide}>
            {currentIcon ? (
              <Image
                source={{
                  uri: currentIcon,
                }}
                style={styles.currentLevelIcon}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.currentEmptyLevelIcon}>
                <Ionicons name={getTypeIcon()} size={17} color="#64748b" />
              </View>
            )}

            <Text style={styles.levelLabel}>CURRENT</Text>

            <Text style={styles.currentLevelNumber}>{currentLevel ?? "—"}</Text>
          </View>

          {/* ARROW */}

          {nextLevel != null && (
            <Ionicons name="arrow-forward" size={18} color="#64748b" />
          )}

          {/* NEXT */}

          <View style={styles.levelSide}>
            {nextIcon ? (
              <Image
                source={{
                  uri: nextIcon,
                }}
                style={styles.nextLevelIcon}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.nextEmptyLevelIcon}>
                {isMaxLevel ? (
                  <Ionicons name="checkmark-circle" size={24} color="#94a3b8" />
                ) : (
                  <Ionicons
                    name="help-circle-outline"
                    size={21}
                    color="#64748b"
                  />
                )}
              </View>
            )}

            <Text style={styles.levelLabel}>
              {isMaxLevel ? "STATUS" : "NEXT"}
            </Text>

            <Text style={styles.nextLevelNumber}>
              {isMaxLevel ? "MAX" : (nextLevel ?? "—")}
            </Text>
          </View>
        </View>

        {/* =====================================================
            TIMER
        ====================================================== */}

        <View style={styles.timerSection}>
          <View style={styles.timerRow}>
            <View style={styles.inlineLeft}>
              <Ionicons name="time-outline" size={15} color="#94a3b8" />

              <Text style={styles.mutedText}>Remaining</Text>
            </View>

            <Text style={styles.timerValue}>{formatMs(remainingMs)}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>

          <View style={styles.timerFooter}>
            <Text style={styles.tinyText}>
              {Math.round(progress * 100)}% complete
            </Text>

            <Text style={styles.tinyText}>{formatMs(totalMs)}</Text>
          </View>
        </View>
        <MagicItemTimeSaved milliseconds={upgrade.magicItemTimeSavedMs} />

        {/* =====================================================
            AVAILABLE AT CURRENT HALL
        ====================================================== */}

        {progression && (
          <View style={styles.hallAvailabilityCard}>
            <View style={styles.hallAvailabilityHeader}>
              <Ionicons name="home-outline" size={16} color="#64748b" />

              <Text style={styles.hallAvailabilityTitle}>
                Available at your hall
              </Text>
            </View>

            <View style={styles.hallAvailabilityContent}>
              {achievableIcon && (
                <Image
                  source={{
                    uri: achievableIcon,
                  }}
                  style={styles.hallAvailabilityEntityIcon}
                  resizeMode="contain"
                />
              )}

              <View style={styles.hallAvailabilityText}>
                <Text style={styles.hallAvailabilityLabel}>
                  At your current{" "}
                  {upgrade.village === "builderBase"
                    ? "Builder Hall"
                    : "Town Hall"}{" "}
                  {progression.currentHallLevel ?? "—"}
                </Text>

                <Text style={styles.hallAvailabilityValue}>
                  {craftedProgression
                    ? `${craftedProgression.moduleName} → Level ${craftedProgression.achievableLevel}`
                    : `Level ${progression.achievableLevel}`}
                </Text>

                <Text style={styles.hallAvailabilityHall}>
                  {craftedProgression
                    ? `${craftedProgression.defenseName} · Module ${craftedProgression.moduleId}`
                    : "Maximum available level"}
                </Text>
              </View>

              {maxLevel != null && (
                <View style={styles.maxLevel}>
                  <Text style={styles.levelLabel}>MAX</Text>

                  <Text style={styles.maxLevelText}>{maxLevel}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* =====================================================
            MAX STATUS
        ====================================================== */}

        {progression && isMaxLevel && (
          <View style={styles.maxStatus}>
            <Ionicons name="checkmark-circle" size={17} color="#94a3b8" />

            <View>
              <Text style={styles.maxStatusTitle}>Max level reached</Text>

              <Text style={styles.maxStatusSubtitle}>
                This {upgrade.isCrafted ? "module" : "entity"} is fully
                upgraded.
              </Text>
            </View>
          </View>
        )}

        {/* =====================================================
            NEXT UPGRADE
        ====================================================== */}

        {progression && !isMaxLevel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next upgrade</Text>

            <DetailRow
              icon="cash-outline"
              label="Cost"
              value={
                progression.nextCost != null
                  ? formatGameCost(progression.nextCost)
                  : "—"
              }
              valueIconUri={resourceIcon}
              valueColor={resourceColor}
            />

            <DetailRow
              icon="time-outline"
              label="Duration"
              value={
                progression.nextUpgradeTime != null
                  ? formatDuration(progression.nextUpgradeTime)
                  : "—"
              }
            />

            <DetailRow
              icon="home-outline"
              label={
                upgrade.village === "builderBase"
                  ? "Required BH"
                  : "Required TH"
              }
              value={
                progression.requiredHallLevel != null
                  ? String(progression.requiredHallLevel)
                  : "—"
              }
              valueIconUri={hallIcon}
            />

            {hasXp && (
              <DetailRow
                icon="star-outline"
                label="XP"
                value={
                  progression.currentXp != null && progression.nextXp != null
                    ? `${formatNumber(progression.currentXp)} → ${formatNumber(
                        progression.nextXp,
                      )}`
                    : formatNumber(progression.nextXp ?? progression.currentXp)
                }
                valueIconUri={XP_ICON}
              />
            )}

            {craftedProgression && (
              <DetailRow
                icon="diamond-outline"
                label="Sparky Stones"
                value={formatNumber(craftedProgression.sparkyStones)}
                valueIconUri={SPARKY_ICON}
              />
            )}
          </View>
        )}

        {/* =====================================================
            CRAFTED MODULE PROGRESSION
        ====================================================== */}

        {craftedProgression && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Module progression</Text>

            <View style={styles.moduleProgressCard}>
              <View style={styles.moduleProgressTop}>
                <View style={styles.moduleProgressInfo}>
                  <Text style={styles.moduleProgressName}>
                    {craftedProgression.moduleName}
                  </Text>

                  <Text style={styles.moduleProgressId}>
                    Module ID {craftedProgression.moduleId}
                  </Text>

                  <Text style={styles.moduleProgressSubtext}>
                    {craftedProgression.currentLevel}
                    {" → "}
                    {craftedProgression.isMaxLevel
                      ? "MAX"
                      : (craftedProgression.nextLevel ?? "—")}
                  </Text>
                </View>

                <View style={styles.moduleProgressBadge}>
                  <Text style={styles.moduleProgressBadgeText}>
                    {craftedProgression.remainingLevels}
                  </Text>

                  <Text style={styles.moduleProgressBadgeLabel}>LEFT</Text>
                </View>
              </View>

              <View style={styles.moduleProgressTrack}>
                <View
                  style={[
                    styles.moduleProgressFill,
                    {
                      width: `${Math.min(
                        Math.max(craftedProgression.progressPercent, 0),
                        100,
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* =====================================================
            STATS
        ====================================================== */}

        {hasStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {craftedProgression
                ? `${craftedProgression.moduleName} stats`
                : "Stats"}
            </Text>

            {Object.keys(progression.currentStats).map((stat) => {
              const currentValue = progression.currentStats[stat];

              const nextValue = progression.nextStats[stat];

              return (
                <DetailRow
                  key={stat}
                  icon="stats-chart-outline"
                  label={formatStatName(stat)}
                  value={
                    !isMaxLevel && nextValue != null
                      ? `${formatNumber(currentValue)} → ${formatNumber(
                          nextValue,
                        )}`
                      : formatNumber(currentValue)
                  }
                />
              );
            })}
          </View>
        )}

        {/* =====================================================
            PROGRESSION TO MAX
        ====================================================== */}

        {progression && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {craftedProgression
                ? "Module progression to max"
                : "Overall progression"}
            </Text>

            <DetailRow
              icon="layers-outline"
              label="Levels remaining"
              value={String(progression.remainingLevels)}
            />

            <DetailRow
              icon="wallet-outline"
              label="Total cost"
              value={formatGameCost(progression.remainingCost)}
              valueIconUri={resourceIcon}
              valueColor={resourceColor}
            />

            <DetailRow
              icon="hourglass-outline"
              label="Total time"
              value={formatDuration(progression.remainingUpgradeTime)}
            />
          </View>
        )}

        {onUseBook && upgrade.endTime > now && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Use a Book on ${upgrade.entity}`}
            style={({ pressed }) => [
              styles.useBookButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void onUseBook(upgrade);
            }}
          >
            <Ionicons name="book" size={16} color="#0f172a" />
            <Text style={styles.useBookText}>Use Book to Finish Upgrade</Text>
          </Pressable>
        )}

        {/* =====================================================
            DELETE
        ====================================================== */}

        {!showDeleteConfirm ? (
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
            onPress={handleDeletePress}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />

            <Text style={styles.deleteText}>Delete Upgrade</Text>
          </Pressable>
        ) : (
          <View style={styles.deleteConfirm}>
            <View style={styles.deleteConfirmIcon}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </View>

            <View style={styles.deleteConfirmContent}>
              <Text style={styles.deleteConfirmTitle}>Delete upgrade?</Text>

              <Text style={styles.deleteConfirmMessage} numberOfLines={2}>
                Remove this upgrade from your tracked upgrades?
              </Text>
            </View>

            <View style={styles.deleteConfirmActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelDeleteButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.confirmDeleteButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleDelete}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/*
 * ============================================================
 * DETAIL ROW
 * ============================================================
 */

function DetailRow({
  icon,
  label,
  value,
  valueIconUri,
  valueColor,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueIconUri?: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        {icon && <Ionicons name={icon} size={15} color="#64748b" />}

        <Text style={styles.detailLabel}>{label}</Text>
      </View>

      <View style={styles.detailRight}>
        <Text
          style={[
            styles.detailValue,
            valueColor
              ? {
                  color: valueColor,
                }
              : undefined,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>

        {valueIconUri && (
          <Image
            source={{
              uri: valueIconUri,
            }}
            style={styles.valueIcon}
            resizeMode="contain"
          />
        )}
      </View>
    </View>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  /*
   * ----------------------------------------------------------
   * SHEET
   * ----------------------------------------------------------
   */

  sheetBackground: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#1e293b",
  },

  handle: {
    paddingTop: 6,
    paddingBottom: 6,
  },

  handleIndicator: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#475569",
  },

  contentContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  bottomSpacer: {
    height: 12,
  },

  /*
   * ----------------------------------------------------------
   * HEADER
   * ----------------------------------------------------------
   */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  headerEntityIcon: {
    width: 34,
    height: 34,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },

  subtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748b",
  },

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },

  /*
   * ----------------------------------------------------------
   * CRAFTED MODULE HEADER
   * ----------------------------------------------------------
   */

  craftedModuleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 9,
    marginBottom: 2,
    borderRadius: 9,
    backgroundColor: "#111c31",
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  craftedModuleIcon: {
    width: 27,
    height: 27,
    borderRadius: 7,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  craftedModuleText: {
    flex: 1,
  },

  craftedModuleLabel: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#64748b",
  },

  craftedModuleName: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#e2e8f0",
  },

  craftedModuleId: {
    marginTop: 1,
    fontSize: 7,
    color: "#475569",
  },

  craftedModuleLevel: {
    flexDirection: "row",
    alignItems: "baseline",
  },

  craftedModuleLevelText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f8fafc",
  },

  craftedModuleLevelMax: {
    fontSize: 9,
    color: "#64748b",
  },

  /*
   * ----------------------------------------------------------
   * LEVEL TRANSITION
   * ----------------------------------------------------------
   */

  levelSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1e293b",
  },

  levelSide: {
    minWidth: 70,
    alignItems: "center",
  },

  currentLevelIcon: {
    width: 36,
    height: 36,
    marginBottom: 4,
  },

  nextLevelIcon: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },

  currentEmptyLevelIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  nextEmptyLevelIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  levelLabel: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "#64748b",
  },

  currentLevelNumber: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#94a3b8",
  },

  nextLevelNumber: {
    marginTop: 1,
    fontSize: 19,
    fontWeight: "900",
    color: "#f8fafc",
  },

  maxLevel: {
    marginLeft: 5,
    alignItems: "center",
  },

  maxLevelText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },

  /*
   * ----------------------------------------------------------
   * TIMER
   * ----------------------------------------------------------
   */

  timerSection: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "#1e293b",
  },

  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  inlineLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  mutedText: {
    fontSize: 11,
    color: "#64748b",
  },

  timerValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e2e8f0",
  },

  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#1e293b",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#94a3b8",
  },

  timerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  tinyText: {
    fontSize: 8,
    color: "#475569",
  },

  /*
   * ----------------------------------------------------------
   * SECTIONS
   * ----------------------------------------------------------
   */

  section: {
    paddingTop: 9,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 2,
  },

  detailRow: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    color: "#64748b",
  },

  detailRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    maxWidth: "62%",
  },

  detailValue: {
    fontSize: 10,
    fontWeight: "700",
    color: "#cbd5e1",
  },

  valueIcon: {
    width: 16,
    height: 16,
    marginLeft: 4,
  },

  /*
   * ----------------------------------------------------------
   * HALL AVAILABILITY
   * ----------------------------------------------------------
   */

  hallAvailabilityCard: {
    marginTop: 9,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#111c31",
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  hallAvailabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  hallAvailabilityTitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "#64748b",
    textTransform: "uppercase",
  },

  hallAvailabilityContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  hallAvailabilityEntityIcon: {
    width: 34,
    height: 34,
    marginRight: 9,
  },

  hallAvailabilityText: {
    flex: 1,
  },

  hallAvailabilityLabel: {
    fontSize: 9,
    color: "#64748b",
  },

  hallAvailabilityHall: {
    marginTop: 1,
    fontSize: 8,
    color: "#94a3b8",
  },

  hallAvailabilityValue: {
    marginTop: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#e2e8f0",
  },

  /*
   * ----------------------------------------------------------
   * MAX
   * ----------------------------------------------------------
   */

  maxStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 8,
    borderRadius: 9,
    backgroundColor: "#111c31",
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  maxStatusTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#cbd5e1",
  },

  maxStatusSubtitle: {
    marginTop: 1,
    fontSize: 8,
    color: "#64748b",
  },

  /*
   * ----------------------------------------------------------
   * CRAFTED MODULE PROGRESSION
   * ----------------------------------------------------------
   */

  moduleProgressCard: {
    marginTop: 2,
    padding: 9,
    borderRadius: 9,
    backgroundColor: "#111c31",
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  moduleProgressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  moduleProgressInfo: {
    flex: 1,
    paddingRight: 8,
  },

  moduleProgressName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#e2e8f0",
  },

  moduleProgressId: {
    marginTop: 1,
    fontSize: 7,
    color: "#475569",
  },

  moduleProgressSubtext: {
    marginTop: 2,
    fontSize: 8,
    color: "#64748b",
  },

  moduleProgressBadge: {
    minWidth: 38,
    alignItems: "center",
  },

  moduleProgressBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#cbd5e1",
  },

  moduleProgressBadgeLabel: {
    marginTop: -1,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#64748b",
  },

  moduleProgressTrack: {
    height: 3,
    marginTop: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#1e293b",
  },

  moduleProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#94a3b8",
  },

  /*
   * ----------------------------------------------------------
   * DELETE
   * ----------------------------------------------------------
   */

  useBookButton: {
    minHeight: 40,
    marginTop: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fbbf24",
  },
  useBookText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "800",
  },

  deleteButton: {
    height: 38,
    marginTop: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(239,68,68,0.07)",
  },

  deleteText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ef4444",
  },

  deleteConfirm: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 9,
    borderRadius: 10,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },

  deleteConfirmIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    marginRight: 8,
  },

  deleteConfirmContent: {
    flex: 1,
    paddingRight: 8,
  },

  deleteConfirmTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  deleteConfirmMessage: {
    marginTop: 2,
    fontSize: 8,
    lineHeight: 11,
    color: "#64748b",
  },

  deleteConfirmActions: {
    flexDirection: "row",
    gap: 6,
  },

  cancelDeleteButton: {
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
  },

  cancelDeleteText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94a3b8",
  },

  confirmDeleteButton: {
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },

  confirmDeleteText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ef4444",
  },

  pressed: {
    opacity: 0.65,
  },
});
