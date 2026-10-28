import { ENV } from "@/config/env";
import { useHomeColors } from "@/theme/useHomeColors";
import { syncPremium } from "@/services/revenueCat/syncPremium";
import { usePremiumStore } from "@/stores/premiumStore";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Keyboard, StyleSheet, Text, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_BAR_HEIGHT = 64;

// Add analytics / war / upload-json back here when they ship.
const TABS: {
  name: string;
  title: string;
  active: IconName;
  inactive: IconName;
}[] = [
  { name: "index", title: "Home", active: "home", inactive: "home-outline" },
  {
    name: "profile",
    title: "Profile",
    active: "person",
    inactive: "person-outline",
  },
  {
    name: "settings",
    title: "Settings",
    active: "settings",
    inactive: "settings-outline",
  },
];

/** Material-3 style icon: a pill grows in behind the active icon. */
function TabIcon({
  focused,
  color,
  active,
  inactive,
  pillColor,
}: {
  focused: boolean;
  color: string;
  active: IconName;
  inactive: IconName;
  pillColor: string;
}) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  return (
    <View style={styles.iconWrap}>
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor: pillColor,
            opacity: progress,
            transform: [
              {
                scaleX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Ionicons name={focused ? active : inactive} size={22} color={color} />
    </View>
  );
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setVisible(false),
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

export default function TabLayout() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const adUnitId = __DEV__ ? TestIds.BANNER : ENV.ADS.BANNER_ID;

  const insets = useSafeAreaInsets();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const keyboardVisible = useKeyboardVisible();

  const [bannerLoaded, setBannerLoaded] = useState(false);

  useEffect(() => {
    syncPremium();
  }, []);

  const showBanner = !isPremium;
  // Only take up space once an ad has actually loaded
  const bannerVisible = showBanner && bannerLoaded;

  // The bottom-most visible element owns the system-nav inset
  const tabBarInset = bannerVisible ? 0 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: colors.background },

          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.textMuted,

          tabBarStyle: {
            height: TAB_BAR_HEIGHT + tabBarInset,
            paddingBottom: tabBarInset,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.borderStrong,
            elevation: 0,
          },
          tabBarItemStyle: {
            paddingTop: 8,
            paddingBottom: 8,
          },
          tabBarLabel: ({ focused, color, children }) => (
            <Text
              style={[styles.label, { color }, focused && styles.labelActive]}
              numberOfLines={1}
            >
              {children}
            </Text>
          ),
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              // Stable accessibility identifiers keep UI automation independent
              // of label ordering and prevent confusing the app tab with Android Home.
              tabBarButtonTestID: `${tab.name === "index" ? "home" : tab.name}-tab`,
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active={tab.active}
                  inactive={tab.inactive}
                  pillColor={`${colors.gold}29`}
                />
              ),
            }}
          />
        ))}
      </Tabs>

      {/* Banner sits below the tab bar, in normal flow (no overlap, no
          padding hacks). Stays mounted so it doesn't reload; collapses
          until an ad loads and while the keyboard is open. */}
      {showBanner && (
        <View
          style={[
            styles.bannerWrap,
            { paddingBottom: insets.bottom },
            !bannerVisible && styles.bannerCollapsed,
            keyboardVisible && styles.hidden,
          ]}
        >
          <BannerAd
            unitId={adUnitId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdLoaded={() => setBannerLoaded(true)}
            onAdFailedToLoad={() => setBannerLoaded(false)}
          />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useHomeColors>) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Tab icon / label ────────────────────────────────────
  iconWrap: {
    width: 56,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },

  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },

  labelActive: {
    fontWeight: "800",
  },

  // ── Banner ──────────────────────────────────────────────
  bannerWrap: {
    alignItems: "center",
    paddingTop: 6, // gap from the tab bar to avoid accidental ad taps
  },

  bannerCollapsed: {
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: "hidden",
  },

  hidden: {
    display: "none",
  },
});
