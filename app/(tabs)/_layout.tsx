import { ENV } from "@/config/env";
import { syncPremium } from "@/services/revenueCat/syncPremium";
import { usePremiumStore } from "@/stores/premiumStore";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Keyboard, StyleSheet, Text, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

const GOLD = "#fbbf24";
const INACTIVE = "#94a3b8";
const BAR_BG = "#1e293b";
const BORDER = "#334155";
const APP_BG = "#0f172a";
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
}: {
  focused: boolean;
  color: string;
  active: IconName;
  inactive: IconName;
}) {
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
          {
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
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: APP_BG },

          tabBarActiveTintColor: GOLD,
          tabBarInactiveTintColor: INACTIVE,

          tabBarStyle: {
            height: TAB_BAR_HEIGHT + tabBarInset,
            paddingBottom: tabBarInset,
            backgroundColor: BAR_BG,
            borderTopWidth: 1,
            borderTopColor: BORDER,
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
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  active={tab.active}
                  inactive={tab.inactive}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BG,
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
    backgroundColor: "rgba(251, 191, 36, 0.16)",
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
    backgroundColor: APP_BG,
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
