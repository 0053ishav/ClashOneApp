import ArmySection from "@/components/Profile/ArmySection";
import BattleStatsGrid from "@/components/Profile/BattleStatsGrid";
import ProfileHeroCard from "@/components/Profile/ProfileHeroCard";
import ProgressSection from "@/components/Profile/ProgressSection";
import { fetchFullPlayer } from "@/services/clashApi";
import { getEntities } from "@/services/entityService";
import { useAccountStore } from "@/stores/accountStore";
import { PlayerFull } from "@/types/playerFull";
import { EntityRecord } from "@/types/upgrade";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!activeTag) {
        setError("No player tag found");
        return;
      }
      track("player_fetching", {
        source: getSessionSource(),
        trigger: "profile_screen",
      });

      const playerData = await fetchFullPlayer(activeTag);
      const entityData = await getEntities(activeTag);

      track("player_fetching_success", {
        source: getSessionSource(),
        trigger: "profile_screen",
      });

      setData(playerData);
      setEntities(entityData);
    } catch (err) {
      track("player_fetching_failed", {
        source: getSessionSource(),
        trigger: "profile_screen",
        error: err,
      });
      setError(err instanceof Error ? err.message : "Failed to load profile");
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTag]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = async () => {
    track("profile_refresh", {
      source: getSessionSource(),
    });
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size={44} color="#fbbf24" />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={32} color="#ef4444" />
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
          <Ionicons name="refresh" size={15} color="#0f172a" />
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
            tintColor="#fbbf24"
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
            <Ionicons name="chevron-back" size={20} color="#f8fafc" />
          </Pressable>

          <Text style={styles.headerTitle}>Profile</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ProfileHeroCard data={data} helpers={helpers} guardians={guardians} />
        <BattleStatsGrid data={data} />

        <ArmySection data={data} />

        <ProgressSection data={data} />

        <View style={styles.footer}>
          <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
          <Text style={styles.footerText}>Synced from Clash of Clans API</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
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
    backgroundColor: "#111c2e",
    borderWidth: 1,
    borderColor: "#263449",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fbbf24",
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
    color: "#94a3b8",
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
    color: "#f1f5f9",
    marginBottom: 5,
  },

  errorText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
  },

  retryButtonText: {
    color: "#0f172a",
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
    color: "#94a3b8",
    fontWeight: "500",
  },
});
