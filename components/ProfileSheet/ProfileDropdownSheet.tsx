import ProfileActions from "@/components/ProfileSheet/ProfileActions";
import ProfileHeader from "@/components/ProfileSheet/ProfileHeader";
import ProfileStatsGrid from "@/components/ProfileSheet/ProfileStatsGrid";
import { getEntities } from "@/services/entityService";
import { useAccountStore } from "@/stores/accountStore";
import { EntityRecord } from "@/types/upgrade";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSync: () => void;
  onSetting: () => void;
  onOpenProfile: () => void;
};

export default function ProfileDropdownSheet({
  visible,
  onClose,
  onSync,
  onSetting,
  onOpenProfile,
}: ProfileSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  const activeTag = useAccountStore((s) => s.activeTag);
  const accounts = useAccountStore((s) => s.accounts);
  const switchAccount = useAccountStore((s) => s.switchAccount);

  const profile = useAccountStore((s) =>
    s.activeTag ? (s.profilesByTag[s.activeTag] ?? null) : null,
  );

  const [entities, setEntities] = useState<EntityRecord[] | null>(null);

  useEffect(() => {
    if (visible && profile && entities !== null) {
      requestAnimationFrame(() => {
        bottomSheetRef.current?.present();
      });
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, profile, entities]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!visible || !activeTag) return;

      setEntities(null);

      try {
        const data = await getEntities(activeTag);

        if (mounted) {
          setEntities(data);
        }
      } catch (e) {
        console.error("❌ DROPDOWN ENTITY ERROR", activeTag, e);

        if (mounted) {
          setEntities([]);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [visible, activeTag]);

  async function handleAccountSwitch(tag: string) {
    if (tag === activeTag) return;

    onClose();
    await switchAccount(tag);
  }

  const handleDismiss = () => {
    onClose();
  };

  if (!profile || entities === null) {
    return null;
  }

  const activeAccount = accounts.find((a) => a.tag === activeTag);

  const helpers = entities.filter((e) => e.type?.toLowerCase() === "helper");

  const guardians = entities.filter(
    (e) => e.type?.toLowerCase() === "guardian",
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["60%", "92%"]}
      enablePanDownToClose
      onDismiss={handleDismiss}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handle}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
          opacity={0.65}
        />
      )}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Profile */}
        <ProfileHeader
          key={activeTag}
          profile={profile}
          helpers={helpers}
          guardians={guardians}
        />

        {/* Accounts */}
        {accounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="people-outline" size={16} color="#94a3b8" />

                <Text style={styles.sectionTitle}>Accounts</Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{accounts.length}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarRow}
            >
              {accounts.map((acc) => {
                const isActive = acc.tag === activeTag;
                const initials = acc.name.slice(0, 2).toUpperCase();

                return (
                  <Pressable
                    key={acc.tag}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isActive
                        ? `${acc.name}, active account`
                        : `Switch to ${acc.name}`
                    }
                    accessibilityState={{ selected: isActive }}
                    onPress={() => handleAccountSwitch(acc.tag)}
                    style={({ pressed }) => [
                      styles.avatarItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          borderColor: isActive ? acc.color : `${acc.color}66`,
                          backgroundColor: isActive
                            ? `${acc.color}20`
                            : "#172235",
                        },
                      ]}
                    >
                      <Text
                        style={[styles.avatarInitials, { color: acc.color }]}
                      >
                        {initials}
                      </Text>

                      {isActive && (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: acc.color },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={10}
                            color="#0f172a"
                          />
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.avatarLabel,
                        isActive && styles.avatarLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {acc.name}
                    </Text>

                    <Text style={styles.avatarSub}>TH{acc.townhall}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Stats */}
        {profile.playerTag && (
          <View style={styles.section}>
            <ProfileStatsGrid
              profile={profile}
              builderCount={activeAccount?.builderCount ?? 1}
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <ProfileActions
            onSync={onSync}
            onSetting={onSetting}
            onOpenProfile={onOpenProfile}
            onClose={onClose}
          />
        </View>

        {/* Close */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close profile"
          onPress={() => bottomSheetRef.current?.dismiss()}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}
        >
          <Ionicons name="close" size={18} color="#94a3b8" />

          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#0b1220",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "#263449",
  },

  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#475569",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  pressed: {
    opacity: 0.65,
  },

  section: {
    marginTop: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#cbd5e1",
    letterSpacing: -0.1,
  },

  countBadge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#172235",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#263449",
  },

  countBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
  },

  avatarRow: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },

  avatarItem: {
    width: 70,
    alignItems: "center",
    gap: 5,
  },

  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitials: {
    fontSize: 14,
    fontWeight: "800",
  },

  activeBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#0b1220",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarLabel: {
    width: 70,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },

  avatarLabelActive: {
    color: "#f1f5f9",
    fontWeight: "700",
  },

  avatarSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },

  actionsSection: {
    marginTop: 18,
  },

  closeButton: {
    height: 48,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#111c2e",
    borderWidth: 1,
    borderColor: "#263449",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  closeButtonPressed: {
    backgroundColor: "#172235",
  },

  closeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94a3b8",
  },
});
