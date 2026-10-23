"use no memo";

import { HOME_COLORS } from "@/theme/home";

import { useAccountStore } from "@/stores/accountStore";
import { formatCountdown } from "@/utils/formatCountdown";
import { getBuilderStatus } from "@/utils/status/home/builderStatus";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { XPBadge } from "@/components/XPBadge";
import { ENV } from "@/config/env";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { getAccountState } from "@/services/accountStateService";
import { Upgrade } from "@/types/upgrade";
import { track } from "@/utils/analytics/analytics";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

export default function ValueScreen() {
  const router = useRouter();

  const accounts = useAccountStore((s) => s.accounts);

  const activeTag = useAccountStore((s) => s.activeTag);
  const { profile } = usePlayerProfile();

  const [activeUpgrades, setActiveUpgrades] = useState<any[]>([]);

  const [builderBaseBuilders, setBuilderBaseBuilders] = useState<Upgrade[]>([]);

  const params = useLocalSearchParams();
  const paramTag = params.tag as string | undefined;
  const effectiveTag = paramTag ?? activeTag;
  const account = accounts.find((a) => a.tag === effectiveTag);

  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  useEffect(() => {
    track("value_viewed", {
      has_upgrades: activeUpgrades.length > 0,
    });
  }, [activeUpgrades]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!effectiveTag) return;

    (async () => {
      const state = await getAccountState(effectiveTag);

      const bbBuilders = state.builders.builderBase;

      setBuilderBaseBuilders(bbBuilders);

      setActiveUpgrades([...state.builders.home, ...bbBuilders]);
    })();
  }, [effectiveTag]);

  const isLoadingAccounts = useAccountStore((s) => s.isLoadingAccounts);

  useEffect(() => {
    if (!isLoadingAccounts && effectiveTag && !account) {
      router.replace("/(tabs)");
    }
  }, [account, effectiveTag, isLoadingAccounts, router]);

  const {
    status,
    builderBaseStatus,
    remainingMs,
    nextUpgrade,
    builderBaseRemainingMs,
    builderBaseNextUpgrade,
  } = useMemo(() => {
    if (!account) {
      return {
        status: {
          maxBuilders: 0,
          busyBuilders: 0,
          freeBuilders: 0,
          freeNormal: 0,
          freeGoblin: 0,
          goblinBusy: false,
          allFree: true,
        },

        builderBaseStatus: {
          maxBuilders: 0,
          busyBuilders: 0,
          freeBuilders: 0,
          freeNormal: 0,
          freeGoblin: 0,
          goblinBusy: false,
          allFree: true,
        },

        nextUpgrade: null,
        remainingMs: 0,

        builderBaseNextUpgrade: null,
        builderBaseRemainingMs: 0,
      };
    }

    const homeBuilderUpgrades = activeUpgrades.filter(
      (u) => u.village === "home" && u.upgradeType === "BUILDER",
    );

    const builderStatus = getBuilderStatus({
      village: "home",
      normalBuilderCount: account.builderCount,
      goblinBuilderUnlocked: false,
      activeUpgrades,
    });

    const builderBaseStatus = getBuilderStatus({
      village: "builderBase",
      normalBuilderCount: account.builderBaseBuilderCount,
      goblinBuilderUnlocked: false,
      activeUpgrades,
    });

    const builderBaseNextUpgrade =
      builderBaseBuilders.length > 0
        ? builderBaseBuilders.reduce((prev, curr) =>
            prev.endTime < curr.endTime ? prev : curr,
          )
        : null;

    const builderBaseRemainingMs = builderBaseNextUpgrade
      ? Math.max(builderBaseNextUpgrade.endTime - Date.now(), 0)
      : 0;

    const next =
      homeBuilderUpgrades.length > 0
        ? homeBuilderUpgrades.reduce((prev: any, curr: any) =>
            prev.endTime! < curr.endTime! ? prev : curr,
          )
        : null;

    const remaining = next ? Math.max(next.endTime! - Date.now(), 0) : 0;

    return {
      status: builderStatus,
      builderBaseStatus,
      nextUpgrade: next,
      remainingMs: remaining,
      builderBaseRemainingMs,
      builderBaseNextUpgrade,
    };
  }, [account, activeUpgrades, builderBaseBuilders]);

  if (!account) {
    return null;
  }
  const totalBuilders = account.builderCount;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 🎉 SUCCESS HEADER */}
        <View style={styles.successHeader}>
          <View style={styles.checkmarkWrapper}>
            <View style={styles.checkmarkGlow} />
            <Ionicons name="checkmark-circle" size={64} color={HOME_COLORS.success} />
          </View>
          <Text style={styles.successTitle}>All Set!</Text>
          <Text style={styles.successSubtitle}>
            Your village is now being tracked
          </Text>
        </View>

        <View style={styles.dataSource}>
          <Text style={styles.dataSourceText}>
            ✅ Data imported from your village
          </Text>
        </View>

        {/* 🔹 PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileLeft}>
              <Text style={styles.profileName}>
                {profile?.playerName || account.name}
              </Text>
              {profile?.leagueTierIconUrl && (
                <Image
                  source={{ uri: profile.leagueTierIconUrl }}
                  style={styles.leagueIcon}
                />
              )}
              {profile?.playerTag && (
                <Text style={styles.playerTag}>{profile.playerTag}</Text>
              )}
            </View>
          </View>

          {profile && (
            <View style={styles.profileStats}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {/* XP */}
                {typeof profile.expLevel === "number" && (
                  <XPBadge level={profile.expLevel} />
                )}

                {/* Hall */}
                <Image
                  source={{
                    uri: resolveEntityIcon(1000001, {
                      village: "home",
                      level: profile.townHallLevel,
                    }),
                  }}
                  style={styles.statIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />

                {/* Trophies */}
                {typeof profile.trophies === "number" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Image
                      source={{
                        uri: `${ENV.CDN_BASE}/entities/other/trophy.png`,
                      }}
                      style={{
                        width: 15,
                        height: 15,
                      }}
                      contentFit="contain"
                    />
                    <Text style={styles.statText}>{profile.trophies}</Text>
                  </View>
                )}

                <View style={styles.verticalDivider} />

                <Image
                  source={{
                    uri: resolveEntityIcon(1000034, {
                      village: "builderBase",
                      level: profile.builderHallLevel,
                    }),
                  }}
                  style={styles.statIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />

                {/* Trophies */}
                {typeof profile.trophies === "number" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Image
                      source={{
                        uri: `${ENV.CDN_BASE}/entities/other/trophy.png`,
                      }}
                      style={{
                        width: 15,
                        height: 15,
                      }}
                      contentFit="contain"
                    />
                    <Text style={styles.statText}>
                      {profile.builderBaseTrophies}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* 🔥 BUILDER STATUS CARD */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusTitleMain}>Home Village</Text>
              <Text style={styles.statusSubText}>Based on active upgrades</Text>
              <Text style={styles.statusSubText}>
                Adjust builders in Settings if needed
              </Text>
              <View style={styles.infoBadge}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={HOME_COLORS.textSecondary}
                />
                <Text style={styles.infoText}>Auto</Text>
              </View>
            </View>
            <View style={styles.builderCount}>
              <Text style={styles.builderCountText}>
                {status.busyBuilders}/{totalBuilders}
              </Text>
            </View>
          </View>
          {status.allFree ? (
            <View style={styles.statusContent}>
              <View style={styles.alertIcon}>
                <Text style={styles.alertEmoji}>🚨</Text>
              </View>

              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>🚨 Builders Idle</Text>

                <Text style={styles.statusMessage}>Start an upgrade now</Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusContent}>
              <View style={styles.timerIcon}>
                {nextUpgrade ? (
                  <Image
                    source={{
                      uri: resolveEntityIcon(nextUpgrade.dataId, {
                        isCrafted: nextUpgrade.isCrafted,
                        subType: nextUpgrade.subType,
                        village: "home",
                        level: nextUpgrade.currentLevel,
                        moduleId: nextUpgrade.moduleId,
                        craftedModuleLevels: nextUpgrade.craftedModuleLevels,
                      }),
                    }}
                    style={{
                      width: 32,
                      height: 32,
                    }}
                  />
                ) : (
                  <Image
                    source={{
                      uri: `${ENV.CDN_BASE}/v2/home/fallbacks/builder-idle.png`,
                    }}
                    style={{ width: 32, height: 32 }}
                  />
                )}
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Next Builder Ready In</Text>
                <Text style={styles.statusTime}>
                  {formatCountdown(remainingMs)}
                </Text>
                <Text style={styles.statusMessage}>
                  {status.freeBuilders > 0
                    ? "Some builders are idle"
                    : "All builders are working"}
                </Text>
              </View>
            </View>
          )}

          {/* Builder Indicators */}
          <View style={styles.builderIndicators}>
            {Array.from({ length: totalBuilders }).map((_, i) => {
              const isBusy = activeUpgrades.some(
                (u) =>
                  u.village === "home" &&
                  u.upgradeType === "BUILDER" &&
                  u.builderSlot === i,
              );
              return (
                <View
                  key={i}
                  style={[
                    styles.builderDot,
                    isBusy ? styles.builderDotBusy : styles.builderDotFree,
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusTitleMain}>Builder Base</Text>

              <Text style={styles.statusSubText}>
                Active builder base upgrades
              </Text>
            </View>

            <View style={styles.builderCount}>
              <Text style={styles.builderCountText}>
                {builderBaseBuilders.length}/{account.builderBaseBuilderCount}
              </Text>
            </View>
          </View>

          <View style={styles.statusContent}>
            <View style={styles.timerIcon}>
              {builderBaseNextUpgrade?.dataId != null ? (
                <Image
                  source={{
                    uri: resolveEntityIcon(builderBaseNextUpgrade.dataId, {
                      isCrafted: builderBaseNextUpgrade.isCrafted,
                      subType: builderBaseNextUpgrade.subType,
                      village: "builderBase",
                      level: builderBaseNextUpgrade.currentLevel,
                      moduleId: builderBaseNextUpgrade.moduleId,
                      craftedModuleLevels: builderBaseNextUpgrade.craftedModuleLevels,
                    }),
                  }}
                  style={{
                    width: 32,
                    height: 32,
                  }}
                />
              ) : (
                <Image
                  source={{
                    uri: `${ENV.CDN_BASE}/v2/builder/fallbacks/master-builder-sleeping.png`,
                  }}
                  style={{
                    width: 32,
                    height: 32,
                  }}
                />
              )}
            </View>

            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {builderBaseStatus?.allFree
                  ? "🚨 Builders Idle"
                  : "Next Builder Ready In"}
              </Text>

              {builderBaseStatus?.allFree ? (
                <Text style={styles.statusMessage}>Start an upgrade now</Text>
              ) : (
                <>
                  <Text style={styles.statusTime}>
                    {formatCountdown(builderBaseRemainingMs)}
                  </Text>

                  <Text style={styles.statusMessage}>
                    {builderBaseStatus?.freeBuilders
                      ? `${builderBaseStatus.freeBuilders} builders available`
                      : "All builders are working"}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.builderIndicators}>
            {Array.from({
              length: account.builderBaseBuilderCount,
            }).map((_, i) => {
              const isBusy = builderBaseBuilders.some(
                (u) => u.builderSlot === i,
              );

              return (
                <View
                  key={i}
                  style={[
                    styles.builderDot,
                    isBusy ? styles.builderDotBusy : styles.builderDotFree,
                  ]}
                />
              );
            })}
          </View>
        </View>
        {activeUpgrades.length > 0 && (
          <View style={styles.liveCard}>
            <Text style={styles.liveTitle}>Active Upgrades</Text>

            {activeUpgrades.map((u) => {
              return (
                <View key={u.id} style={styles.liveRow}>
                  <View style={styles.liveIcon}>
                    <Image
                      source={{
                        uri: resolveEntityIcon(u.dataId, {
                          isCrafted: u.isCrafted,
                          subType: u.subType,
                          village: u.village,
                          level: u.currentLevel,
                          moduleId: u.moduleId,
                          craftedModuleLevels: u.craftedModuleLevels,
                        }),
                      }}
                      style={styles.liveImg}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.liveName}>{u.entity}</Text>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor:
                          u.village === "builderBase" ? HOME_COLORS.purple : HOME_COLORS.blueStrong,
                        borderRadius: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: HOME_COLORS.white,
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        {u.village === "builderBase" ? "BUILDER BASE" : "HOME"}
                      </Text>
                    </View>
                    <Text style={styles.liveTime}>
                      {formatCountdown(u.endTime - Date.now())}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {/* 📋 WHAT'S NEXT */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What&apos;s Next</Text>

          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="notifications" size={20} color={HOME_COLORS.gold} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Get Notified</Text>
                <Text style={styles.stepDescription}>
                  Enable notifications to know when builders are free
                </Text>
              </View>
            </View>

            {/* <View style={styles.stepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="refresh" size={20} color={HOME_COLORS.gold} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Stay Synced</Text>
                <Text style={styles.stepDescription}>
                  Sync your village regularly for accurate tracking
                </Text>
              </View>
            </View> */}

            <View style={styles.stepItem}>
              <View style={styles.stepIcon}>
                <Ionicons name="add-circle" size={20} color={HOME_COLORS.gold} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Track Upgrades</Text>
                <Text style={styles.stepDescription}>
                  Add upgrades manually or import from your village
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 🚀 CTA */}
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={HOME_COLORS.textDark} />
        </Pressable>

        {/* 💡 Tip */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={16} color={HOME_COLORS.gold} />
          <Text style={styles.tipText}>
            Tip: Add this app to your home screen for quick access
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HOME_COLORS.textDark,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 140,
  },

  successHeader: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 32,
  },

  dataSource: {
    alignItems: "center",
    marginBottom: 20,
  },

  dataSourceText: {
    fontSize: 13,
    color: HOME_COLORS.success,
    fontWeight: "600",
  },

  checkmarkWrapper: {
    position: "relative",
    marginBottom: 16,
  },

  checkmarkGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    top: -8,
    left: -8,
  },

  successTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: HOME_COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  successSubtitle: {
    fontSize: 16,
    color: HOME_COLORS.textSecondary,
    fontWeight: "500",
  },

  // Profile Card
  profileCard: {
    backgroundColor: HOME_COLORS.surfaceRaised,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: HOME_COLORS.slateMuted,
  },

  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
  },

  leagueIcon: {
    width: 24,
    height: 24,
  },

  profileStats: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: HOME_COLORS.slateMuted,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  verticalDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    marginHorizontal: 8,
  },

  statIcon: {
    width: 24,
    height: 24,
  },

  statEmoji: {
    fontSize: 16,
  },

  statText: {
    fontSize: 10,
    color: HOME_COLORS.textSecondary,
    fontWeight: "600",
  },

  playerTag: {
    marginTop: 10,
    fontSize: 12,
    color: HOME_COLORS.textMuted,
    fontWeight: "500",
  },

  statusCard: {
    backgroundColor: HOME_COLORS.surfaceRaised,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: HOME_COLORS.slateMuted,
  },

  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  statusTitleMain: {
    fontSize: 16,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
  },

  statusSubText: {
    fontSize: 10,
    color: HOME_COLORS.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },

  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: HOME_COLORS.slateMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },

  infoText: {
    fontSize: 11,
    color: HOME_COLORS.textSecondary,
    fontWeight: "600",
  },

  builderCount: {
    backgroundColor: HOME_COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  builderCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: HOME_COLORS.textDark,
  },

  statusContent: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },

  alertIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  alertEmoji: {
    fontSize: 32,
  },

  timerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  timerEmoji: {
    fontSize: 32,
  },

  statusInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },

  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
  },

  statusTime: {
    fontSize: 24,
    fontWeight: "800",
    color: HOME_COLORS.gold,
  },

  statusMessage: {
    fontSize: 13,
    color: HOME_COLORS.textSecondary,
    fontWeight: "500",
  },

  builderIndicators: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },

  builderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  builderDotFree: {
    backgroundColor: HOME_COLORS.success,
  },

  builderDotBusy: {
    backgroundColor: HOME_COLORS.slate,
  },

  liveCard: {
    backgroundColor: HOME_COLORS.surfaceRaised,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: HOME_COLORS.slateMuted,
  },

  liveTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
    marginBottom: 12,
  },

  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },

  liveIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(251,191,36,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  liveImg: {
    width: 24,
    height: 24,
  },

  liveName: {
    fontSize: 14,
    fontWeight: "600",
    color: HOME_COLORS.textPrimary,
  },

  liveTime: {
    fontSize: 12,
    color: HOME_COLORS.gold,
  },
  nextStepsCard: {
    backgroundColor: HOME_COLORS.surfaceRaised,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: HOME_COLORS.slateMuted,
  },

  nextStepsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
    marginBottom: 16,
  },

  stepsList: {
    gap: 16,
  },

  stepItem: {
    flexDirection: "row",
    gap: 14,
  },

  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  stepContent: {
    flex: 1,
    gap: 4,
  },

  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
  },

  stepDescription: {
    fontSize: 13,
    color: HOME_COLORS.textSecondary,
    lineHeight: 18,
  },

  // CTA Button
  cta: {
    flexDirection: "row",
    backgroundColor: HOME_COLORS.gold,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: HOME_COLORS.gold,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 16,
  },

  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    color: HOME_COLORS.textDark,
  },

  // Tip Card
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },

  tipText: {
    fontSize: 13,
    color: HOME_COLORS.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
});
