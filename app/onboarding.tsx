import { ConfirmModal } from "@/components/ConfirmModal";
import { requestNotificationPermissions } from "@/services/notifications/notificationPermissions";
import { setOnboardingComplete } from "@/storage/appConfig";
import { setNotificationsEnabled } from "@/storage/notificationConfig";
import { track } from "@/utils/analytics/analytics";
import { emitWidgetUpdate } from "@/utils/widget/widgetEvents";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    title: "Clash One",
    description:
      "Track builder upgrades, timers, and progress across your accounts.",
    image: require("@/assets/images/builder/builder-idle.png"),
    icon: "shield",
  },
  {
    title: "Widgets That Save Time",
    description: "Check upgrade status directly from your home screen.",
    image: require("@/assets/images/builder/builder-board.png"),
    icon: "grid",
  },
  {
    title: "Builder Alerts",
    description:
      "Receive notifications when upgrades finish and builders become available.",
    image: require("@/assets/images/builder/builder-complete.png"),
    icon: "notifications",
    type: "notification",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [index, fadeAnim]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const settings = await Notifications.getPermissionsAsync();
        if (settings.granted) {
          setNotificationsGranted(true);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (index + 1) * width,
        animated: true,
      });
      setIndex(index + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (!notificationsGranted) {
      setNotificationsEnabled(false);
    }
    setOnboardingComplete();

    track("onboarding_complete", {
      next_step: "add-account",
    });
    emitWidgetUpdate();

    // rescheduleAllBuilderNotifications();
    router.replace("/add-account");
  };

  const handleScroll = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
        >
          {SLIDES.map((slide, i) => (
            <Animated.View
              key={i}
              style={[
                styles.slide,
                { width },
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              {/* Icon Background */}
              <View style={styles.iconWrapper}>
                <View style={styles.iconBg}>
                  <Ionicons
                    name={slide.icon as any}
                    size={40}
                    color="#fbbf24"
                  />
                </View>
              </View>

              {/* Image */}
              <Image source={slide.image} style={styles.image} />

              {/* Title */}
              <Text style={styles.title}>{slide.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{slide.description}</Text>

              {/* Notification Button */}
              {slide.type === "notification" && (
                <Pressable
                  style={({ pressed }) => [
                    styles.enableButton,
                    notificationsGranted && styles.enableButtonActive,
                    pressed && styles.enableButtonPressed,
                  ]}
                  onPress={async () => {
                    const result = await requestNotificationPermissions();

                    if (result) {
                      setNotificationsGranted(true);
                      setNotificationsEnabled(true);
                    }
                  }}
                >
                  <Ionicons
                    name={
                      notificationsGranted
                        ? "checkmark-circle"
                        : "notifications"
                    }
                    size={20}
                    color={notificationsGranted ? "#fff" : "#0f172a"}
                  />
                  <Text style={styles.enableButtonText}>
                    {notificationsGranted
                      ? "Notifications Enabled"
                      : "Enable Notifications"}
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          ))}
        </ScrollView>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          <View style={styles.dotsWrapper}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>

          {/* Progress Text */}
          <Text style={styles.progressText}>
            {index + 1} of {SLIDES.length}
          </Text>
        </View>

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {index === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name={
              index === SLIDES.length - 1 ? "arrow-forward" : "chevron-forward"
            }
            size={20}
            color="#0f172a"
          />
        </Pressable>
      </View>
      <ConfirmModal
        visible={showPermissionModal}
        title="Enable Notifications"
        message="Notifications are disabled. To receive builder alerts, enable notifications in your device settings."
        confirmText="Open Settings"
        cancelText="Continue Anyway"
        onConfirm={() => {
          setShowPermissionModal(false);
          Linking.openSettings();
        }}
        onCancel={async () => {
          setShowPermissionModal(false);
          setNotificationsEnabled(false);
          await setOnboardingComplete();
          emitWidgetUpdate();
          router.replace("/add-account");
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

  skip: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  skipText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },

  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 60,
  },

  iconWrapper: {
    marginBottom: 24,
  },

  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },

  image: {
    width: 140,
    height: 140,
    marginBottom: 36,
    resizeMode: "contain",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  description: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  enableButton: {
    marginTop: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  enableButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.3,
  },

  enableButtonActive: {
    backgroundColor: "#22c55e",
    shadowColor: "#22c55e",
  },

  enableButtonPressed: {
    opacity: 0.85,
  },

  privacyButton: {
    marginTop: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: "#0ea5e9",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  privacyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.3,
  },

  privacyButtonPressed: {
    opacity: 0.85,
  },

  progressContainer: {
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },

  dotsWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#334155",
  },

  dotActive: {
    backgroundColor: "#fbbf24",
    width: 24,
  },

  progressText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  button: {
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#fbbf24",
    marginBottom: 40,
    elevation: 8,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    fontWeight: "700",
    fontSize: 16,
    color: "#0f172a",
  },
  builderRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
  },

  builderButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },

  builderButtonActive: {
    backgroundColor: "#fbbf24",
    borderColor: "#fbbf24",
  },

  builderButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#94a3b8",
  },

  builderButtonTextActive: {
    color: "#0f172a",
  },
});
