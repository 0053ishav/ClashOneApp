import GoblinEventBanner from "@/components/GoblinEventBanner";
import { HammerJamBanner } from "@/components/HammerJamBanner";
import { LabSection } from "@/components/home/LabSection";
import {
  formatSavedDuration,
  MagicItemActivityPopup,
  MagicItemTimeSaved,
} from "@/components/home/MagicItemActivitySummary";
import { MagicItemsQuickModal } from "@/components/home/MagicItemsQuickModal";
import { PetSection } from "@/components/home/PetSection";
import { UpgradeActionModal } from "@/components/home/UpgradeActionModal";
import {
  MagicItemDialog,
  type MagicItemDialogChoice,
} from "@/components/magicItems/MagicItemDialog";
import ProfileDropdownSheet, {
  ProfileDropdownSheetRef,
} from "@/components/ProfileSheet/ProfileDropdownSheet";
import { SupportModal } from "@/components/SupportModal";
import { XPBadge } from "@/components/XPBadge";
import { ENV } from "@/config/env";
import { MAGIC_ITEMS } from "@/config/magicItems";
import { useCraftedResolver } from "@/engine/crafted/craftedResolver";
import type { ProgressionApplicationResult } from "@/engine/progression/models";
import type { GoldPassBoostSettings } from "@/types/goldPass";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useRemoteConfig } from "@/provider/remoteConfigProvider";
import { getAccountState } from "@/services/accountStateService";
import {
  getActiveMagicEffects,
  getMagicItemInventory,
} from "@/services/magicItemService";
import { ProgressionApplicationService } from "@/services/progression";
import { resolveGoldPassBoostForUpgradeType } from "@/engine/progression/resolveGoldPassBoostForUpgradeType";
import { getGoldPassBoostSettings } from "@/services/goldPassBoostService";
import { buildSupportInfo } from "@/services/supportDebugInfo";
import { deleteUpgrade } from "@/services/upgradeService";
import { applyBookToActiveUpgrade } from "@/services/useBookOnActiveUpgrade";
import { setOnboardingIncomplete } from "@/storage/appConfig";
import {
  setGoblinBannerDismissedUntil,
  shouldShowGoblinBanner,
} from "@/storage/goblinStorage";
import { useAccountStore } from "@/stores/accountStore";
import { useHammerJamStore } from "@/stores/hammerJamStore";
import { usePremiumStore } from "@/stores/premiumStore";
import { Village } from "@/types/entity";
import type { MagicItem } from "@/types/magicItem";
import { Upgrade } from "@/types/upgrade";
import { setSessionSource, track } from "@/utils/analytics/analytics";
import { calculateProgress } from "@/utils/calculateProgress";
import { formatBuildingName } from "@/utils/formatBuildingName";
import { formatCountdown } from "@/utils/formatCountdown";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { getEntity } from "@/utils/getEntity";
import {
  canUseGoblinBuilder,
  getCurrentWorkForHireEventEnd,
  isWorkForHireActive,
} from "@/utils/goblin";
import {
  FALLBACK_ICON,
  resolveEntityIcon,
} from "@/utils/icons/resolveEntityIcon";
import { resyncNotifications } from "@/utils/notificationSync";
import { startSmartWidgetScheduler } from "@/utils/scheduleWidgetRefresh";
import { getBuilderBaseBuilderStatus } from "@/utils/status/builderBase/getBuilderBaseBuilderStatus";
import { getBuilderBaseVillageStatus } from "@/utils/status/builderBase/getBuilderBaseVillageStatus";
import { getBuilderStatus } from "@/utils/status/home/builderStatus";
import { getVillageStatus } from "@/utils/status/home/getVillageStatus";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { ActiveUpgradesSkeleton } from "@/components/home/ActiveUpgradesSkeleton";
import { LabSectionSkeleton } from "@/components/home/LabSectionSkeleton";
import { PetSectionSkeleton } from "@/components/home/PetSectionSkeleton";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

export default function HomeScreen() {
  const router = useRouter();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const hammerJamManifest = useHammerJamStore((s) => s.manifest);
  type AccountState = Awaited<ReturnType<typeof getAccountState>>;
  const [accountState, setAccountState] = useState<AccountState | null>(null);
  const [isLoadingAccountState, setIsLoadingAccountState] = useState(true);
  const [selectedUpgrade, setSelectedUpgrade] = useState<Upgrade | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [magicItemsVisible, setMagicItemsVisible] = useState(false);
  const [magicItemActivity, setMagicItemActivity] = useState<{
    village: Village;
    totalSavedMs: number;
    items: MagicItem[];
    error?: string;
  } | null>(null);
  const [magicItemInventoryCount, setMagicItemInventoryCount] = useState(0);
  const [magicItemDialog, setMagicItemDialog] = useState<{
    title: string;
    message: string;
    item?: MagicItem;
    choices?: MagicItemDialogChoice[];
    tone?: "confirm" | "success" | "error" | "info";
    confirmLabel?: string;
    onConfirm?: (item?: MagicItem) => void | Promise<void>;
  } | null>(null);
  const [selectedProgression, setSelectedProgression] =
    useState<ProgressionApplicationResult | null>(null);
  const [goldPassSettings, setGoldPassSettings] =
    useState<GoldPassBoostSettings | null>(null);
  const goldPassProgressionRequestRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [completedId, setCompletedId] = useState<string | null>(null);
  const profileSheetRef = useRef<ProfileDropdownSheetRef>(null);
  const [selectedVillage, setSelectedVillage] = useState<Village>("home");
  const translateX = useSharedValue(0);
  const { getCraftedName, getModuleName } = useCraftedResolver();

  const activeTag = useAccountStore((s) => s.activeTag);
  const { profile } = usePlayerProfile();
  const isLoadingProfile = useAccountStore((s) => s.isLoadingProfile);
  const lastJsonSyncMap = useAccountStore((s) => s.lastJsonSyncMap);
  const lastSync = activeTag ? lastJsonSyncMap[activeTag] : null;
  const accounts = useAccountStore((s) => s.accounts);
  const activeAccount = accounts.find((a) => a.tag === activeTag);

  const builderCount = activeAccount?.builderCount ?? 1;
  const townHall = profile?.townHallLevel ?? 1;

  const builderBaseBuilders = accountState?.builders.builderBase ?? [];

  const builderBaseBuilderCount = activeAccount?.builderBaseBuilderCount ?? 2;

  const [showSupport, setShowSupport] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  const hasLoadedAccountState = useRef(false);
  const refreshState = useCallback(async () => {
    if (!activeTag) return;

    try {
      if (!hasLoadedAccountState.current) {
        setIsLoadingAccountState(true);
      }

      const [state, inventory] = await Promise.all([
        getAccountState(activeTag),
        getMagicItemInventory(activeTag),
      ]);
      setAccountState(state);
      const trackedPotionCount = inventory.reduce((total, entry) => {
        const item = MAGIC_ITEMS.find(
          (candidate) => candidate.id === entry.itemId,
        );
        return (
          total +
          (item && (item.itemType === "potion" || item.itemType === "snack")
            ? entry.quantity
            : 0)
        );
      }, 0);
      setMagicItemInventoryCount(trackedPotionCount);
      hasLoadedAccountState.current = true;
    } catch (error) {
      console.error("[HOME] Failed to refresh account state:", error);
    } finally {
      setIsLoadingAccountState(false);
    }
  }, [activeTag]);

  useEffect(() => {
    if (activeTag) {
      hasLoadedAccountState.current = false;
      refreshState();
    }
  }, [activeTag, refreshState]);

  const { width } = useWindowDimensions();

  const builders = useMemo(
    () =>
      selectedVillage === "home"
        ? (accountState?.builders.home ?? [])
        : (accountState?.builders.builderBase ?? []),
    [accountState, selectedVillage],
  );

  const lab = useMemo(
    () =>
      selectedVillage === "home"
        ? accountState?.lab.home
        : accountState?.lab.builderBase,
    [accountState, selectedVillage],
  );

  const pet = useMemo(
    () => (selectedVillage === "home" ? (accountState?.pet ?? null) : null),
    [accountState, selectedVillage],
  );

  useEffect(() => {
    track("screen_view", { screen: "home" });
  }, []);

  const busySlots = useMemo(() => {
    const map = new Set<number>();
    for (const u of builders) {
      if (typeof u.builderSlot === "number") {
        map.add(u.builderSlot);
      }
    }
    return map;
  }, [builders]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const finished = builders.find((u) => u.endTime <= now);
      if (finished) {
        setCompletedId((current) => current ?? finished.id);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [builders]);

  const performSync = useCallback(async () => {
    await refreshState();
    emitWidgetUpdate();
    startSmartWidgetScheduler();
    await resyncNotifications();
  }, [refreshState]);

  const handleUseBook = useCallback(
    async (upgrade: Upgrade) => {
      if (!activeTag) return;

      const village = upgrade.village ?? "home";
      const target =
        upgrade.dataId != null
          ? getEntity(Number(upgrade.dataId)).type
          : "unknown";
      const inventory = await getMagicItemInventory(activeTag);
      const quantities = new Map(
        inventory.map((entry) => [entry.itemId, entry.quantity]),
      );
      const compatibleBooks = MAGIC_ITEMS.filter((item) => {
        if (item.itemType !== "book" || !item.villages.includes(village))
          return false;
        const targets = item.effect.appliesTo ?? [];
        const compatible =
          targets.includes("any") ||
          targets.includes(target as (typeof targets)[number]) ||
          (targets.includes("heroes-and-pets") &&
            (target === "hero" || target === "pet"));
        return compatible && (quantities.get(item.id) ?? 0) > 0;
      });

      if (compatibleBooks.length === 0) {
        setMagicItemDialog({
          title: "No compatible Books",
          message:
            "You do not have a compatible Book in this account’s tracked inventory.",
          tone: "info",
        });
        return;
      }

      setMagicItemDialog({
        title: "Use a Book",
        message: `Choose a Book to complete ${upgrade.entity}.`,
        choices: compatibleBooks.map((item) => ({
          item,
          quantity: quantities.get(item.id) ?? 0,
        })),
        tone: "confirm",
        confirmLabel: "Use Book",
        onConfirm: (selectedItem) => {
          if (!selectedItem) return;
          setMagicItemDialog(null);
          void (async () => {
            const result = await applyBookToActiveUpgrade({
              accountTag: activeTag,
              itemId: selectedItem.id,
              upgradeId: upgrade.id,
            });
            if (!result.used) {
              setMagicItemDialog({
                title: "Could not use Book",
                message: result.reason.replaceAll("-", " "),
                item: selectedItem,
                tone: "error",
              });
              return;
            }
            setActionModalVisible(false);
            setSelectedUpgrade(null);
            setSelectedProgression(null);
            await performSync();
            setMagicItemDialog({
              title: "Book used",
              message: `${selectedItem.name} completed the tracked upgrade.`,
              item: selectedItem,
              tone: "success",
            });
          })().catch(() =>
            setMagicItemDialog({
              title: "Could not use Book",
              message: "Please try again.",
              item: selectedItem,
              tone: "error",
            }),
          );
        },
      });
    },
    [activeTag, performSync],
  );

  useEffect(() => {
    if (!completedId) return;
    const timeout = setTimeout(async () => {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          300,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
      deleteUpgrade(completedId);
      await performSync();
      setCompletedId(null);
    }, 800);
    return () => clearTimeout(timeout);
  }, [completedId, refreshState, performSync]);

  useFocusEffect(
    useCallback(() => {
      refreshState();
    }, [refreshState]),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!activeTag) {
        setGoldPassSettings(null);
        return () => {
          cancelled = true;
        };
      }

      void getGoldPassBoostSettings(activeTag)
        .then((settings) => {
          if (!cancelled) setGoldPassSettings(settings);
        })
        .catch(() => {
          if (!cancelled) setGoldPassSettings(null);
        });

      return () => {
        cancelled = true;
      };
    }, [activeTag]),
  );

  useEffect(() => {
    const interval = setInterval(refreshState, 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const TAB_WIDTH = (width - 4 * 2) / 2;

  useEffect(() => {
    translateX.value = withTiming(selectedVillage === "home" ? 0 : TAB_WIDTH, {
      duration: 0,
    });
  });

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      await performSync();
    } finally {
      setRefreshing(false);
    }
  }, [performSync, refreshing]);

  const { config } = useRemoteConfig();

  const changeVillage = (village: "home" | "builderBase") => {
    if (village === selectedVillage) return;
    setSelectedVillage(village);
    translateX.value = withTiming(village === "home" ? 0 : TAB_WIDTH, {
      duration: 220,
    });
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -70 && selectedVillage === "home") {
        scheduleOnRN(changeVillage, "builderBase");
      }
      if (e.translationX > 70 && selectedVillage === "builderBase") {
        scheduleOnRN(changeVillage, "home");
      }
    });

  const showMagicItemActivity = useCallback(async () => {
    const totalSavedMs = (accountState?.activeUpgrades ?? [])
      .filter((upgrade) => upgrade.village === selectedVillage)
      .reduce(
        (total, upgrade) => total + (upgrade.magicItemTimeSavedMs ?? 0),
        0,
      );

    if (!activeTag) {
      setMagicItemActivity({
        village: selectedVillage,
        totalSavedMs,
        items: [],
        error: "Connect a village to view tracked effects.",
      });
      return;
    }

    try {
      const effects = await getActiveMagicEffects(activeTag);
      const activeItems = Array.from(
        new Set(
          effects
            .filter(
              (effect) =>
                effect.village === selectedVillage &&
                (effect.expiresAt == null || effect.expiresAt > Date.now()),
            )
            .map((effect) => effect.itemId),
        ),
      )
        .map((itemId) => MAGIC_ITEMS.find((item) => item.id === itemId))
        .filter(
          (item): item is (typeof MAGIC_ITEMS)[number] =>
            item !== undefined &&
            (item.itemType === "potion" || item.itemType === "snack"),
        );

      setMagicItemActivity({
        village: selectedVillage,
        totalSavedMs,
        items: activeItems,
      });
    } catch {
      setMagicItemActivity({
        village: selectedVillage,
        totalSavedMs,
        items: [],
        error: "Could not load active effects. Please try again.",
      });
    }
  }, [accountState?.activeUpgrades, activeTag, selectedVillage]);

  if (isLoadingProfile) {
    return (
      <View style={[styles.container, styles.loadingOverlay]}>
        <View style={styles.loadingContent}>
          <View style={styles.imageWrapper}>
            <Image
              source={require("@/assets/images/builder/builder-idle.png")}
              style={styles.builderImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
          <Text style={styles.loadingTitle}>Switching Village</Text>
          <Text style={styles.loadingMessage}>Loading your profile...</Text>
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.loadingOverlay]}>
        <View style={styles.loadingContent}>
          <View style={styles.imageWrapper}>
            <Image
              source={require("@/assets/images/builder/builder-idle.png")}
              style={styles.builderImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </View>
          <Text style={styles.loadingTitle}>No Village Connected</Text>
          <Pressable
            onPress={() => router.replace("/add-account")}
            style={styles.connectButton}
          >
            <Text style={styles.connectButtonText}>Connect</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isGoblinActive = config.goblinBuilderEnabled && isWorkForHireActive();
  const eventEndsAt = getCurrentWorkForHireEventEnd();
  const showBanner = !!eventEndsAt && shouldShowGoblinBanner(eventEndsAt);
  const isStale = lastSync && Date.now() - lastSync > 1000 * 60 * 60 * 12;

  const status = getBuilderStatus({
    village: "home",
    normalBuilderCount: builderCount,
    goblinBuilderUnlocked: isGoblinActive,
    activeUpgrades: builders,
  });

  const builderBaseStatus = getBuilderBaseBuilderStatus({
    builderCount: builderBaseBuilderCount,
    activeUpgrades: accountState?.builders.builderBase ?? [],
  });

  const builderBaseVillageStatus = getBuilderBaseVillageStatus({
    builders: accountState?.builders.builderBase ?? [],
    builderCount: builderBaseBuilderCount,
    lab: accountState?.lab.builderBase.normal,
  });

  const sortedUpgrades = [...builders].sort((a, b) => {
    const slotA =
      a.builderSlot === "G"
        ? 999
        : typeof a.builderSlot === "number"
          ? a.builderSlot
          : 999;
    const slotB =
      b.builderSlot === "G"
        ? 999
        : typeof b.builderSlot === "number"
          ? b.builderSlot
          : 999;
    return slotA - slotB;
  });

  const builderBaseSortedUpgrades = [...builderBaseBuilders].sort((a, b) => {
    const slotA = typeof a.builderSlot === "number" ? a.builderSlot : 999;

    const slotB = typeof b.builderSlot === "number" ? b.builderSlot : 999;

    return slotA - slotB;
  });

  const nextUpgrade =
    sortedUpgrades.length > 0
      ? sortedUpgrades.reduce((prev, curr) =>
          prev.endTime < curr.endTime ? prev : curr,
        )
      : null;

  const builderBaseNextUpgrade =
    builderBaseSortedUpgrades.length > 0
      ? builderBaseSortedUpgrades.reduce((prev, curr) =>
          prev.endTime < curr.endTime ? prev : curr,
        )
      : null;

  const remainingMs = nextUpgrade
    ? Math.max(nextUpgrade.endTime - Date.now(), 0)
    : 0;

  const builderBaseRemainingMs = builderBaseNextUpgrade
    ? Math.max(builderBaseNextUpgrade.endTime - Date.now(), 0)
    : 0;

  let nextBuilderLabel: string | undefined;
  if (nextUpgrade) {
    if (nextUpgrade.builderSlot === "G") {
      nextBuilderLabel = "Goblin";
    } else if (typeof nextUpgrade.builderSlot === "number") {
      nextBuilderLabel = `B${nextUpgrade.builderSlot + 1}`;
    } else {
      nextBuilderLabel = "Builder";
    }
  }

  let builderBaseNextBuilderLabel: string | undefined;

  if (builderBaseNextUpgrade) {
    if (typeof builderBaseNextUpgrade.builderSlot === "number") {
      builderBaseNextBuilderLabel = `B${builderBaseNextUpgrade.builderSlot + 1}`;
    } else {
      builderBaseNextBuilderLabel = "Builder";
    }
  }
  const handleRowPress = (upgrade: Upgrade) => {
    const requestId = ++goldPassProgressionRequestRef.current;
    setSelectedUpgrade(upgrade);
    setActionModalVisible(true);

    const resolveWithSettings = (settings: GoldPassBoostSettings) => {
      const goldPassBoost = resolveGoldPassBoostForUpgradeType(
        upgrade.upgradeType,
        settings,
      );
      return ProgressionApplicationService.resolveUpgrade(upgrade, {
        goldPassBoost,
      });
    };

    const cachedSettings =
      goldPassSettings?.accountTag === upgrade.accountTag
        ? goldPassSettings
        : null;

    if (cachedSettings) {
      setSelectedProgression(resolveWithSettings(cachedSettings));
      return;
    }

    // Load the correct account's settings before presenting its progression.
    setSelectedProgression(null);
    void getGoldPassBoostSettings(upgrade.accountTag)
      .then((settings) => {
        if (goldPassProgressionRequestRef.current !== requestId) return;
        setGoldPassSettings(settings);
        setSelectedProgression(resolveWithSettings(settings));
      })
      .catch(() => {
        if (goldPassProgressionRequestRef.current !== requestId) return;
        setSelectedProgression(
          ProgressionApplicationService.resolveUpgrade(upgrade),
        );
      });
  };

  let statusIcon = require("@/assets/images/builder/builder-idle.png");
  if (!status.allFree && nextUpgrade?.dataId) {
    statusIcon = resolveEntityIcon(nextUpgrade.dataId, {
      village: "home",
      level: nextUpgrade.currentLevel,
      isCrafted: nextUpgrade.isCrafted,
    });
  }

  let builderBaseStatusIcon = require("@/assets/images/builder/builder-idle.png");

  if (!builderBaseStatus.allFree && builderBaseNextUpgrade?.dataId) {
    builderBaseStatusIcon = resolveEntityIcon(builderBaseNextUpgrade.dataId, {
      village: "builderBase",
      level: builderBaseNextUpgrade.currentLevel,
      isCrafted: builderBaseNextUpgrade.isCrafted,
    });
  }

  const villageStatus = getVillageStatus({
    townHall,
    builders,
    builderCount,
    pet: townHall >= 14 ? pet : null,
    labNormal: lab?.normal,
    labGoblin: lab?.goblin,
    goblinAvailable: lab?.goblinAvailable,
  });

  let insightParts: string[] = [];

  if (selectedVillage === "home") {
    if (villageStatus.freeBuilders > 0) {
      insightParts.push(`🚨 ${villageStatus.freeBuilders} builder idle`);
    }

    if (villageStatus.goblinBuilderIdle) {
      insightParts.push("⚒️ Goblin Builder idle");
    }

    if (villageStatus.labIdle) {
      insightParts.push("🧪 Lab idle");
    }

    if (villageStatus.goblinLabIdle) {
      insightParts.push("🧪 Goblin Lab idle");
    }

    if (townHall >= 14 && villageStatus.petIdle) {
      insightParts.push("🐾 Pet idle");
    }
  } else {
    if (builderBaseVillageStatus.freeBuilders > 0) {
      insightParts.push(
        `🚨 ${builderBaseVillageStatus.freeBuilders}/3 builders idle`,
      );
    }

    if (builderBaseVillageStatus.labIdle) {
      insightParts.push("🧪 Star Laboratory idle");
    }
  }

  const insight =
    insightParts.length > 0
      ? insightParts.join(" • ")
      : selectedVillage === "home"
        ? "All systems running"
        : "All Builder Base systems running";

  const isUrgent =
    selectedVillage === "home"
      ? villageStatus.freeBuilders > 0
      : builderBaseVillageStatus.freeBuilders > 0 ||
        builderBaseVillageStatus.labIdle;

  const currentStatus = selectedVillage === "home" ? status : builderBaseStatus;

  const currentNextUpgrade =
    selectedVillage === "home" ? nextUpgrade : builderBaseNextUpgrade;

  const currentRemainingMs =
    selectedVillage === "home" ? remainingMs : builderBaseRemainingMs;

  const currentNextBuilderLabel =
    selectedVillage === "home" ? nextBuilderLabel : builderBaseNextBuilderLabel;

  const currentStatusIcon =
    selectedVillage === "home" ? statusIcon : builderBaseStatusIcon;

  const currentBuilderCount =
    selectedVillage === "home" ? builderCount : builderBaseBuilderCount;

  const openSupport = async () => {
    const info = await buildSupportInfo();
    setDebugInfo(info);
    setShowSupport(true);
  };

  // Derive initials from player name for avatar
  const playerInitials = activeAccount?.name
    ? activeAccount?.name.slice(0, 2).toUpperCase()
    : "??";

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#0f172a" }}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Clash One</Text>
          <View style={styles.syncBlock}>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Help and feedback"
                onPress={openSupport}
                hitSlop={8}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={19}
                  color="#94a3b8"
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sync village data"
                hitSlop={8}
                onPress={() => {
                  setSessionSource("app");
                  track("navigation", {
                    from: "home",
                    to: "upload-json",
                    trigger: "sync",
                  });
                  router.push("/upload-json");
                }}
              >
                <Ionicons
                  name="sync-sharp"
                  size={19}
                  color={isStale ? "#fbbf24" : "#f8fafc"}
                />
              </Pressable>
            </View>
            {lastSync && (
              <Text style={styles.syncText}>
                Synced {formatTimeAgo(lastSync)} ago
              </Text>
            )}
          </View>
        </View>

        {showBanner && eventEndsAt && (
          <GoblinEventBanner
            eventEndsAt={eventEndsAt}
            onDismiss={() => setGoblinBannerDismissedUntil(eventEndsAt)}
          />
        )}

        <HammerJamBanner manifest={hammerJamManifest} />

        {/* Profile row and compact Magic Item shortcuts */}
        <View style={styles.profileActionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open profile for ${
              profile.playerTag ? profile.playerName : "Unsnced account"
            }`}
            accessibilityHint="Open profile and account actions"
            onPress={() => {
              console.log("🔥 [HOME] PROFILE ROW PRESSED");
              profileSheetRef.current?.present();
            }}
            style={({ pressed }) => [
              styles.profileRow,
              pressed && styles.profileRowPressed,
            ]}
          >
            {/* Avatar circle */}
            <View
              style={[styles.avatar, { borderColor: activeAccount?.color }]}
            >
              <Text
                style={[styles.avatarText, { color: activeAccount?.color }]}
              >
                {playerInitials}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profile.playerTag ? profile.playerName : "No Profile Synced"}
                </Text>
                {profile.leagueTierIconUrl && (
                  <Image
                    source={{ uri: profile.leagueTierIconUrl }}
                    style={styles.leagueIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                )}
                {isPremium && (
                  <View style={styles.chiefBadge}>
                    <Text style={styles.chiefBadgeText}>Chief</Text>
                  </View>
                )}
              </View>

              {profile.playerTag && (
                <View style={styles.profileMeta}>
                  {typeof profile.expLevel === "number" && (
                    <XPBadge level={profile.expLevel} />
                  )}
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
                  {typeof profile.trophies === "number" && (
                    <View style={styles.trophyRow}>
                      <Image
                        source={{
                          uri: `${ENV.CDN_BASE}/entities/other/trophy.png`,
                        }}
                        style={styles.trophyIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.profileSub}>{profile.trophies}</Text>
                    </View>
                  )}
                  <View style={styles.metaDot} />
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
                  {typeof profile.builderBaseTrophies === "number" && (
                    <View style={styles.trophyRow}>
                      <Image
                        source={{
                          uri: `${ENV.CDN_BASE}/entities/other/trophy.png`,
                        }}
                        style={styles.trophyIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.profileSub}>
                        {profile.builderBaseTrophies}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <View style={styles.chevronButton}>
              <Ionicons name="chevron-down" size={14} color="#94a3b8" />
            </View>
          </Pressable>
          <View style={styles.profileMagicActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Potion and Snack effects and time saved"
              onPress={() => void showMagicItemActivity()}
              style={({ pressed }) => [
                styles.profileSavedBadge,
                pressed && styles.magicItemsButtonPressed,
              ]}
            >
              <Ionicons name="flash" size={11} color="#34d399" />
              <Text style={styles.profileSavedText}>
                {formatSavedDuration(
                  (accountState?.activeUpgrades ?? []).reduce(
                    (total, upgrade) =>
                      total + (upgrade.magicItemTimeSavedMs ?? 0),
                    0,
                  ),
                )}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open Potion and Snack inventory, ${magicItemInventoryCount} available`}
              onPress={() => setMagicItemsVisible(true)}
              style={({ pressed }) => [
                styles.profileInventoryButton,
                pressed && styles.magicItemsButtonPressed,
              ]}
            >
              <Ionicons name="flask" size={13} color="#fbbf24" />
              <Text style={styles.profileInventoryText}>
                {magicItemInventoryCount}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fbbf24"
            colors={["#fbbf24"]}
            progressBackgroundColor="#111c2e"
          />
        }
      >
        <View style={styles.villageTabsTopSpacer} />
        {/* Village tabs */}
        <View style={styles.villageTabs}>
          <Animated.View
            style={[
              styles.villageIndicator,
              { width: TAB_WIDTH },
              indicatorStyle,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Home village"
            accessibilityState={{ selected: selectedVillage === "home" }}
            onPress={() => changeVillage("home")}
            style={styles.villageTab}
          >
            <Image
              source={{
                uri: resolveEntityIcon(1000001, {
                  village: "home",
                  level: profile.townHallLevel,
                }),
              }}
              style={[
                styles.villageIcon,
                selectedVillage !== "home" && styles.villageIconInactive,
              ]}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text
              style={[
                styles.villageTabLabel,
                selectedVillage === "home" && styles.villageTabLabelActive,
              ]}
            >
              Home
            </Text>
            <View
              style={[
                styles.villageHallBadge,
                selectedVillage === "home" && styles.villageHallBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.villageHallBadgeText,
                  selectedVillage === "home" &&
                    styles.villageHallBadgeTextActive,
                ]}
              >
                TH{profile.townHallLevel}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Builder base village"
            accessibilityState={{
              selected: selectedVillage === "builderBase",
            }}
            onPress={() => changeVillage("builderBase")}
            style={styles.villageTab}
          >
            <Image
              source={{
                uri: resolveEntityIcon(1000034, {
                  village: "builderBase",
                  level: profile.builderHallLevel,
                }),
              }}
              style={[
                styles.villageIcon,
                selectedVillage !== "builderBase" && styles.villageIconInactive,
              ]}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <Text
              style={[
                styles.villageTabLabel,
                selectedVillage === "builderBase" &&
                  styles.villageTabLabelActive,
              ]}
            >
              Builder
            </Text>
            <View
              style={[
                styles.villageHallBadge,
                selectedVillage === "builderBase" &&
                  styles.villageHallBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.villageHallBadgeText,
                  selectedVillage === "builderBase" &&
                    styles.villageHallBadgeTextActive,
                ]}
              >
                BH{profile.builderHallLevel}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ── Status Card (dimensions preserved) ── */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardTop}>
            <View style={styles.statusIconBox}>
              <Image
                source={currentStatusIcon}
                style={styles.statusCardIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
            <View style={styles.statusBody}>
              <Text style={styles.statusEyebrow}>
                {currentStatus.allFree
                  ? "All builders free"
                  : `Next free · ${currentNextBuilderLabel}`}
              </Text>
              <Text style={styles.statusCountdown}>
                {currentStatus.allFree
                  ? "Start an upgrade"
                  : formatCountdown(currentRemainingMs)}
              </Text>
              {!currentStatus.allFree && currentNextUpgrade && (
                <Text style={styles.statusSub} numberOfLines={1}>
                  {currentNextUpgrade.entity
                    ? formatBuildingName(currentNextUpgrade.entity)
                    : "Upgrade"}
                  &nbsp;finishing first
                </Text>
              )}
            </View>
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.statusBottom}>
            <Text
              style={[styles.insightText, isUrgent && styles.insightUrgent]}
              numberOfLines={1}
            >
              {insight}
            </Text>
            <View style={styles.builderDots}>
              {Array.from({ length: currentBuilderCount }).map((_, i) => {
                const isBusy = (
                  selectedVillage === "home"
                    ? busySlots
                    : new Set(
                        builderBaseBuilders
                          .filter((u) => typeof u.builderSlot === "number")
                          .map((u) => u.builderSlot as number),
                      )
                ).has(i);
                return (
                  <View
                    key={`normal-${i}`}
                    style={[
                      styles.builderDot,
                      isBusy ? styles.builderDotBusy : styles.builderDotFree,
                    ]}
                  />
                );
              })}
              {selectedVillage === "home" &&
                isGoblinActive &&
                (() => {
                  const goblinBusy = builders.some(
                    (u) => u.builderSlot === "G",
                  );
                  const goblinCanBeUsed = canUseGoblinBuilder(
                    profile,
                    builders,
                  );
                  return (
                    <View
                      style={[
                        styles.builderDot,
                        goblinBusy
                          ? styles.goblinDotBusy
                          : goblinCanBeUsed
                            ? styles.goblinDotFree
                            : styles.goblinDotInactive,
                      ]}
                    />
                  );
                })()}
            </View>
          </View>
        </View>

        <GestureDetector gesture={swipeGesture}>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(120)}
            key={selectedVillage}
          >
            {isLoadingAccountState && <ActiveUpgradesSkeleton />}
            {/* Active Upgrades */}
            {!isLoadingAccountState && sortedUpgrades.length > 0 && (
              <View style={styles.upgradesSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.titleRow}>
                      <View style={styles.sectionIconWrap}>
                        <Image
                          source={
                            selectedVillage === "home"
                              ? {
                                  uri: `${ENV.CDN_BASE}/v2/home/other/builder-head.png`,
                                }
                              : {
                                  uri: `${ENV.CDN_BASE}/v2/builder/other/bb-head.png`,
                                }
                          }
                          style={styles.sectionIconImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      </View>
                      <Text style={styles.sectionTitle}>Active Upgrades</Text>
                    </View>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {sortedUpgrades.length}
                    </Text>
                  </View>
                </View>

                {sortedUpgrades.map((u) => {
                  const uRemainingMs = Math.max(u.endTime - Date.now(), 0);
                  const totalMs = u.endTime - u.startTime;
                  const progress = calculateProgress(u.startTime, u.endTime);
                  const isGoblin = u.builderSlot === "G";
                  const builderLabel =
                    u.builderSlot === "G"
                      ? "G"
                      : typeof u.builderSlot === "number"
                        ? `B${u.builderSlot + 1}`
                        : "?";
                  const isCompleted = completedId === u.id;

                  return (
                    <Pressable
                      key={u.id}
                      style={({ pressed }) => [
                        styles.upgradeCard,
                        isCompleted && styles.upgradeCardCompleted,
                        isGoblin && styles.goblinUpgradeCard,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleRowPress(u)}
                    >
                      <View
                        style={[
                          styles.upgradeContent,
                          isCompleted && styles.upgradeContentCompleted,
                        ]}
                      >
                        {/* Builder chip */}
                        <View
                          style={[
                            styles.builderBadge,
                            isGoblin && styles.goblinBadge,
                          ]}
                        >
                          <Text style={styles.builderBadgeText}>
                            {builderLabel}
                          </Text>
                          {isGoblin && (
                            <Image
                              source={require("@/assets/images/clash/goblin-builder.png")}
                              style={styles.goblinBadgeIcon}
                              contentFit="contain"
                            />
                          )}
                        </View>

                        {/* Main row */}
                        <View style={styles.upgradeMain}>
                          <View style={styles.upgradeLeft}>
                            <View style={styles.iconContainer}>
                              <Image
                                source={{
                                  uri: u.dataId
                                    ? resolveEntityIcon(u.dataId, {
                                        village: selectedVillage,
                                        level: u.currentLevel,
                                        isCrafted: u.isCrafted,
                                      })
                                    : FALLBACK_ICON,
                                }}
                                style={styles.upgradeIcon}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                              />
                            </View>

                            <View style={styles.upgradeNameSection}>
                              <Text
                                style={styles.upgradeName}
                                numberOfLines={1}
                              >
                                {u.isCrafted
                                  ? `${getCraftedName(u.dataId) ?? "Crafted"}${
                                      getModuleName(u.dataId, u.moduleId)
                                        ? ` (${getModuleName(u.dataId, u.moduleId)})`
                                        : ""
                                    }`
                                  : formatBuildingName(u.entity)}
                              </Text>

                              <View style={styles.badgeRow}>
                                {u.currentLevel !== undefined &&
                                  u.nextLevel !== undefined && (
                                    <View style={styles.levelsBadge}>
                                      <Text style={styles.levelsText}>
                                        Lv {u.currentLevel} → Lv {u.nextLevel}
                                      </Text>
                                    </View>
                                  )}
                                {u.hasHelper && (
                                  <View style={styles.helperRow}>
                                    <Image
                                      source={{
                                        uri: resolveEntityIcon(93000000),
                                      }}
                                      style={styles.helperIcon}
                                      contentFit="contain"
                                      cachePolicy="memory-disk"
                                    />

                                    {(u.helperAppliedSeconds ?? 0) > 0 && (
                                      <Text style={styles.helperSaved}>
                                        -
                                        {formatCountdown(
                                          (u.helperAppliedSeconds ?? 0) * 1000,
                                        )}
                                      </Text>
                                    )}

                                    {u.recurrentHelper && (
                                      <View style={styles.recurrentBadge}>
                                        <Ionicons
                                          name="repeat"
                                          size={10}
                                          color="#fbbf24"
                                        />
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>

                          <View style={styles.upgradeRight}>
                            <Text
                              style={[
                                styles.remainingTime,
                                styles.upgradeTime,
                                isGoblin && styles.goblinTime,
                              ]}
                            >
                              {formatCountdown(uRemainingMs)}
                            </Text>
                            <Text style={styles.totalTimeText}>
                              of {formatCountdown(totalMs)}
                            </Text>
                            <MagicItemTimeSaved
                              milliseconds={u.magicItemTimeSavedMs}
                            />
                          </View>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressBar,
                              { width: `${progress * 100}%` },
                              isGoblin && styles.progressBarGoblin,
                            ]}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Empty state (dimensions preserved) */}
            {!isLoadingAccountState && sortedUpgrades.length === 0 && (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconWrapper}>
                  <Image
                    source={
                      selectedVillage === "home"
                        ? {
                            uri: `${ENV.CDN_BASE}/v2/home/fallbacks/builder-idle.png`,
                          }
                        : {
                            uri: `${ENV.CDN_BASE}/v2/builder/fallbacks/master-builder-sleeping.png`,
                          }
                    }
                    style={styles.emptyIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
                <Text style={styles.emptyTitle}>No Active Upgrades</Text>
                <Text style={styles.emptySubtitle}>
                  No upgrades are currently being tracked
                </Text>
              </View>
            )}

            {isLoadingAccountState ? (
              <LabSectionSkeleton />
            ) : (
              <LabSection
                village={selectedVillage}
                labNormal={lab?.normal}
                labGoblin={lab?.goblin}
                onPress={handleRowPress}
              />
            )}

            {selectedVillage === "home" &&
              townHall >= 14 &&
              (isLoadingAccountState ? (
                <PetSectionSkeleton />
              ) : (
                <PetSection
                  pet={pet}
                  townHall={townHall}
                  onPress={handleRowPress}
                />
              ))}
          </Animated.View>
        </GestureDetector>

        <View style={styles.refreshHint}>
          <Ionicons name="arrow-down" size={13} color="#475569" />
          <Text style={styles.refreshHintText}>Pull down to refresh</Text>
        </View>

        {__DEV__ && sortedUpgrades.length > 0 && (
          <Pressable
            style={styles.devButton}
            onPress={() => {
              const first = sortedUpgrades[0];
              setCompletedId(first.id);
              setTimeout(() => setCompletedId(null), 8000);
            }}
          >
            <Text style={styles.devButtonText}>Test Completion</Text>
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            style={styles.resetButton}
            onPress={() => {
              setOnboardingIncomplete();
              router.replace("/onboarding");
            }}
          >
            <Text style={styles.resetButtonText}>Reset Onboarding</Text>
          </Pressable>
        )}
      </ScrollView>
      {/* Action Modal */}
      <MagicItemDialog
        visible={magicItemDialog !== null}
        title={magicItemDialog?.title ?? ""}
        message={magicItemDialog?.message ?? ""}
        item={magicItemDialog?.item}
        choices={magicItemDialog?.choices}
        tone={magicItemDialog?.tone}
        confirmLabel={magicItemDialog?.confirmLabel}
        onConfirm={
          magicItemDialog?.onConfirm
            ? (item) => void magicItemDialog.onConfirm?.(item)
            : undefined
        }
        onClose={() => setMagicItemDialog(null)}
      />
      <MagicItemActivityPopup
        visible={magicItemActivity !== null}
        village={magicItemActivity?.village ?? selectedVillage}
        totalSavedMs={magicItemActivity?.totalSavedMs ?? 0}
        items={magicItemActivity?.items ?? []}
        error={magicItemActivity?.error}
        onClose={() => setMagicItemActivity(null)}
      />
      <MagicItemsQuickModal
        visible={magicItemsVisible}
        village={selectedVillage}
        accountTag={activeTag}
        onClose={() => setMagicItemsVisible(false)}
        onActivated={performSync}
      />
      <UpgradeActionModal
        visible={actionModalVisible}
        upgrade={selectedUpgrade}
        progression={selectedProgression}
        onUseBook={handleUseBook}
        onClose={() => {
          setActionModalVisible(false);
          setSelectedUpgrade(null);
          setSelectedProgression(null);
        }}
        onDelete={async (upgradeId) => {
          await deleteUpgrade(upgradeId);
          await performSync();
        }}
      />
      <SupportModal
        visible={showSupport}
        onClose={() => setShowSupport(false)}
        debugInfo={debugInfo}
      />
      {/* <ProfileDropdownSheet
        visible={profileSheetVisible}
        onClose={() => setProfileSheetVisible(false)}
        onOpenProfile={() => {
          // setProfileSheetVisible(false);
          track("navigation", { from: "dropdown", to: "profile" });
          router.push("/profile");
        }}
        onSync={() => {
          // setProfileSheetVisible(false);
          track("navigation", { from: "dropdown", to: "upload-json" });
          router.push("/upload-json");
        }}
        onSetting={() => {
          // setProfileSheetVisible(false);
          track("navigation", { from: "dropdown", to: "settings" });
          router.push("/(tabs)/settings");
        }}
      /> */}

      <ProfileDropdownSheet
        ref={profileSheetRef}
        onClose={() => {
          // Sheet was dismissed by:
          // - backdrop
          // - swipe down
          // - explicit dismiss
          console.log("🔥 [HOME PROFILE SHEET CLOSED]");
        }}
        onOpenProfile={() => {
          track("navigation", {
            from: "dropdown",
            to: "profile",
          });

          router.push("/profile");
        }}
        onSync={() => {
          track("navigation", {
            from: "dropdown",
            to: "upload-json",
          });

          router.push("/upload-json");
        }}
        onSetting={() => {
          track("navigation", {
            from: "dropdown",
            to: "settings",
          });

          router.push("/(tabs)/settings");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContent: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },

  imageWrapper: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  builderImage: {
    width: 100,
    height: 100,
  },

  loadingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fbbf24",
    letterSpacing: 0.5,
  },

  loadingMessage: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },

  dotsContainer: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 16,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(148,163,184,0.4)",
  },

  connectButton: {
    height: 52,
    backgroundColor: "#fbbf24",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  connectButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },

  scrollContent: {
    paddingTop: 0,
    paddingBottom: 40,
  },

  // ── Header ──
  header: {
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#263449",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#fbbf24",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 30,
    letterSpacing: -0.4,
  },

  syncBlock: {
    alignItems: "flex-end",
    gap: 3,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  syncText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },

  profileActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  profileMagicActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  profileSavedBadge: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "rgba(52,211,153,0.08)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.22)",
  },
  profileSavedText: { color: "#34d399", fontSize: 9, fontWeight: "900" },
  profileInventoryButton: {
    minWidth: 34,
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.22)",
  },
  profileInventoryText: { color: "#fbbf24", fontSize: 9, fontWeight: "900" },
  profileRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111c2e",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 13,
    fontWeight: "800",
  },

  profileRowPressed: {
    backgroundColor: "rgba(148, 163, 184, 0.06)",
    borderRadius: 10,
    transform: [{ scale: 0.995 }],
  },

  profileInfo: {
    minWidth: 0,
  },

  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  profileName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    flexShrink: 1,
  },

  chevronButton: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "#111c2e",
    borderWidth: 1,
    borderColor: "#263449",
    alignItems: "center",
    justifyContent: "center",
  },

  leagueIcon: {
    width: 15,
    height: 15,
  },

  chiefBadge: {
    backgroundColor: "#fbbf24",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },

  chiefBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0f172a",
  },

  profileMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },

  hallIcon: {
    width: 18,
    height: 18,
  },

  trophyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  trophyIcon: {
    width: 9,
    height: 9,
  },

  profileSub: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#334155",
  },

  // ── Status Card — dimensions kept identical for active & empty states ──
  statusCard: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: "#111c2e",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#263449",
    overflow: "hidden",
  },

  statusCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },

  statusIconBox: {
    width: 50,
    height: 50,
    borderRadius: 13,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  statusCardIcon: {
    width: 36,
    height: 36,
  },

  statusBody: {
    flex: 1,
    gap: 2,
  },

  statusEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  statusCountdown: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fbbf24",
    lineHeight: 26,
  },

  statusSub: {
    fontSize: 11,
    color: "#94a3b8",
  },

  statusDivider: {
    height: 1,
    backgroundColor: "#263449",
    marginHorizontal: 14,
  },

  statusBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  insightText: {
    fontSize: 11,
    color: "#94a3b8",
    flex: 1,
    marginRight: 8,
  },

  insightUrgent: {
    color: "#ef4444",
    fontWeight: "600",
  },

  builderDots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },

  builderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  builderDotFree: {
    backgroundColor: "#22c55e",
  },

  builderDotBusy: {
    backgroundColor: "#ef4444",
  },

  goblinDotFree: {
    backgroundColor: "#22c55e",
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.35)",
  },

  goblinDotBusy: {
    backgroundColor: "#ef4444",
  },

  goblinDotInactive: {
    backgroundColor: "rgba(66,247,126,0.2)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },

  villageTabsTopSpacer: { height: 12 },
  // ── Village tabs ──
  magicItemsActionRow: {
    paddingHorizontal: 14,
    alignItems: "flex-end",
    marginTop: -8,
    marginBottom: 8,
  },
  magicItemsButton: {
    minHeight: 29,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: "rgba(251, 191, 36, 0.09)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
  },
  magicItemsButtonPressed: { opacity: 0.65 },
  magicItemsButtonText: { color: "#fbbf24", fontSize: 10, fontWeight: "800" },

  villageTabs: {
    flexDirection: "row",
    backgroundColor: "#111c2e",
    borderRadius: 999,
    padding: 4,
    height: 48,
    position: "relative",
    borderWidth: 1,
    borderColor: "#263449",
    overflow: "hidden",
    marginHorizontal: 14,
    marginBottom: 14,
  },

  villageTab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    zIndex: 10,
  },

  villageIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#fbbf24",
    zIndex: 1,
  },

  villageIcon: {
    width: 20,
    height: 20,
  },

  villageIconInactive: {
    opacity: 0.4,
  },

  villageTabLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },

  villageTabLabelActive: {
    color: "#0f172a",
  },

  villageHallBadge: {
    backgroundColor: "rgba(251,191,36,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },

  villageHallBadgeActive: {
    backgroundColor: "rgba(15,23,42,0.15)",
  },

  villageHallBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fbbf24",
  },

  villageHallBadgeTextActive: {
    color: "#0f172a",
  },

  // ── Upgrade list ──
  upgradesSection: {
    paddingHorizontal: 14,
    gap: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
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

  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  sectionIconImage: {
    width: 20,
    height: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: -0.2,
  },

  countBadge: {
    backgroundColor: "#fbbf24",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },

  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },

  upgradeCard: {
    borderRadius: 16,
    overflow: "visible",
    marginBottom: 8,
  },

  upgradeCardCompleted: {
    // shadow handled on content
  },

  upgradeContent: {
    backgroundColor: "#111c2e",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#263449",
    gap: 10,
  },

  upgradeContentCompleted: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },

  goblinUpgradeCard: {
    // kept for goblin-specific card treatment
  },

  pressed: {
    opacity: 0.7,
  },

  goblinBadge: {
    backgroundColor: "#22c55e",
  },

  builderBadge: {
    position: "absolute",
    top: -7,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fbbf24",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    zIndex: 10,
  },

  builderBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0f172a",
  },

  goblinBadgeIcon: {
    width: 13,
    height: 13,
    marginLeft: 3,
  },

  upgradeMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  upgradeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.08)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  upgradeIcon: {
    width: 38,
    height: 38,
  },

  upgradeNameSection: {
    gap: 4,
    flex: 1,
  },

  upgradeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  badgeRow: {
    flexDirection: "row",
    gap: 4,
  },

  levelsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(14,165,233,0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  levelsText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#38bdf8",
  },

  helperRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  helperIcon: {
    width: 13,
    height: 13,
  },

  helperSaved: {
    marginLeft: 3,
    fontSize: 10,
    color: "#94a3b8",
  },

  recurrentBadge: {
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  upgradeRight: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },

  remainingTime: {
    fontSize: 15,
    fontWeight: "800",
  },

  upgradeTime: {
    color: "#fbbf24",
  },

  goblinTime: {
    color: "#22c55e",
  },

  totalTimeText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },

  progressTrack: {
    height: 3,
    backgroundColor: "rgba(148,163,184,0.12)",
    borderRadius: 2,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#fbbf24",
    borderRadius: 2,
  },

  progressBarGoblin: {
    backgroundColor: "#22c55e",
  },

  // ── Empty state — dimensions kept identical to before ──
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 30,
    gap: 14,
  },

  emptyIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(251,191,36,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  emptyIcon: {
    width: 56,
    height: 56,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f1f5f9",
  },

  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },

  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#fbbf24",
  },

  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },

  // ── Refresh hint ──
  refreshHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 18,
  },

  refreshHintText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },

  // ── Dev buttons ──
  devButton: {
    alignSelf: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0ea5e9",
  },

  devButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  resetButton: {
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 16,
  },

  resetButtonText: {
    color: "#64748b",
    fontSize: 12,
  },

  // ── misc kept for other usage ──
  addButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
});
