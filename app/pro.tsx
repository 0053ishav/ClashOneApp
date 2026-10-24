import {
  getChiefPrice,
  purchasePremium,
  restorePurchases,
} from "@/services/revenueCat/purchase";
import { usePremiumStore } from "@/stores/premiumStore";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { track } from "@/utils/analytics/analytics";
import { useRouter } from "expo-router";
import { useEffect, useState , useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ProScreen() {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [purchasing, setPurchasing] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [price, setPrice] = useState("");

  const isPremium = usePremiumStore((s) => s.isPremium);

  useEffect(() => {
    track("screen_view", { screen: "pro" });
  }, []);

  useEffect(() => {
    const loadPrice = async () => {
      try {
        const pkg = await getChiefPrice();
        if (pkg) {
          setPrice(pkg);
        }
      } catch (e) {
        console.log(e);
      }
    };

    loadPrice();
  }, []);

  const handleChief = async () => {
    if (purchasing) return;

    try {
      setPurchasing(true);

      const premium = await purchasePremium();

      if (premium) {
        usePremiumStore.getState().setPremium(true);

        setShowThankYou(true);

        track("purchase_success", {
          product: "chief_lifetime",
        });
      }
    } catch (e) {
      console.log(e);

      Alert.alert("Purchase Failed", "Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Become a Chief</Text>

        <Text style={styles.subtitle}>
          Track villages for free. Upgrade when you need more power.
        </Text>

        <PlanCard
          colors={colors}
          styles={styles}
          badge="CURRENT PLAN"
          title="FREE"
          price="₹0"
          subtitle="Track all your Clash villages"
          features={[
            "Upgrade Tracking",
            "Widgets",
            "Notifications",
            "Multi-Account Support",
            "Ads Supported",
          ]}
          buttonLabel="Current Plan"
          disabled
        />

        <PlanCard
          colors={colors}
          styles={styles}
          badge={isPremium ? "ACTIVE" : "EARLY SUPPORTER"}
          title="CHIEF"
          price={isPremium ? "Owned" : price || "..."}
          subtitle={
            isPremium
              ? "Lifetime access unlocked"
              : "Personal progression & planning"
          }
          highlight
          loading={purchasing}
          disabled={isPremium}
          features={
            isPremium
              ? [
                  "Ads Removed",
                  "Unlimited Widget Accounts",
                  "Early Supporter Badge",
                  "Future Chief Features Included",
                ]
              : [
                  "Remove Ads",
                  "Unlimited Widget Accounts",
                  "Support Independent Development",
                  "Early Supporter Badge",
                ]
          }
          buttonLabel={
            isPremium
              ? "Chief Active"
              : purchasing
                ? "Purchasing..."
                : "Unlock Chief"
          }
          onPress={handleChief}
        />

        <Pressable onPress={() => router.back()}>
          <Text style={styles.secondary}>Continue without upgrading</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            const restored = await restorePurchases();

            if (restored) {
              usePremiumStore.getState().setPremium(true);

              Alert.alert("Restored", "Chief access restored successfully.");
            } else {
              Alert.alert(
                "No Purchase Found",
                "No previous Chief purchase was found.",
              );
            }
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: colors.textMuted,
              marginTop: 12,
            }}
          >
            Restore Purchases
          </Text>
        </Pressable>
      </ScrollView>
      <Modal visible={showThankYou} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>👑</Text>

            <Text style={styles.modalTitle}>Welcome, Chief!</Text>

            <Text style={styles.modalText}>
              Thank you for supporting Clash One. Your purchase helps fund
              future development.
            </Text>

            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setShowThankYou(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

type PlanCardProps = {
  colors: HomeColors;
  styles: ReturnType<typeof createStyles>;
  badge: string;
  title: string;
  price: string;
  subtitle: string;
  loading?: boolean;
  features: string[];
  buttonLabel: string;
  disabled?: boolean;
  highlight?: boolean;
  onPress?: () => void;
};

function PlanCard({
  colors,
  styles,
  badge,
  title,
  price,
  subtitle,
  loading,
  features,
  buttonLabel,
  disabled,
  highlight,
  onPress,
}: PlanCardProps) {
  return (
    <View style={[styles.card, highlight && styles.highlightCard]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>

      <Text style={styles.planTitle}>{title}</Text>

      <Text style={styles.price}>{price}</Text>

      <Text style={styles.planSubtitle}>{subtitle}</Text>

      <View style={styles.features}>
        {features.map((feature, index) => (
          <Text
            key={`${feature}-${index}`}
            style={[
              styles.feature,
              feature === "COMING SOON" && styles.comingSoon,
            ]}
          >
            {feature === "COMING SOON" ? feature : `✓ ${feature}`}
          </Text>
        ))}
      </View>

      <Pressable
        style={[
          styles.button,
          disabled && styles.disabledButton,
          loading && styles.loadingButton,
        ]}
        disabled={disabled || loading}
        onPress={onPress}
      >
        {loading ? (
          <ActivityIndicator color={colors.textDark} />
        ) : (
          <Text
            style={[styles.buttonText, disabled && styles.disabledButtonText]}
          >
            {buttonLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  title: {
    color: colors.gold,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 24,
    letterSpacing: -0.6,
  },

  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  highlightCard: {
    borderColor: colors.gold,
    backgroundColor: colors.surfaceRaised,
    shadowColor: colors.gold,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(251,191,36,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "800",
  },

  planTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12,
  },

  price: {
    color: colors.gold,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },

  planSubtitle: {
    color: colors.textMuted,
    marginTop: 4,
  },

  features: {
    marginTop: 18,
    gap: 10,
  },

  feature: {
    color: colors.textPrimary,
    fontSize: 14,
  },

  comingSoon: {
    color: colors.gold,
    fontWeight: "800",
    marginTop: 4,
  },

  button: {
    marginTop: 22,
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: colors.gold,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  buttonText: {
    color: colors.textDark,
    fontWeight: "900",
    fontSize: 15,
  },

  disabledButton: {
    backgroundColor: colors.borderStrong,
  },

  disabledButtonText: {
    color: colors.textMuted,
  },

  secondary: {
    textAlign: "center",
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 30,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    width: "85%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  modalEmoji: {
    fontSize: 50,
  },

  modalTitle: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },

  modalText: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },

  modalButton: {
    marginTop: 20,
    backgroundColor: colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  modalButtonText: {
    color: colors.textDark,
    fontWeight: "800",
  },

  loadingButton: {
    opacity: 0.8,
  },
});
