import { ConfirmModal } from "@/components/ConfirmModal";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { SupportModal } from "@/components/SupportModal";
import { initDatabase } from "@/db/initDatabase";
import { configureNotifications } from "@/engine/notifications/notificationEngine";
import { useInAppUpdates } from "@/hooks/useInAppUpdate";
import { RemoteConfigProvider } from "@/provider/remoteConfigProvider";
import {
  hydrateCraftedDefenses,
  hydrateEntities,
} from "@/services/cdnEntities";
import { ensureCraftedLoaded } from "@/services/craftedService";
import {
  hydrateProgression,
  hyradteCraftedDefenseProgression,
  syncProgression,
} from "@/services/progression";
import { syncPremiumStatus } from "@/services/revenueCat/premium";
import { initRevenueCat } from "@/services/revenueCat/revenueCat";
import { buildSupportInfo } from "@/services/supportDebugInfo";
import { isOnboardingComplete } from "@/storage/appConfig";
import { syncEntities } from "@/storage/syncEntities";
import { useAccountStore } from "@/stores/accountStore";
import { useThemeStore } from "@/stores/themeStore";
import { useHammerJamStore } from "@/stores/hammerJamStore";
import { setSessionSource, track } from "@/utils/analytics/analytics";
import { log } from "@/utils/logger";
import { startSmartWidgetScheduler } from "@/utils/scheduleWidgetRefresh";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { initWidgetManager } from "@/utils/widget/widgetManager";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
// Fade the native splash into the app instead of switching abruptly.
SplashScreen.setOptions({ duration: 800, fade: true });

Sentry.init({
  dsn: "https://d2e012e1209309eb649f09114ae454a6@o4511557895258112.ingest.us.sentry.io/4511557898272768",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
});

enum BootStage {
  Initializing = "initializing",
  Database = "database",
  LoadingAccounts = "loading_accounts",
  LoadingActiveAccount = "loading_active_account",
  Ready = "ready",
  Fatal = "fatal",
}

enum BootErrorCode {
  DATABASE_INIT = "BOOT_DATABASE_INIT",
  LOAD_ACCOUNTS = "BOOT_LOAD_ACCOUNTS",
  LOAD_ACTIVE_ACCOUNT = "BOOT_LOAD_ACTIVE_ACCOUNT",
  UNKNOWN = "BOOT_UNKNOWN",
}

type BootError = {
  code: BootErrorCode;
  stage: BootStage;
  message: string;
  error: unknown;
};

export default Sentry.wrap(function RootLayout() {
  const colors = useHomeColors();
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loadActiveAccount = useAccountStore((s) => s.loadActiveAccount);

  const [bootStage, setBootStage] = useState(BootStage.Initializing);
  const [bootError, setBootError] = useState<BootError | null>(null);

  const pathname = usePathname();
  const complete = isOnboardingComplete();

  const isOnboardingRoute = pathname === "/onboarding";

  const router = useRouter();
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadLastSync = useAccountStore((s) => s.loadLastSync);

  const [retryCount, setRetryCount] = useState(0);
  const [showSupport, setShowSupport] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  const bootStageLabel = {
    [BootStage.Initializing]: "Initializing...",
    [BootStage.Database]: "Preparing Village Storage",
    [BootStage.LoadingAccounts]: "Loading Accounts",
    [BootStage.LoadingActiveAccount]: "Opening Village",
    [BootStage.Ready]: "Ready",
    [BootStage.Fatal]: "Failed",
  };

  const bootProgress = {
    [BootStage.Initializing]: 0,
    [BootStage.Database]: 1,
    [BootStage.LoadingAccounts]: 2,
    [BootStage.LoadingActiveAccount]: 3,
    [BootStage.Ready]: 3,
    [BootStage.Fatal]: 0,
  };

  const openSupport = async () => {
    const info = await buildSupportInfo();
    setDebugInfo(info);
    setShowSupport(true);
  };

  async function safeTask(name: string, task: () => Promise<void>) {
    try {
      await task();
    } catch (e) {
      console.error(`${name} failed`, e);

      Sentry.captureException(e, {
        tags: {
          bootstrapTask: name,
        },
      });
    }
  }

  function createBootError(
    code: BootErrorCode,
    stage: BootStage,
    error: unknown,
  ): BootError {
    return {
      code,
      stage,
      message: error instanceof Error ? error.message : "Unknown error",
      error,
    };
  }

  const runCriticalBoot = useCallback(async () => {
    try {
      setBootStage(BootStage.Database);

      await initDatabase();
    } catch (e) {
      throw createBootError(BootErrorCode.DATABASE_INIT, BootStage.Database, e);
    }

    try {
      setBootStage(BootStage.LoadingAccounts);

      await loadAccounts();
    } catch (e) {
      throw createBootError(
        BootErrorCode.LOAD_ACCOUNTS,
        BootStage.LoadingAccounts,
        e,
      );
    }

    try {
      setBootStage(BootStage.LoadingActiveAccount);
      await loadActiveAccount();
    } catch (e) {
      throw createBootError(
        BootErrorCode.LOAD_ACTIVE_ACCOUNT,
        BootStage.LoadingActiveAccount,
        e,
      );
    }
  }, [loadAccounts, loadActiveAccount]);

  const runBackgroundBoot = useCallback(async () => {
    await Promise.allSettled([
      safeTask("Hammer Jam", async () => {
        await useHammerJamStore.getState().sync();
      }),

      safeTask("RevenueCat", async () => {
        await initRevenueCat();
        await syncPremiumStatus();
      }),

      safeTask("Crafted", ensureCraftedLoaded),

      safeTask("Notifications", configureNotifications),

      safeTask("Entities", async () => {
        await syncEntities();
        hydrateEntities();
        hydrateCraftedDefenses();
      }),

      safeTask("Progression", async () => {
        await syncProgression();
        hydrateProgression();
        hyradteCraftedDefenseProgression();
      }),

      safeTask("Widgets", async () => {
        initWidgetManager();
        startSmartWidgetScheduler();
        emitWidgetUpdate();
      }),

      safeTask("LastSync", async () => {
        loadLastSync();
      }),
    ]);
  }, [loadLastSync]);

  const bootstrapInFlightRef = useRef<Promise<void> | null>(null);

  const runBootstrap = useCallback((): Promise<void> => {
    if (bootstrapInFlightRef.current) {
      return bootstrapInFlightRef.current;
    }

    const pending = (async () => {
      try {
        setBootError(null);

        await runCriticalBoot();

        setBootStage(BootStage.Ready);

        // Don't block UI
        void runBackgroundBoot();
      } catch (err) {
        const boot =
          err && typeof err === "object" && "code" in err && "stage" in err
            ? (err as BootError)
            : createBootError(BootErrorCode.UNKNOWN, BootStage.Fatal, err);
        console.error("Bootstrap Failed", boot);

        Sentry.captureException(boot.error, {
          tags: {
            bootStage: boot.stage,
            bootCode: boot.code,
          },
        });

        track("bootstrap_failed", {
          code: boot.code,
          stage: boot.stage,
          message: boot.message,
        });

        setBootError(boot);

        setBootStage(BootStage.Fatal);
      }
    })();

    bootstrapInFlightRef.current = pending;

    const clearInFlight = () => {
      if (bootstrapInFlightRef.current === pending) {
        bootstrapInFlightRef.current = null;
      }
    };
    void pending.then(clearInFlight, clearInFlight);

    return pending;
  }, [runCriticalBoot, runBackgroundBoot]);

  useEffect(() => {
    if (!complete) {
      setBootStage(BootStage.Ready);
      return;
    }
    void runBootstrap();
  }, [complete, runBootstrap]);

  const {
    updateModalVisible,
    setUpdateModalVisible,
    storeVersion,
    startUpdate,
  } = useInAppUpdates(bootStage === BootStage.Ready);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(
      (notification) => {
        log("📬 RECEIVED", {
          id: notification.request.identifier,
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });
      },
    );

    return () => received.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        log("👆 OPENED", {
          id: response.notification.request.identifier,
          title: response.notification.request.content.title,
          data: response.notification.request.content.data,
        });
        setSessionSource("notification");

        track("notification_open", {
          type: data?.type,
        });
      },
    );

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (!url) return;

      const { hostname, queryParams } = Linking.parse(url);

      if (queryParams?.source === "widget") {
        setSessionSource("widget");
        track("widget_open", { target: hostname });
      } else {
        setSessionSource("app");
      }

      if (hostname === "add-account") {
        router.push("/add-account");
      }
      if (hostname === "pro") {
        router.push("/pro");
      }
    };

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      sub.remove();
    };
  }, [router]);

  if (!complete && !isOnboardingRoute) {
    return <Redirect href="/onboarding" />;
  }

  if (bootStage !== BootStage.Ready && bootStage !== BootStage.Fatal) {
    return (
      <View style={[styles.container, styles.loadingOverlay]}>
        <StatusBar style={colorScheme === "light" ? "dark" : "light"} backgroundColor={colors.background} />
        <View style={styles.loadingContent}>
          <View style={styles.imageWrapper}>
            <Image
              source={require("@/assets/images/builder/builder-idle.png")}
              style={styles.builderImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.loadingTitle}>Preparing Village</Text>

          <Text style={styles.loadingMessage}>{bootStageLabel[bootStage]}</Text>

          <View style={styles.stageContainer}>
            {[
              BootStage.Database,
              BootStage.LoadingAccounts,
              BootStage.LoadingActiveAccount,
            ].map((stage, index) => {
              const current = bootProgress[bootStage];

              const completed = current > index + 1;
              const active = current === index + 1;

              return (
                <View key={stage} style={styles.stageRow}>
                  <View
                    style={[
                      styles.stageIndicator,
                      completed && styles.stageCompleted,
                      active && styles.stageActive,
                    ]}
                  />

                  <Text
                    style={[
                      styles.stageText,
                      completed && styles.stageCompletedText,
                      active && styles.stageActiveText,
                    ]}
                  >
                    {bootStageLabel[stage]}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (bootStage === BootStage.Fatal) {
    return (
      <View style={[styles.container, styles.loadingOverlay]}>
        <StatusBar style={colorScheme === "light" ? "dark" : "light"} backgroundColor={colors.background} />
        {retryCount >= 2 && (
          <Pressable
            style={styles.supportButton}
            onPress={openSupport}
            hitSlop={12}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        )}

        <SupportModal
          visible={showSupport}
          onClose={() => setShowSupport(false)}
          debugInfo={debugInfo}
        />

        <View style={styles.loadingContent}>
          <View style={styles.villagerImageWrapper}>
            <View style={styles.villagerCrop}>
              <Image
                source={require("@/assets/images/clash/villager.png")}
                style={styles.villagerImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.loadingTitle}>Village Couldn&apos;t Open</Text>

          <Text style={styles.loadingMessage}>
            We couldn&apos;t finish preparing your village.
          </Text>

          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Technical Details</Text>

            <View style={styles.errorRow}>
              <Text style={styles.errorLabel}>Stage</Text>

              <Text style={styles.errorValue}>
                {bootStageLabel[bootError?.stage ?? BootStage.Initializing]}
              </Text>
            </View>

            <View style={styles.errorRow}>
              <Text style={styles.errorLabel}>Code</Text>

              <Text style={styles.errorValue}>{bootError?.code}</Text>
            </View>

            <View style={styles.errorRow}>
              <Text style={styles.errorLabel}>Message</Text>

              <Text style={styles.errorValue}>{bootError?.message}</Text>
            </View>
          </View>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setRetryCount((v) => v + 1);

              setBootError(null);
              setBootStage(BootStage.Initializing);

              runBootstrap();
            }}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>

          {retryCount >= 2 && (
            <Pressable onPress={openSupport} style={styles.supportAction}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#94a3b8"
              />

              <Text style={styles.supportActionText}>Contact Support</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <RemoteConfigProvider>
          <>
            <StatusBar style={colorScheme === "light" ? "dark" : "light"} backgroundColor={colors.background} />
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="upload-json"
                options={{ headerShown: false }}
              />
              {/* <Stack.Screen name="add-upgrade" options={{ headerShown: false }} /> */}
              <Stack.Screen
                name="onboarding"
                options={{ headerShown: false }}
              />
            </Stack>
            <ConfirmModal
              visible={updateModalVisible}
              title="New Version Available"
              message={`A newer version of Clash One is available.

Version: ${storeVersion ?? "Latest"}

• Bug fixes
• New features
• Performance improvements

Update now for the best experience.`}
              confirmText="Update"
              cancelText="Later"
              onConfirm={async () => {
                track("update_accepted");

                setUpdateModalVisible(false);

                await startUpdate();
              }}
              onCancel={() => {
                track("update_dismissed");

                setUpdateModalVisible(false);
              }}
            />
          </>
        </RemoteConfigProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
});

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  supportButton: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  imageWrapper: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    zIndex: 1,
  },

  villagerImageWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  villagerCrop: {
    width: 180,
    height: 120,
    overflow: "hidden",
    position: "relative",
  },

  villagerImage: {
    width: 180,
    height: 240,
  },

  fadeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: colors.background,
    opacity: 0.8,
  },

  builderImage: {
    width: 100,
    height: 100,
  },

  loadingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.gold,
    letterSpacing: 0.5,
  },

  loadingMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  stageContainer: {
    marginTop: 28,
    width: "100%",
    maxWidth: 260,
  },

  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  stageIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.slateMuted,
    marginRight: 12,
  },

  stageCompleted: {
    backgroundColor: colors.success,
  },

  stageActive: {
    backgroundColor: colors.gold,
  },

  stageText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  stageCompletedText: {
    color: colors.textPrimary,
  },

  stageActiveText: {
    color: colors.gold,
    fontWeight: "700",
  },

  errorCard: {
    marginTop: 24,
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  errorCardTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: 14,
    fontSize: 14,
  },

  errorRow: {
    marginBottom: 10,
  },

  errorLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  errorValue: {
    color: colors.textPrimary,
    marginTop: 2,
    fontSize: 13,
  },

  retryButton: {
    marginTop: 22,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },

  retryText: {
    color: colors.textDark,
    fontWeight: "800",
    fontSize: 15,
  },

  supportAction: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  supportActionText: {
    color: colors.textSecondary,
    fontWeight: "600",
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
    backgroundColor: `${colors.textMuted}66`,
  },

  dotActive: {
    backgroundColor: colors.gold,
    width: 20,
  },
});
