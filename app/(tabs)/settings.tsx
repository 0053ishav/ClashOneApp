import { ConfirmModal } from "@/components/ConfirmModal";
import {
  GoldPassBoostButton,
  GoldPassBoostQuickPanel,
} from "@/components/goldPass/GoldPassBoostQuickPanel";
import { getDB } from "@/db/database";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import {
  updateAccountColor,
  updateBuilderCount,
} from "@/services/accountService";
import { getAccountState } from "@/services/accountStateService";
import {
  getGoldPassBoostSettings,
  saveGoldPassBoostSettings as persistGoldPassBoostSettings,
} from "@/services/goldPassBoostService";
import { resetLastJsonSync } from "@/storage/jsonSyncStorage";
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from "@/storage/notificationConfig";
import {
  savePlayerProfile,
  updateLocalBuilderCount,
} from "@/storage/playerProfile";
import { useAccountStore } from "@/stores/accountStore";
import type { GoldPassBoostSettings } from "@/types/goldPass";
import { track } from "@/utils/analytics/analytics";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import { resyncNotifications } from "@/utils/notificationSync";
import * as Application from "expo-application";

import { ChiefCard } from "@/components/ChiefCard";
import { SupportModal } from "@/components/SupportModal";
import { XPBadge } from "@/components/XPBadge";
import { ENV } from "@/config/env";
import { requestNotificationPermissions } from "@/services/notifications/notificationPermissions";
import { restorePurchases } from "@/services/revenueCat/purchase";
import { buildSupportInfo } from "@/services/supportDebugInfo";
import { usePremiumStore } from "@/stores/premiumStore";
import {
  startSmartWidgetScheduler,
  stopSmartWidgetScheduler,
} from "@/utils/scheduleWidgetRefresh";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { Children, useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

const GOLD = "#fbbf24";
const RED = "#ef4444";
const MIN_BUILDERS = 1;
const MAX_BUILDERS = 6;

type GoldPassBoostField = "builderBoostPercent" | "researchBoostPercent";
type GoldPassBoostUpdates = Partial<
  Pick<GoldPassBoostSettings, GoldPassBoostField>
>;

const ACCOUNT_COLORS = [
  "#fbbf24", // amber
  "#60a5fa", // blue
  "#34d399", // green
  "#f472b6", // pink
  "#a78bfa", // purple
  "#fb923c", // orange
  "#22d3ee", // cyan
  "#f87171", // red
];

async function insertTestUpgrade({
  tag,
  type,
  delayMs,
}: {
  tag: string;
  type: "BUILDER" | "LAB" | "PET";
  delayMs: number;
}) {
  const db = await getDB();
  const now = Date.now();

  const entityType =
    type === "BUILDER" ? "BUILDING" : type === "LAB" ? "LAB" : "PET";

  await db.runAsync(
    `INSERT INTO upgrades (
      id,
      account_player_tag,
      data_id,
      entity,
      type,
      upgrade_type,
      builder_slot,
      builder_type,
      lab_slot,
      start_time,
      duration_minutes,
      finish_timestamp,
      is_completed,
      source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Math.random().toString(),
      tag,
      999,
      "Test Upgrade",

      entityType, // ✅ FIXED
      type, // upgradeType

      type === "BUILDER" ? "99" : null,
      type === "BUILDER" ? "NORMAL" : null,

      type === "LAB" ? "NORMAL" : null, // ✅ CRITICAL

      now,
      Math.ceil(delayMs / 60000),
      now + delayMs,
      0,
      "DEV",
    ],
  );
  return db.getAllSync(
    `SELECT * FROM upgrades WHERE account_player_tag = ? ORDER BY start_time DESC LIMIT 1`,
    [tag],
  );
}

/* ────────────────────────────────────────────────────────────
 * Building blocks: Section (grouped card) + Row (list item)
 * ──────────────────────────────────────────────────────────── */

function Section({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const items = Children.toArray(children);

  return (
    <View style={styles.section}>
      {!!title && <Text style={styles.sectionTitle}>{title}</Text>}

      <View style={styles.group}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 && <View style={styles.divider} />}
            {child}
          </View>
        ))}
      </View>

      {!!footer && <Text style={styles.sectionFooter}>{footer}</Text>}
    </View>
  );
}

interface RowProps {
  title: string;
  /** Text, or a custom node for richer meta lines. */
  subtitle?: React.ReactNode;
  icon?: IconName;
  iconColor?: string;
  /** Replaces the icon chip (avatars, images). */
  leading?: React.ReactNode;
  /** Inline next to the title (badges). */
  titleAccessory?: React.ReactNode;
  /** Muted text at the trailing edge. */
  value?: string;
  /** Custom trailing node (switch, stepper, buttons). */
  right?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}

function Row({
  title,
  subtitle,
  icon,
  iconColor = GOLD,
  leading,
  titleAccessory,
  value,
  right,
  chevron,
  destructive,
  onPress,
  onLongPress,
  accessibilityLabel,
}: RowProps) {
  const tint = destructive ? RED : iconColor;
  const interactive = !!onPress || !!onLongPress;

  return (
    <Pressable
      disabled={!interactive}
      accessibilityRole={interactive ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {leading ??
        (icon && (
          <View style={[styles.iconChip, { backgroundColor: tint + "26" }]}>
            <Ionicons name={icon} size={17} color={tint} />
          </View>
        ))}

      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text
            style={[styles.rowTitle, destructive && { color: RED }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {titleAccessory}
        </View>

        {typeof subtitle === "string" ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>

      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      {right}
      {chevron && <Ionicons name="chevron-forward" size={16} color="#475569" />}
    </Pressable>
  );
}

function IconButton({
  icon,
  color = "#64748b",
  active,
  label,
  onPress,
}: {
  icon: IconName;
  color?: string;
  active?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? "#0f172a" : color} />
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────
 * Screen
 * ──────────────────────────────────────────────────────────── */

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const switchAccount = useAccountStore((s) => s.switchAccount);
  const removeAccount = useAccountStore((s) => s.removeAccount);
  const setProfile = useAccountStore((s) => s.setProfile);
  const widgetPrefs = useAccountStore((s) => s.widgetPrefs);
  const setWidgetAccount = useAccountStore((s) => s.setWidgetAccount);
  const activeTag = useAccountStore((s) => s.activeTag);

  const [goldPassSettings, setGoldPassSettings] =
    useState<GoldPassBoostSettings | null>(null);
  const [isLoadingGoldPassSettings, setIsLoadingGoldPassSettings] =
    useState(false);
  const [goldPassSettingsLoadFailed, setGoldPassSettingsLoadFailed] =
    useState(false);
  const [isSavingGoldPassSettings, setIsSavingGoldPassSettings] =
    useState(false);
  const [goldPassReloadKey, setGoldPassReloadKey] = useState(0);
  const [showGoldPassPopover, setShowGoldPassPopover] = useState(false);

  const activeGoldPassSettings =
    goldPassSettings?.accountTag === activeTag ? goldPassSettings : null;

  const { profile } = usePlayerProfile();
  const activeAccount = accounts.find((a) => a.tag === activeTag);
  const isPremium = usePremiumStore((s) => s.isPremium);
  const dbBuilderCount = activeAccount?.builderCount ?? 1;

  const [localBuilderCount, setLocalBuilderCount] =
    useState<number>(dbBuilderCount);

  const [localNotificationsEnabled, setLocalNotificationsEnabled] =
    useState(false);
  const [showResetAccountModal, setShowResetAccountModal] = useState(false);
  const [showClearUpgradesModal, setShowClearUpgradesModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<
    (typeof accounts)[0] | null
  >(null);
  const [editColorFor, setEditColorFor] = useState<(typeof accounts)[0] | null>(
    null,
  );
  const [showBuilderErrorModal, setShowBuilderErrorModal] = useState(false);
  const [requiredBuilders, setRequiredBuilders] = useState(0);
  const loadLastSync = useAccountStore((s) => s.loadLastSync);
  const lastJsonSyncMap = useAccountStore((s) => s.lastJsonSyncMap);
  const lastSync = activeTag ? lastJsonSyncMap[activeTag] : null;

  const widgetTag = widgetPrefs.selectedAccountTag ?? activeTag;

  const [showSupport, setShowSupport] = useState(false);

  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    track("screen_view", { screen: "settings" });
  }, []);

  useEffect(() => {
    loadAccounts();
    loadLastSync();
  }, [loadAccounts, loadLastSync]);

  useEffect(() => {
    const acc = accounts.find((a) => a.tag === activeTag);
    if (!acc) return;

    setLocalBuilderCount(acc.builderCount);
  }, [accounts, activeTag]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!activeTag) {
        setGoldPassSettings(null);
        setIsLoadingGoldPassSettings(false);
        setGoldPassSettingsLoadFailed(false);
        return () => {
          cancelled = true;
        };
      }

      setIsLoadingGoldPassSettings(true);
      setGoldPassSettingsLoadFailed(false);

      void getGoldPassBoostSettings(activeTag)
        .then((settings) => {
          if (!cancelled) setGoldPassSettings(settings);
        })
        .catch(() => {
          if (!cancelled) setGoldPassSettingsLoadFailed(true);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingGoldPassSettings(false);
        });

      return () => {
        cancelled = true;
      };
    }, [activeTag, goldPassReloadKey]),
  );

  useEffect(() => {
    setLocalNotificationsEnabled(getNotificationsEnabled());
  }, []);

  const saveGoldPassUpdates = async (updates: GoldPassBoostUpdates) => {
    if (!activeTag || !activeGoldPassSettings || isSavingGoldPassSettings) {
      return;
    }

    const nextSettings: GoldPassBoostSettings = {
      accountTag: activeTag,
      builderBoostPercent:
        updates.builderBoostPercent ??
        activeGoldPassSettings.builderBoostPercent,
      researchBoostPercent:
        updates.researchBoostPercent ??
        activeGoldPassSettings.researchBoostPercent,
    };

    if (
      nextSettings.builderBoostPercent ===
        activeGoldPassSettings.builderBoostPercent &&
      nextSettings.researchBoostPercent ===
        activeGoldPassSettings.researchBoostPercent
    ) {
      return;
    }

    setIsSavingGoldPassSettings(true);
    try {
      await persistGoldPassBoostSettings(nextSettings);
      if (useAccountStore.getState().activeTag === activeTag) {
        setGoldPassSettings(nextSettings);
      }
    } catch {
      Alert.alert(
        "Couldn't save Gold Pass settings",
        "Your saved percentages haven't changed. Please try again.",
      );
    } finally {
      setIsSavingGoldPassSettings(false);
    }
  };

  const handleBuilderSelect = async (count: number) => {
    if (!activeTag || !activeAccount) return;

    const current = activeAccount.builderCount;

    const busyBuilders = (await getAccountState(activeTag)).builders.home
      .length;

    if (count < busyBuilders) {
      setRequiredBuilders(busyBuilders);
      setShowBuilderErrorModal(true);
      return;
    }

    setLocalBuilderCount(count);

    if (count !== current) {
      await updateBuilderCount(activeTag, count);
      updateLocalBuilderCount(activeTag, count);
      track("builder_count_changed", {
        value: count,
        previous: current,
      });
      await loadAccounts();
      emitWidgetUpdate();
    }

    stopSmartWidgetScheduler();
  };

  const openSupport = async () => {
    const info = await buildSupportInfo();

    setDebugInfo(info);

    setShowSupport(true);
  };

  const copyTag = async () => {
    if (!profile?.playerTag) return;
    await Clipboard.setStringAsync(profile.playerTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const goToSync = () => {
    track("navigation", {
      from: "setting",
      to: "upload-json",
      trigger: "sync",
    });
    router.push("/upload-json");
  };

  const onToggleNotifications = async (value: boolean) => {
    track("notifications_toggled", {
      enabled: value,
      source: "settings",
    });

    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setNotificationsEnabled(false);
        setLocalNotificationsEnabled(false);
        Alert.alert(
          "Notifications Disabled",
          "Please allow notifications in system settings.",
        );
        return;
      }

      setNotificationsEnabled(true);
      setLocalNotificationsEnabled(true);

      await resyncNotifications();
    } else {
      setNotificationsEnabled(false);
      setLocalNotificationsEnabled(false);
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const onRestorePurchases = async () => {
    const restored = await restorePurchases();

    if (restored) {
      usePremiumStore.getState().setPremium(true);

      Alert.alert("Restored", "Chief access restored successfully.");
    } else {
      Alert.alert("No Purchase Found", "No previous Chief purchase was found.");
    }
  };

  const runTest = async (type: "BUILDER" | "LAB" | "PET", delayMs: number) => {
    if (!activeTag) return;

    const result = await insertTestUpgrade({
      tag: activeTag,
      type,
      delayMs,
    });
    console.log(`result${type.toLowerCase()}: `, result);

    await resyncNotifications();
  };

  const activeColor =
    accounts.find((a) => a.tag === profile?.playerTag)?.color ?? GOLD;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ChiefCard />

        <Section title="Game tools">
          <Row
            icon="sparkles"
            iconColor="#fbbf24"
            title="Magic Items"
            subtitle="Track potions, snacks, books and hammers"
            chevron
            onPress={() => router.push("/magic-items")}
          />
        </Section>

        {/* ── Active village ── */}
        <Section title="Active village">
          {profile?.playerTag ? (
            <Row
              title={profile.playerName ?? "Village"}
              leading={
                <View style={styles.thWrap}>
                  {profile.townHallLevel ? (
                    <Image
                      source={{
                        uri: resolveEntityIcon(1000001, {
                          village: "home",
                          level: profile.townHallLevel,
                        }),
                      }}
                      style={styles.thIcon}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Ionicons name="person" size={18} color="#64748b" />
                  )}
                  <View
                    style={[styles.colorDot, { backgroundColor: activeColor }]}
                  />
                </View>
              }
              titleAccessory={
                isPremium ? (
                  <View style={styles.chiefPill}>
                    <Text style={styles.chiefPillText}>Chief</Text>
                  </View>
                ) : undefined
              }
              subtitle={
                <View style={styles.metaRow}>
                  <Text style={styles.rowSubtitle}>{profile.playerTag}</Text>

                  {typeof profile.trophies === "number" && (
                    <View style={styles.trophyRow}>
                      <Image
                        source={{
                          uri: `${ENV.CDN_BASE}/entities/other/trophy.png`,
                        }}
                        style={styles.trophyIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.rowSubtitle}>{profile.trophies}</Text>
                    </View>
                  )}

                  {!!profile.expLevel && <XPBadge level={profile.expLevel} />}
                </View>
              }
              right={
                <View style={styles.activeVillageActions}>
                  <GoldPassBoostButton
                    settings={activeGoldPassSettings}
                    expanded={showGoldPassPopover}
                    onPress={() => setShowGoldPassPopover((visible) => !visible)}
                  />
                  <IconButton
                    icon={copied ? "checkmark" : "copy-outline"}
                    color={copied ? "#22c55e" : "#94a3b8"}
                    label={copied ? "Tag copied" : "Copy player tag"}
                    onPress={copyTag}
                  />
                </View>
              }
            />
          ) : (
            <Row
              icon="person-outline"
              iconColor="#64748b"
              title="No village connected"
              subtitle="Import village JSON to get started"
              right={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/upload-json")}
                  style={({ pressed }) => [
                    styles.connectButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.connectButtonText}>Connect</Text>
                </Pressable>
              }
            />
          )}

          {!!profile?.playerTag && showGoldPassPopover && (
            <GoldPassBoostQuickPanel
              visible={showGoldPassPopover}
              settings={activeGoldPassSettings}
              loading={isLoadingGoldPassSettings}
              loadFailed={goldPassSettingsLoadFailed}
              saving={isSavingGoldPassSettings}
              onClose={() => setShowGoldPassPopover(false)}
              onRetry={() => setGoldPassReloadKey((current) => current + 1)}
              onSetBoth={(percent) =>
                void saveGoldPassUpdates({
                  builderBoostPercent: percent,
                  researchBoostPercent: percent,
                })
              }
              onSetBuilder={(percent) =>
                void saveGoldPassUpdates({ builderBoostPercent: percent })
              }
              onSetResearch={(percent) =>
                void saveGoldPassUpdates({ researchBoostPercent: percent })
              }
            />
          )}

          {!!profile?.playerTag && (
            <Row
              icon="construct"
              iconColor="#f97316"
              title="Builders"
              right={
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove a builder"
                    disabled={
                      !activeAccount || localBuilderCount <= MIN_BUILDERS
                    }
                    hitSlop={6}
                    onPress={() => handleBuilderSelect(localBuilderCount - 1)}
                    style={({ pressed }) => [
                      styles.stepButton,
                      (!activeAccount || localBuilderCount <= MIN_BUILDERS) &&
                        styles.stepButtonDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="remove" size={18} color="#f1f5f9" />
                  </Pressable>

                  <Text style={styles.stepValue}>{localBuilderCount}</Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add a builder"
                    disabled={
                      !activeAccount || localBuilderCount >= MAX_BUILDERS
                    }
                    hitSlop={6}
                    onPress={() => handleBuilderSelect(localBuilderCount + 1)}
                    style={({ pressed }) => [
                      styles.stepButton,
                      (!activeAccount || localBuilderCount >= MAX_BUILDERS) &&
                        styles.stepButtonDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="add" size={18} color="#f1f5f9" />
                  </Pressable>
                </View>
              }
            />
          )}

          {!!profile?.playerTag && (
            <Row
              icon="sync"
              title="Sync village data"
              subtitle={
                lastSync
                  ? `Last synced ${formatTimeAgo(lastSync)}`
                  : "Never synced"
              }
              chevron
              onPress={goToSync}
            />
          )}
        </Section>

        {/* ── All villages ── */}
        <Section
          title="Villages"
          footer="Tap the phone icon to show a village on your home screen widget. Long-press a village to remove it."
        >
          {accounts.length === 0 && (
            <Row
              icon="people-outline"
              iconColor="#64748b"
              title="No villages added yet"
            />
          )}

          {accounts.map((acc) => {
            const isActive = acc.tag === profile?.playerTag;
            const isWidgetAccount = widgetTag === acc.tag;

            return (
              <Row
                key={acc.tag}
                title={acc.name}
                subtitle={`TH${acc.townhall} • ${acc.tag}`}
                accessibilityLabel={
                  isActive ? `${acc.name}, active` : `Switch to ${acc.name}`
                }
                leading={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change color for ${acc.name}`}
                    hitSlop={6}
                    onPress={() => setEditColorFor(acc)}
                    style={[
                      styles.avatar,
                      { borderColor: acc.color },
                      isActive && { backgroundColor: acc.color + "26" },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: acc.color }]}>
                      {acc.name.slice(0, 2).toUpperCase()}
                    </Text>
                    <View style={styles.editBadge}>
                      <Ionicons name="pencil" size={8} color="#0f172a" />
                    </View>
                  </Pressable>
                }
                titleAccessory={
                  isActive ? (
                    <View
                      style={[
                        styles.activePill,
                        { backgroundColor: acc.color + "26" },
                      ]}
                    >
                      <Text
                        style={[styles.activePillText, { color: acc.color }]}
                      >
                        Active
                      </Text>
                    </View>
                  ) : undefined
                }
                right={
                  <View style={styles.accountActions}>
                    <IconButton
                      icon="phone-portrait-outline"
                      active={isWidgetAccount}
                      label={
                        isWidgetAccount
                          ? "Widget village"
                          : `Show ${acc.name} on widget`
                      }
                      onPress={() => {
                        track("widget_account_selected", {
                          total_accounts: accounts.length,
                          is_switching: acc.tag !== widgetTag,
                          account_position: accounts.findIndex(
                            (a) => a.tag === acc.tag,
                          ),
                        });

                        setWidgetAccount(acc.tag);
                        emitWidgetUpdate();
                      }}
                    />
                    <IconButton
                      icon="trash-outline"
                      label={`Remove ${acc.name}`}
                      onPress={() => setAccountToDelete(acc)}
                    />
                  </View>
                }
                onPress={() => {
                  if (!isActive) {
                    track("account_switched", {
                      from_index: accounts.findIndex(
                        (a) => a.tag === activeTag,
                      ),
                      to_index: accounts.findIndex((a) => a.tag === acc.tag),
                    });

                    switchAccount(acc.tag);
                  }
                }}
                onLongPress={() => setAccountToDelete(acc)}
              />
            );
          })}

          <Row
            icon="add"
            title="Add village"
            chevron
            onPress={() => {
              track("navigation", {
                from: "settings",
                to: "add-account",
                trigger: "add_account_button",
              });
              router.push("/add-account");
            }}
          />
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications">
          <Row
            icon="notifications"
            title="Upgrade alerts"
            subtitle="Notify me when upgrades finish"
            right={
              <Switch
                value={localNotificationsEnabled}
                onValueChange={onToggleNotifications}
                trackColor={{ false: "#334155", true: GOLD }}
                thumbColor={localNotificationsEnabled ? "#0f172a" : "#cbd5e1"}
              />
            }
          />
        </Section>

        {/* ── Dev ── */}
        {__DEV__ && (
          <Section title="Developer">
            <Row
              icon="hammer"
              iconColor="#0ea5e9"
              title="Test builder alert"
              value="5s"
              onPress={() => runTest("BUILDER", 5000)}
            />
            <Row
              icon="flask"
              iconColor="#8b5cf6"
              title="Test lab alert"
              value="8s"
              onPress={() => runTest("LAB", 8000)}
            />
            <Row
              icon="paw"
              iconColor="#ec4899"
              title="Test pet alert"
              value="12s"
              onPress={() => runTest("PET", 12000)}
            />
            <Row
              icon="close-circle"
              destructive
              title="Cancel all scheduled"
              onPress={async () => {
                await Notifications.cancelAllScheduledNotificationsAsync();
              }}
            />
          </Section>
        )}

        {/* ── Support ── */}
        <Section title="Support">
          <Row
            icon="chatbubble-ellipses-outline"
            iconColor="#38bdf8"
            title="Help & feedback"
            subtitle="Contact us and view debug info"
            chevron
            onPress={openSupport}
          />
          <Row
            icon="refresh-outline"
            iconColor="#22c55e"
            title="Restore purchases"
            subtitle="Restore Chief on this device"
            onPress={onRestorePurchases}
          />
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <Row
            icon="shield-checkmark-outline"
            iconColor="#94a3b8"
            title="Privacy policy"
            chevron
            onPress={() => router.push("/privacy")}
          />
          <Row
            icon="open-outline"
            iconColor="#94a3b8"
            title="Supercell fan content policy"
            onPress={() =>
              Linking.openURL("https://supercell.com/en/fan-content-policy/")
            }
          />
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Danger zone">
          {!!profile?.playerTag && (
            <Row
              icon="refresh-outline"
              destructive
              title="Reset village"
              subtitle="Unlink the player tag and clear tracked upgrades"
              onPress={() => setShowResetAccountModal(true)}
            />
          )}
          <Row
            icon="trash-outline"
            destructive
            title="Clear tracked upgrades"
            subtitle="Keeps your village"
            onPress={() => setShowClearUpgradesModal(true)}
          />
        </Section>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            Clash One{" "}
            <Text style={styles.footerVersion}>
              v{Application.nativeApplicationVersion}
            </Text>
          </Text>
          <Text style={styles.footerText}>
            Unofficial companion app for Clash of Clans. Not affiliated with,
            endorsed, or sponsored by Supercell.
          </Text>
        </View>
      </ScrollView>

      {/* Color picker */}
      <Modal
        visible={!!editColorFor}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEditColorFor(null)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            accessibilityLabel="Close color picker"
            style={styles.sheetBackdrop}
            onPress={() => setEditColorFor(null)}
          />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Village color</Text>
            <Text style={styles.sheetSubtitle}>{editColorFor?.name}</Text>

            {[ACCOUNT_COLORS.slice(0, 4), ACCOUNT_COLORS.slice(4)].map(
              (row, rowIndex) => (
                <View key={rowIndex} style={styles.colorRow}>
                  {row.map((color) => {
                    const selected = editColorFor?.color === color;

                    return (
                      <Pressable
                        key={color}
                        accessibilityRole="button"
                        accessibilityLabel={`Use color ${color}`}
                        accessibilityState={{ selected }}
                        style={({ pressed }) => [
                          styles.colorSwatch,
                          { backgroundColor: color },
                          selected && styles.colorSwatchActive,
                          pressed && styles.pressed,
                        ]}
                        onPress={async () => {
                          track("account_color_changed", {
                            account: editColorFor!.tag,
                          });

                          await updateAccountColor(editColorFor!.tag, color);

                          setEditColorFor(null);

                          await loadAccounts();

                          emitWidgetUpdate();
                        }}
                      >
                        {selected && (
                          <Ionicons
                            name="checkmark"
                            size={22}
                            color="#0f172a"
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ),
            )}
          </View>
        </View>
      </Modal>

      <SupportModal
        visible={showSupport}
        onClose={() => setShowSupport(false)}
        debugInfo={debugInfo}
      />

      {/* Reset Account Modal */}
      <ConfirmModal
        visible={showResetAccountModal}
        title="Reset Account?"
        message="This will remove your saved player tag and all tracked upgrades."
        confirmText="Reset"
        destructive
        onCancel={() => setShowResetAccountModal(false)}
        onConfirm={async () => {
          // await cancelAllNotifications();
          if (profile) {
            const resetProfile = {
              ...profile,
              playerTag: undefined,
              playerApiConnected: false,
              lastSyncedAt: undefined,
            };
            if (!activeTag) return;
            savePlayerProfile(activeTag, resetProfile);
            setProfile(activeTag, resetProfile);
          }
          if (profile?.playerTag) {
            resetLastJsonSync(profile.playerTag);
          }
          setShowResetAccountModal(false);
          emitWidgetUpdate();
          startSmartWidgetScheduler();
        }}
      />

      {/* Clear Upgrades Modal */}
      <ConfirmModal
        visible={showClearUpgradesModal}
        title="Clear All Upgrades?"
        message="This will remove all tracked upgrades but keep your village."
        confirmText="Clear"
        destructive
        onCancel={() => setShowClearUpgradesModal(false)}
        onConfirm={async () => {
          await resyncNotifications();
          setShowClearUpgradesModal(false);
          emitWidgetUpdate();
          startSmartWidgetScheduler();
        }}
      />

      {/* Delete Account Modal */}
      <ConfirmModal
        visible={!!accountToDelete}
        title={`Remove ${accountToDelete?.name}?`}
        message="This village will be removed. Your upgrade data for this village will also be deleted."
        confirmText="Remove"
        destructive
        onCancel={() => setAccountToDelete(null)}
        onConfirm={async () => {
          if (!accountToDelete) return;
          await removeAccount(accountToDelete.tag);
          track("account_removed", {
            total_accounts_before: accounts.length - 1,
          });
          await resyncNotifications();
          setAccountToDelete(null);
          await loadAccounts();
          emitWidgetUpdate();
        }}
      />
      <ConfirmModal
        visible={showBuilderErrorModal}
        title="Cannot Reduce Builders"
        message={`You currently have ${requiredBuilders} active upgrades running.

Reduce builders only after some upgrades complete.`}
        confirmText="Got it"
        onCancel={() => setShowBuilderErrorModal(false)}
        onConfirm={() => setShowBuilderErrorModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  scrollContent: {
    paddingBottom: 90,
  },

  pressed: {
    opacity: 0.6,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },

  headerTitle: {
    color: GOLD,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
  },

  // ── Section + group ─────────────────────────────────────
  section: {
    marginTop: 18,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 6,
    marginHorizontal: 20,
  },

  sectionFooter: {
    fontSize: 12,
    lineHeight: 16,
    color: "#64748b",
    marginTop: 6,
    marginHorizontal: 20,
  },

  group: {
    marginHorizontal: 16,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#334155",
    marginLeft: 58, // 14 padding + 32 icon + 12 gap
  },

  // ── Row ─────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  rowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  activeVillageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  rowText: {
    flex: 1,
    gap: 2,
  },

  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#f1f5f9",
  },

  rowSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },

  rowValue: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  // ── Active village ──────────────────────────────────────
  thWrap: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  thIcon: {
    width: 32,
    height: 32,
  },

  colorDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#1e293b",
  },

  chiefPill: {
    backgroundColor: GOLD,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },

  chiefPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0f172a",
  },

  trophyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  trophyIcon: {
    width: 13,
    height: 13,
  },

  connectButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(251, 191, 36, 0.14)",
  },

  connectButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: GOLD,
  },

  // ── Stepper ─────────────────────────────────────────────
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 3,
  },

  stepButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },

  stepButtonDisabled: {
    opacity: 0.35,
  },

  stepValue: {
    minWidth: 32,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#f1f5f9",
  },

  // ── Villages ────────────────────────────────────────────
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 11,
    fontWeight: "800",
  },

  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#fbbf24",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1e293b",
  },

  activePill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
  },

  activePillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  accountActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },

  iconButtonActive: {
    backgroundColor: GOLD,
  },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    alignItems: "center",
    marginTop: 28,
    paddingHorizontal: 32,
    gap: 6,
  },

  footerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: GOLD,
  },

  footerVersion: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },

  footerText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#64748b",
    textAlign: "center",
  },

  // ── Color picker sheet ──────────────────────────────────
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 24,
    paddingTop: 12,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    backgroundColor: "#475569",
    borderRadius: 2,
    marginBottom: 18,
  },

  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#f1f5f9",
  },

  sheetSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
    marginBottom: 20,
  },

  colorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "#f8fafc",
  },
});
