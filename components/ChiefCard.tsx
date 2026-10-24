import { usePremiumStore } from "@/stores/premiumStore";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ChiefCard() {
  const router = useRouter();
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isPremium = usePremiumStore((state) => state.isPremium);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>👑</Text>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isPremium ? "Chief" : "Become Chief"}
          </Text>

          <Text style={styles.subtitle}>
            {isPremium
              ? "Thank you for supporting Clash One"
              : "Remove ads and unlock unlimited widget accounts"}
          </Text>
        </View>
      </View>
      {!isPremium && (
        <>
          <View style={styles.features}>
            <Text style={styles.feature}>✓ No Ads</Text>

            <Text style={styles.feature}>✓ Unlimited Widget Accounts</Text>

            <Text style={styles.feature}>
              ✓ Support Independent Development
            </Text>

            {isPremium && <Text style={styles.feature}>✓ Early Supporter</Text>}
          </View>

          <Pressable onPress={() => router.push("/pro")} style={styles.button}>
            <Text style={styles.buttonText}>
              {!isPremium ? "Support" : "👑 Lifetime Support Active"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 4,

    backgroundColor: colors.surface,

    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,

    padding: 16,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 6,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    fontSize: 28,
    marginRight: 12,
  },

  title: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "800",
  },

  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },

  features: {
    marginTop: 14,
    gap: 6,
  },

  feature: {
    color: colors.textPrimary,
    fontSize: 13,
  },

  button: {
    backgroundColor: colors.gold,

    marginTop: 16,

    paddingVertical: 12,

    borderRadius: 10,

    alignItems: "center",
  },

  buttonText: {
    color: colors.textDark,
    fontWeight: "800",
    fontSize: 15,
  },

  activeBadge: {
    marginTop: 16,

    backgroundColor: `${colors.gold}1F`,

    borderWidth: 1,
    borderColor: "#fbbf24",

    borderRadius: 10,

    paddingVertical: 12,

    alignItems: "center",
  },

  activeBadgeText: {
    color: "#fbbf24",
    fontWeight: "700",
    fontSize: 14,
  },
});
