import { ENV } from "@/config/env";
import { PlayerFull } from "@/types/playerFull";
import { EntityRecord } from "@/types/upgrade";
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

export default function ProfileHeroCard({
  data,
  helpers,
  guardians,
}: {
  data: PlayerFull;
  helpers: EntityRecord[];
  guardians: EntityRecord[];
}) {
  const hasLabels = !!data.labels && data.labels.length > 0;
  const hasHelpers = helpers.length > 0;
  const hasGuardians = guardians.length > 0;
  const hasBuilderBase = !!data.builderHallLevel;
  const warReady = data.warPreference === "in";

  return (
    <View style={styles.container}>
      {/* ── Identity ── */}
      <View style={styles.topRow}>
        <View style={styles.nameSection}>
          <Text style={styles.name} numberOfLines={1}>
            {data.name}
          </Text>

          <View style={styles.tagRow}>
            <View style={styles.tagChip}>
              <Text style={styles.tag}>{data.tag}</Text>
            </View>
            {!!data.expLevel && <XPBadge level={data.expLevel} />}

            <View
              style={[styles.warBadge, warReady ? styles.warIn : styles.warOut]}
            >
              <Ionicons
                name={warReady ? "flame" : "pause"}
                size={11}
                color={warReady ? "#22c55e" : "#ef4444"}
              />
              <Text
                style={[
                  styles.warText,
                  warReady ? styles.warTextIn : styles.warTextOut,
                ]}
              >
                {warReady ? "War ready" : "Opted out"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.hallStack}>
          <View style={styles.hallPill}>
            <Image
              source={{
                uri: resolveEntityIcon(1000001, {
                  village: "home",
                  level: data.townHallLevel,
                }),
              }}
              style={styles.hallIcon}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text style={styles.hallLevel}>TH {data.townHallLevel}</Text>
          </View>

          {hasBuilderBase && (
            <View style={[styles.hallPill, styles.hallPillBuilder]}>
              <Image
                source={{
                  uri: resolveEntityIcon(1000034, {
                    village: "builderBase",
                    level: data.builderHallLevel,
                  }),
                }}
                style={styles.hallIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <Text style={[styles.hallLevel, { color: BUILDER }]}>
                BH {data.builderHallLevel}
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
                source={{
                  uri:
                    data.leagueTier?.iconUrls.large ??
                    data.leagueTier?.iconUrls.small ??
                    data.league?.iconUrls.small,
                }}
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
                {data.leagueTier?.name ?? data.league?.name ?? "Unranked"}
              </Text>
            </View>
          </View>

          <View style={styles.trophyLine}>
            <Image
              source={{ uri: `${ENV.CDN_BASE}/entities/other/trophy.png` }}
              style={styles.trophyIcon}
              contentFit="contain"
            />
            <Text style={styles.trophyText}>{data.trophies}</Text>
          </View>

          <View style={styles.bestRow}>
            <Text style={styles.bestText}>Legacy best {data.bestTrophies}</Text>
            <Image
              source={{
                uri:
                  data.league?.iconUrls.small ?? data.league?.iconUrls.medium,
              }}
              style={styles.smallLeagueIcon}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
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
                      data.builderBaseLeague?.id,
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
                  {data.builderBaseLeague?.name ?? "Unranked"}
                </Text>
              </View>
            </View>

            <View style={styles.trophyLine}>
              <Image
                source={{ uri: `${ENV.CDN_BASE}/entities/other/trophy.png` }}
                style={styles.trophyIcon}
                contentFit="contain"
              />
              <Text style={styles.trophyText}>{data.builderBaseTrophies}</Text>
            </View>

            <View style={styles.bestRow}>
              <Text style={styles.bestText}>
                Best {data.bestBuilderBaseTrophies}
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
      {!!data.clan && (
        <View style={styles.clanCard}>
          {!!data.clan.badgeUrls.medium && (
            <View style={styles.clanBadgeWrapper}>
              <Image
                source={{ uri: data.clan.badgeUrls.medium }}
                style={styles.clanBadge}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          )}

          <View style={styles.clanContent}>
            <Text style={styles.clanName} numberOfLines={1}>
              {data.clan.name}
            </Text>

            <View style={styles.clanMeta}>
              <View style={styles.clanLevelBadge}>
                <Text style={styles.clanLevelText}>
                  Lv {data.clan.clanLevel}
                </Text>
              </View>
              {!!data.role && (
                <Text style={styles.clanRole} numberOfLines={1}>
                  {data.role.charAt(0).toUpperCase() + data.role.slice(1)}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.clanTag}>{data.clan.tag}</Text>
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

              {helpers.map((helper) => (
                <View
                  key={`helper-${helper.id}`}
                  style={[styles.chip, styles.helperChip]}
                >
                  <Image
                    source={{ uri: resolveEntityIcon(helper.dataId) }}
                    style={styles.chipIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text style={styles.helperLevel}>Lv {helper.level}</Text>
                </View>
              ))}
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

              {data.labels?.map((label, i) => (
                <View key={i} style={[styles.chip, styles.labelChip]}>
                  {!!label.iconUrls?.small && (
                    <Image
                      source={{ uri: label.iconUrls.small }}
                      style={styles.chipIcon}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  )}
                  <Text style={styles.labelText} numberOfLines={1}>
                    {label.name}
                  </Text>
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
    marginBottom: 12,
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
  name: {
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
  tag: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    fontFamily: MONO,
  },

  // War status — compact pill inline with tag row
  warBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  warIn: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  warOut: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  warText: {
    fontSize: 10,
    fontWeight: "700",
  },
  warTextIn: {
    color: "#22c55e",
  },
  warTextOut: {
    color: "#ef4444",
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
    maxWidth: 140,
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
  labelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#a78bfa",
  },
});
