import type { HammerJamManifest } from "@/engine/magicItems/hammerJam";
import { isHammerJamActive } from "@/engine/magicItems/hammerJam";
import { formatCountdown } from "@/utils/formatCountdown";
import {
  setHammerJamBannerDismissedUntil,
  shouldShowHammerJamBanner,
} from "@/storage/hammerJamStorage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  manifest: HammerJamManifest;
};

export function HammerJamBanner({ manifest }: Props) {
  const [now, setNow] = useState(Date.now());
  const [dismissed, setDismissed] = useState(
    () => !shouldShowHammerJamBanner(manifest.endsAt),
  );
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const active = isHammerJamActive(manifest, now) && Boolean(manifest.endsAt);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const shouldShow = shouldShowHammerJamBanner(manifest.endsAt);
    setDismissed(!shouldShow);
    if (!active || !shouldShow) return;

    slideAnim.setValue(-100);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => slideAnim.stopAnimation();
  }, [active, manifest.startsAt, manifest.endsAt, slideAnim]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDismissed(true);
        if (manifest.endsAt) {
          setHammerJamBannerDismissedUntil(manifest.endsAt);
        }
      }
    });
  };

  if (!active || dismissed || !manifest.endsAt) return null;

  const remainingMs = Math.max(Date.parse(manifest.endsAt) - now, 0);

  return (
    <Animated.View
      accessibilityRole="summary"
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.iconContainer}>
        <Image
          source={{
            uri: "https://cdn.clashwidget.online/v2/home/other/builder-head.png",
          }}
          style={styles.builderIcon}
          resizeMode="contain"
          accessibilityLabel="Builder"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{manifest.title}</Text>
        <Text style={styles.subtitle}>
          {Math.round((1 - manifest.timeMultiplier) * 100)}% less upgrade time · {Math.round((1 - manifest.costMultiplier) * 100)}% lower upgrade costs
        </Text>
        <Text style={styles.subtitle}>
          {Math.round((manifest.resourceMultiplier - 1) * 100)}% more resource production
        </Text>
        <Text style={styles.countdown}>
          Ends in {formatCountdown(remainingMs)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss Hammer Jam banner"
        hitSlop={8}
        onPress={handleDismiss}
        style={styles.dismissButton}
      >
        <Ionicons name="close" size={18} color="#451a03" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fbbf24",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  builderIcon: {
    width: 34,
    height: 34,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    color: "#451a03",
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    color: "#78350f",
    fontSize: 11,
    fontWeight: "600",
  },
  countdown: {
    color: "#78350f",
    fontSize: 12,
    fontWeight: "700",
  },
  dismissButton: {
    padding: 4,
    flexShrink: 0,
  },
});
