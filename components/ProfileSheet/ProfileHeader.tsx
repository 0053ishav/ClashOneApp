import { ENV } from "@/config/env";
import { PlayerProfile } from "@/types/player";
import { EntityRecord } from "@/types/upgrade";
import { formatCountdown } from "@/utils/formatCountdown";
import {
  resolveBuilderBaseLeagueIcon,
  resolveEntityIcon,
} from "@/utils/icons/resolveEntityIcon";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Platform, StyleSheet, Text, View } from "react-native";
import { XPBadge } from "../XPBadge";

const HOME = "#38bdf8";
const BUILDER = "#c084fc";
const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

export default function ProfileHeader({
  profile,
  helpers,
  guardians,
}: {
  profile: PlayerProfile;
  helpers: EntityRecord[];
  guardians: EntityRecord[];
}) {
  if (!profile.playerTag) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="person-outline" size={30} color="#64748b" />
        </View>
        <Text style={styles.emptyTitle}>No account synced</Text>
        <Text style={styles.emptySubtitle}>
          Import village JSON to sync your profile
        </Text>
      </View>
    );
  }

  const hasHelpers = helpers.length > 0;
  const hasGuardians = guardians.length > 0;
  const hasLabels = !!profile.labels && profile.labels.length > 0;
  const hasBuilderBase = !!profile.builderHallLevel;

  return (
    <View style={styles.container}>
      {/* ── Identity ── */}
      <View style={styles.topRow}>
        <View style={styles.nameSection}>
          <Text style={styles.playerName} numberOfLines={1}>
            {profile.playerName || "Chief"}
          </Text>

          <View style={styles.tagRow}>
            <View style={styles.tagChip}>
              <Text style={styles.playerTag}>{profile.playerTag}</Text>
            </View>
            {!!profile.expLevel && <XPBadge level={profile.expLevel} />}
          </View>
        </View>

        <View style={styles.hallStack}>
          <View style={styles.hallPill}>
            <Image
              source={{
                uri: resolveEntityIcon(1000001, {
                  village: "home",
                  level: profile.townHallLevel,
                }),
              }}
              style={styles.hallIcon}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text style={styles.hallLevel}>TH {profile.townHallLevel}</Text>
          </View>

          {hasBuilderBase && (
            <View style={[styles.hallPill, styles.hallPillBuilder]}>
              <Image
                source={{
                  uri: resolveEntityIcon(1000034, {
                    village: "builderBase",
                    level: profile.builderHallLevel,
                  }),
                }}
                style={styles.hallIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Text style={[styles.hallLevel, { color: BUILDER }]}>
                BH {profile.builderHallLevel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Dual village ── */}
      <View style={styles.villageRow}>
        {/* Home */}
        <View style={[styles.villageCard, styles.villageCardHome]}>
          <View style={[styles.accentBar, { backgroundColor: HOME }]} />

          <View style={styles.villageHeader}>
            <View style={[styles.leagueIconWrap, styles.leagueIconWrapHome]}>
              <Image
                source={{ uri: profile.leagueTierIconUrl }}
                style={styles.leagueIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>

            <View style={styles.villageHeaderText}>
              <Text style={[styles.villageLabel, { color: HOME }]}>Home</Text>
              <Text
                style={[styles.villageLeagueName, { color: "#7dd3fc" }]}
                numberOfLines={2}
              >
                {profile.leagueTierName ?? "Unranked"}
              </Text>
            </View>
          </View>

          <View style={styles.trophyLine}>
            <Image
              source={{ uri: `${ENV.CDN_BASE}/entities/other/trophy.png` }}
              style={styles.trophyIcon}
              contentFit="contain"
            />
            <Text style={styles.trophyText}>{profile.trophies ?? 0}</Text>
          </View>

          <View style={styles.bestRow}>
            <Text style={styles.bestText}>
              Legacy best {profile.bestTrophies ?? 0}
            </Text>

            {!!profile.leagueIconUrl && (
              <Image
                source={{ uri: profile.leagueIconUrl }}
                style={styles.smallLeagueIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            )}
          </View>
        </View>

        <View style={styles.villageDivider} />

        {/* Builder Base */}
        {hasBuilderBase ? (
          <View style={[styles.villageCard, styles.villageCardBuilder]}>
            <View style={[styles.accentBar, { backgroundColor: BUILDER }]} />

            <View style={styles.villageHeader}>
              <View
                style={[styles.leagueIconWrap, styles.leagueIconWrapBuilder]}
              >
                <Image
                  source={{
                    uri: resolveBuilderBaseLeagueIcon(
                      profile.builderBaseLeague?.id,
                    ),
                  }}
                  style={styles.leagueIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>

              <View style={styles.villageHeaderText}>
                <Text style={[styles.villageLabel, { color: BUILDER }]}>
                  Builder
                </Text>
                <Text
                  style={[styles.villageLeagueName, { color: "#d8b4fe" }]}
                  numberOfLines={2}
                >
                  {profile.builderBaseLeague?.name ?? "Unranked"}
                </Text>
              </View>
            </View>

            <View style={styles.trophyLine}>
              <Image
                source={{ uri: `${ENV.CDN_BASE}/entities/other/trophy.png` }}
                style={styles.trophyIcon}
                contentFit="contain"
              />
              <Text style={styles.trophyText}>
                {profile.builderBaseTrophies ?? 0}
              </Text>
            </View>

            <View style={styles.bestRow}>
              <Text style={styles.bestText}>
                Best {profile.bestBuilderBaseTrophies ?? 0}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.villageCard, styles.villageCardBuilderEmpty]}>
            <Ionicons name="construct-outline" size={20} color="#475569" />
            <Text style={styles.villageEmptyText}>No Builder Base</Text>
          </View>
        )}
      </View>

      {/* ── Clan ── */}
      {!!profile.clanName && (
        <View style={styles.clanCard}>
          {!!profile.clanBadgeUrl && (
            <View style={styles.clanBadgeWrapper}>
              <Image
                source={{ uri: profile.clanBadgeUrl }}
                style={styles.clanBadge}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          )}

          <View style={styles.clanContent}>
            <Text style={styles.clanName} numberOfLines={1}>
              {profile.clanName}
            </Text>

            <View style={styles.clanMeta}>
              {!!profile.clanLevel && (
                <View style={styles.clanLevelBadge}>
                  <Text style={styles.clanLevelText}>
                    Lv {profile.clanLevel}
                  </Text>
                </View>
              )}
              {!!profile.role && (
                <Text style={styles.clanRole} numberOfLines={1}>
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.clanTag}>{profile.clanTag}</Text>
        </View>
      )}

      {/* ── Helpers, guardians, labels — one compact panel ── */}
      {(hasHelpers || hasGuardians || hasLabels) && (
        <View style={styles.extrasPanel}>
          {hasHelpers && (
            <View style={styles.extrasRow}>
              <View style={styles.caption}>
                <Ionicons name="hammer" size={13} color="#f97316" />
                <Text style={styles.captionText}>Helpers</Text>
              </View>

              {helpers.map((helper) => {
                const cooling =
                  typeof helper.cooldown === "number" && helper.cooldown > 0;

                return (
                  <View
                    key={`helper-${helper.id}`}
                    accessible
                    accessibilityLabel={`Helper level ${helper.level}, ${
                      cooling ? "on cooldown" : "ready"
                    }`}
                    style={[styles.chip, styles.helperChip]}
                  >
                    <Image
                      source={{ uri: resolveEntityIcon(helper.dataId) }}
                      style={styles.chipIcon}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                    <Text style={styles.helperLevel}>Lv {helper.level}</Text>

                    {cooling ? (
                      <View style={styles.cooldownInline}>
                        <Ionicons
                          name="time-outline"
                          size={11}
                          color="#f87171"
                        />
                        <Text style={styles.cooldownText}>
                          {formatCountdown(helper.cooldown as number)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.readyDot} />
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {hasGuardians && (
            <View style={styles.extrasRow}>
              <View style={styles.caption}>
                <Ionicons name="shield" size={13} color="#06b6d4" />
                <Text style={styles.captionText}>Guardians</Text>
              </View>

              {guardians.map((guardian) => (
                <View
                  key={`guardian-${guardian.id}`}
                  style={[styles.chip, styles.guardianChip]}
                >
                  <Image
                    source={{ uri: resolveEntityIcon(guardian.dataId) }}
                    style={styles.chipIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text style={styles.guardianLevel}>Lv {guardian.level}</Text>
                </View>
              ))}
            </View>
          )}

          {hasLabels && (
            <View style={styles.extrasRow}>
              <View style={styles.caption}>
                <Ionicons name="pricetag" size={13} color="#a78bfa" />
                <Text style={styles.captionText}>Labels</Text>
              </View>

              {profile.labels!.slice(0, 4).map((label, index) => (
                <View key={index} style={[styles.chip, styles.labelChip]}>
                  <Image
                    source={{ uri: label.iconUrl }}
                    style={styles.chipIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111c2e",
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#263449",
  },

  // ── Empty ───────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
    marginBottom: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },

  // ── Identity ────────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  nameSection: {
    flex: 1,
    gap: 6,
  },
  playerName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fbbf24",
    letterSpacing: -0.5,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  tagChip: {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 7,
  },
  playerTag: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    fontFamily: MONO,
  },

  // Hall badges: compact pills stacked on the right
  hallStack: {
    gap: 6,
  },
  hallPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 5,
    paddingRight: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(251, 191, 36, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
  },
  hallPillBuilder: {
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  hallIcon: {
    width: 24,
    height: 24,
  },
  hallLevel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fbbf24",
  },

  // ── Dual village ────────────────────────────────────────
  villageRow: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#263449",
  },
  villageCard: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 9,
    gap: 6,
  },
  villageCardHome: {
    backgroundColor: "rgba(56, 189, 248, 0.06)",
  },
  villageCardBuilder: {
    backgroundColor: "rgba(192, 132, 252, 0.06)",
  },
  villageCardBuilderEmpty: {
    backgroundColor: "rgba(71, 85, 105, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  villageDivider: {
    width: 1,
    backgroundColor: "rgba(51, 65, 85, 0.8)",
  },
  villageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 38, // keeps both cards aligned when a league name wraps
  },
  villageHeaderText: {
    flex: 1,
    gap: 1,
  },
  leagueIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  leagueIconWrapHome: {
    backgroundColor: "rgba(14, 165, 233, 0.16)",
  },
  leagueIconWrapBuilder: {
    backgroundColor: "rgba(168, 85, 247, 0.16)",
  },
  leagueIcon: {
    width: 26,
    height: 26,
  },
  villageLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  villageLeagueName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
  trophyLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trophyIcon: {
    width: 17,
    height: 17,
  },
  trophyText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.4,
  },
  bestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bestText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  smallLeagueIcon: {
    width: 15,
    height: 15,
  },
  villageEmptyText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },

  // ── Clan ────────────────────────────────────────────────
  clanCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(34, 197, 94, 0.05)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.18)",
  },
  clanBadgeWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  clanBadge: {
    width: 30,
    height: 27,
  },
  clanContent: {
    flex: 1,
    gap: 3,
  },
  clanName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4ade80",
    letterSpacing: -0.2,
  },
  clanMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clanLevelBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  clanLevelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#22c55e",
  },
  clanRole: {
    fontSize: 11,
    color: "#cbd5e1",
    fontWeight: "600",
    flexShrink: 1,
  },
  clanTag: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    fontFamily: MONO,
  },

  // ── Helpers / guardians / labels ────────────────────────
  extrasPanel: {
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
  },
  extrasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  caption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 76,
  },
  captionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#cbd5e1",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
  },
  chipIcon: {
    width: 20,
    height: 20,
  },
  helperChip: {
    backgroundColor: "rgba(249, 115, 22, 0.12)",
  },
  guardianChip: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
  },
  labelChip: {
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    paddingHorizontal: 5,
  },
  helperLevel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fb923c",
  },
  guardianLevel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#22d3ee",
  },
  cooldownInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cooldownText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f87171",
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
});
