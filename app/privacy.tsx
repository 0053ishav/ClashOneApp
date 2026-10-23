import { Ionicons } from "@expo/vector-icons";
import { HOME_COLORS } from "@/theme/home";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Initial animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={HOME_COLORS.gold} />
            </Pressable>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Privacy Policy</Text>
              <Text style={styles.headerSubtitle}>Your data matters to us</Text>
            </View>
          </View>

          {/* Last Updated */}
          <Animated.View
            style={[
              styles.card,
              styles.infoCard,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.infoContent}>
              <Ionicons name="calendar" size={20} color={HOME_COLORS.gold} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>May 2026</Text>
              </View>
            </View>
          </Animated.View>

          {/* Overview Section */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color={HOME_COLORS.success} />
              <Text style={styles.sectionTitle}>Your Privacy</Text>
            </View>
            <Text style={styles.sectionText}>
              Clash One is designed to help players track upgrades and builder
              activity. The app stores most gameplay data locally on your
              device. Some third-party services such as advertising providers
              may collect limited technical information in accordance with their
              own privacy policies.
            </Text>
          </View>

          {/* Data Collection */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-outline" size={20} color={HOME_COLORS.blue} />
              <Text style={styles.sectionTitle}>Data We Collect</Text>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  Clash of Clans player tags you choose to add
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  Upgrade tracking and builder information
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  Notification preferences and reminder settings
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  Anonymous analytics and app performance information (if
                  enabled)
                </Text>
              </View>
            </View>
          </View>

          {/* Data We Don't Collect */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ban" size={20} color={HOME_COLORS.danger} />
              <Text style={styles.sectionTitle}>What We Don&apos;t Do</Text>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  We do not sell your personal information
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  We do not request your Clash of Clans login credentials
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  We do not modify your Clash of Clans account or game data
                </Text>
              </View>
            </View>
          </View>

          {/* Data Storage */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="folder-outline" size={20} color={HOME_COLORS.purple} />
              <Text style={styles.sectionTitle}>Data Storage</Text>
            </View>
            <Text style={styles.sectionText}>
              All your data is stored locally on your device. We don&apos;t use
              cloud storage or remote servers to store your information. You
              have full control over your data and can delete it anytime.
            </Text>
          </View>

          {/* Permissions */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="key-outline" size={20} color={HOME_COLORS.pink} />
              <Text style={styles.sectionTitle}>App Permissions</Text>
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Ionicons name="notifications" size={18} color={HOME_COLORS.gold} />
              </View>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>Notifications</Text>
                <Text style={styles.permissionDesc}>
                  Used to alert you when upgrades complete
                </Text>
              </View>
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionIcon}>
                <Ionicons name="document" size={18} color={HOME_COLORS.gold} />
              </View>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>File Access</Text>
                <Text style={styles.permissionDesc}>
                  Only for importing player JSON files
                </Text>
              </View>
            </View>
          </View>

          {/* Children's Privacy */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color={HOME_COLORS.cyan} />
              <Text style={styles.sectionTitle}>Children&apos;s Privacy</Text>
            </View>
            <Text style={styles.sectionText}>
              We don&apos;t knowingly collect information from children under
              13. If we become aware of such collection, we will delete the
              information immediately.
            </Text>
          </View>

          {/* Advertising */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone" size={20} color={HOME_COLORS.success} />
              <Text style={styles.sectionTitle}>Advertising</Text>
            </View>

            <Text style={styles.sectionText}>
              Clash one may display advertisements provided by Google AdMob.
              Advertising partners may collect device identifiers, approximate
              location, and usage information to provide and measure ads. Please
              review Google&apos;s privacy policy for more information about how
              advertising data is handled.
            </Text>
          </View>

          {/* Changes */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="refresh" size={20} color={HOME_COLORS.teal} />
              <Text style={styles.sectionTitle}>Policy Changes</Text>
            </View>
            <Text style={styles.sectionText}>
              We may update this privacy policy occasionally. Changes will be
              reflected here with an updated &quot;Last Updated&quot; date. Your
              continued use of the app constitutes acceptance of the new policy.
            </Text>
          </View>

          {/* Disclaimer */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={20} color={HOME_COLORS.orange} />
              <Text style={styles.sectionTitle}>Disclaimer</Text>
            </View>
            <Text style={styles.sectionText}>
              This content is not affiliated with, endorsed, sponsored, or
              specifically approved by Supercell and Supercell is not
              responsible for it. For more information see Supercell&apos;s Fan
              Content Policy.
            </Text>
            <Pressable
              onPress={() =>
                Linking.openURL("https://supercell.com/en/fan-content-policy/")
              }
            >
              <Text
                style={{
                  color: HOME_COLORS.gold,
                  marginTop: 10,
                  fontWeight: "600",
                }}
              >
                Open Fan Content Policy
              </Text>
            </Pressable>
          </View>

          {/* Contact */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="mail" size={20} color={HOME_COLORS.gold} />
              <Text style={styles.sectionTitle}>Contact Us</Text>
            </View>

            <Text style={styles.sectionText}>
              Questions, feedback, bug reports, or privacy concerns? Contact us
              anytime.
            </Text>

            <Pressable
              style={styles.linkButton}
              onPress={() =>
                Linking.openURL(
                  "mailto:legal@clashwidget.online?subject=Clash One Support",
                )
              }
            >
              <Ionicons name="mail-outline" size={18} color={HOME_COLORS.gold} />
              <Text style={styles.linkButtonText}>
                legal@clashwidget.online
              </Text>
            </Pressable>
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.backButtonFull,
              pressed && styles.backButtonFullPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Close</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HOME_COLORS.background,
  },

  container: {
    paddingTop: 0,
    paddingBottom: 80,
  },

  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: HOME_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: HOME_COLORS.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerContent: {
    flex: 1,
    gap: 4,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: HOME_COLORS.gold,
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 12,
    color: HOME_COLORS.textMuted,
    fontWeight: "500",
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: HOME_COLORS.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderStrong,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  infoCard: {
    borderLeftWidth: 3,
    borderLeftColor: HOME_COLORS.gold,
    backgroundColor: "rgba(251,191,36,0.06)",
  },

  infoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoText: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: HOME_COLORS.textMuted,
    fontWeight: "600",
  },

  infoValue: {
    fontSize: 14,
    color: HOME_COLORS.gold,
    fontWeight: "700",
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
  },

  sectionText: {
    fontSize: 13,
    color: HOME_COLORS.textSecondary,
    lineHeight: 20,
  },

  bulletList: {
    gap: 10,
    marginTop: 4,
  },

  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HOME_COLORS.gold,
    marginTop: 7,
  },

  bulletText: {
    fontSize: 13,
    color: HOME_COLORS.textSecondary,
    flex: 1,
    lineHeight: 19,
  },

  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(251,191,36,0.06)",
    borderRadius: 10,
    marginBottom: 10,
  },

  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(251,191,36,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  permissionInfo: {
    flex: 1,
    gap: 2,
  },

  permissionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: HOME_COLORS.textPrimary,
  },

  permissionDesc: {
    fontSize: 12,
    color: HOME_COLORS.textMuted,
  },

  backButtonFull: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.gold,
    alignItems: "center",
    shadowColor: HOME_COLORS.gold,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  backButtonFullPressed: {
    opacity: 0.85,
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: HOME_COLORS.textDark,
  },

  linkButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  linkButtonText: {
    color: HOME_COLORS.gold,
    fontSize: 13,
    fontWeight: "600",
  },
});
