import ArmySection from "@/components/Profile/ArmySection";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import StatsGrid from "@/components/Profile/StatsGrid";
import ProfileHeroCard from "@/components/Profile/ProfileHeroCard";
import ProgressSection from "@/components/Profile/ProgressSection";
import { fetchFullPlayer } from "@/services/clashApi";
import {
  getCachedPlayerProfile,
  saveCachedPlayerProfile,
} from "@/services/playerProfileCacheService";
import { getEntities } from "@/services/entityService";
import { useAccountStore } from "@/stores/accountStore";
import { PlayerFull } from "@/types/playerFull";
import { EntityRecord } from "@/types/upgrade";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<PlayerFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTag = useAccountStore((s) => s.activeTag);
  const [entities, setEntities] = useState<EntityRecord[]>([]);

  useEffect(() => {
    track("screen_view", { screen: "profile" });
  }, []);

  const loadRequestId = useRef(0);

  const loadProfile = useCallback(async (forceRefresh = false) => {
    const requestId = ++loadRequestId.current;
    const playerTag = activeTag;

    try {
      setLoading(true);
      setError(null);

      if (!playerTag) {
        setData(null);
        setEntities([]);
        setError("No player tag found");
        return;
      }

      // Read local SQLite first. A cached profile prevents an automatic network
      // request whenever this screen mounts or the active account changes.
      if (!forceRefresh) {
        const cached = await getCachedPlayerProfile(playerTag);
        if (requestId !== loadRequestId.current) return;

        if (cached) {
          setData(cached.profile);
          const entityData = await getEntities(playerTag);
          if (requestId === loadRequestId.current) {
            setEntities(entityData);
          }
          return;
        }
      }

      track("player_fetching", {
        source: getSessionSource(),
        trigger: forceRefresh ? "profile_refresh" : "profile_cache_miss",
      });

      const playerData = await fetchFullPlayer(playerTag);
      if (requestId !== loadRequestId.current) return;

      setData(playerData);

      // A cache write failure should not discard a successful live API response.
      try {
        await saveCachedPlayerProfile(playerTag, playerData);
      } catch (cacheError) {
        console.warn("Failed to cache player profile:", cacheError);
      }

      const entityData = await getEntities(playerTag);
      if (requestId !== loadRequestId.current) return;

      track("player_fetching_success", {
        source: getSessionSource(),
        trigger: forceRefresh ? "profile_refresh" : "profile_cache_miss",
      });

      setEntities(entityData);
    } catch (err) {
      if (requestId !== loadRequestId.current) return;

      track("player_fetching_failed", {
        source: getSessionSource(),
        trigger: forceRefresh ? "profile_refresh" : "profile_screen",
        error: err,
      });
      setError(err instanceof Error ? err.message : "Failed to load profile");
      console.error("Profile load error:", err);
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [activeTag]);

  useEffect(() => {
    setData(null);
    setEntities([]);
    setError(null);
    void loadProfile();
  }, [activeTag, loadProfile]);

  const onRefresh = async () => {
    track("profile_refresh", {
      source: getSessionSource(),
    });
    setRefreshing(true);
    await loadProfile(true);
    setRefreshing(false);
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size={44} color={colors.gold} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={32} color={colors.danger} />
        </View>
        <Text style={styles.errorTitle}>Couldn&apos;t load profile</Text>
        <Text style={styles.errorText}>
          {error || "Failed to load profile"}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={loadProfile}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="refresh" size={15} color={colors.textDark} />
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const helpers = entities.filter((e) => e.type?.toLowerCase() === "helper");
  const guardians = entities.filter(
    (e) => e.type?.toLowerCase() === "guardian",
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 10 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textBright} />
          </Pressable>

          <Text style={styles.headerTitle}>Profile</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ProfileHeroCard data={data} helpers={helpers} guardians={guardians} />
        <StatsGrid
          title="Battle stats"
          stats={[
            {
              icon: "star",
              label: "War stars",
              value: data.warStars,
              highlight: true,
            },
            {
              icon: "flame",
              label: "Attacks won",
              value: data.attackWins,
              color: colors.orange,
            },
            {
              icon: "shield-checkmark",
              label: "Defenses won",
              value: data.defenseWins,
              color: colors.cyan,
            },
            {
              icon: "arrow-up",
              label: "Donated",
              value: data.donations,
              color: colors.success,
            },
            {
              icon: "arrow-down",
              label: "Received",
              value: data.donationsReceived,
              color: colors.blue,
            },
          ]}
        />

        <ArmySection data={data} />

        <ProgressSection data={data} />

        <View style={styles.footer}>
          <Ionicons name="checkmark-circle" size={13} color={colors.success} />
          <Text style={styles.footerText}>Synced from Clash of Clans API</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 14,
  },

  pressed: {
    opacity: 0.6,
  },

  // ── Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gold,
    letterSpacing: -0.4,
  },

  headerSpacer: {
    width: 36,
  },

  // ── Loading ─────────────────────────────────────────────
  loadingWrapper: {
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  // ── Error ───────────────────────────────────────────────
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 5,
  },

  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
  },

  retryButtonText: {
    color: colors.textDark,
    fontWeight: "800",
    fontSize: 13,
  },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 5,
    marginTop: 2,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },

  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
