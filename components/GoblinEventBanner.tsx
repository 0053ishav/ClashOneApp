import { ENV } from "@/config/env";
import { formatCountdown } from "@/utils/formatCountdown";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
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
  eventEndsAt: number;
  onDismiss: () => void;
};

export default function GoblinEventBanner({ eventEndsAt, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(
    Math.max(eventEndsAt - Date.now(), 0),
  );

  const slideAnim = useRef(new Animated.Value(-80)).current;
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(eventEndsAt - Date.now(), 0));
    }, 1000);

    return () => clearInterval(interval);
  });

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss();
    });
  };

  if (!isVisible || remaining <= 0) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.leftSection}>
        <View style={styles.iconWrapper}>
          <Image
            source={{ uri: `${ENV.CDN_BASE}/entities/resources/gem.png` }}
            style={{ width: 18, height: 18 }}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textSection}>
          <Text style={styles.title}>Goblin Builder Active!</Text>
          <Text style={styles.subtitle}>
            Ends in {formatCountdown(remaining)}
          </Text>
        </View>
      </View>

      <Pressable style={styles.dismissBtn} onPress={handleDismiss}>
        <Ionicons name="close" size={18} color="#ffffff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#16a34a",
    marginHorizontal: 16,
    marginTop: 30,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 15,
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  textSection: {
    gap: 4,
  },

  title: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },

  dismissBtn: {
    padding: 6,
  },
});
