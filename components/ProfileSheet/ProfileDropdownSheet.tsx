import ProfileHeader from "@/components/ProfileSheet/ProfileHeader";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import { getEntities } from "@/services/entityService";
import { useAccountStore } from "@/stores/accountStore";
import { EntityRecord } from "@/types/upgrade";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { resolveEntityIcon } from "@/utils/icons/resolveEntityIcon";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
} from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ProfileActions from "./ProfileActions";
import StatsGrid from "@/components/Profile/StatsGrid";

function formatCapital(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toString();
}

export type ProfileDropdownSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type ProfileSheetProps = {
  onClose?: () => void;
  onSync: () => void;
  onSetting: () => void;
  onOpenProfile: () => void;
};

const ProfileDropdownSheet = forwardRef<
  ProfileDropdownSheetRef,
  ProfileSheetProps
>(function ProfileDropdownSheet(
  { onClose, onSync, onSetting, onOpenProfile },
  ref,
) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        bottomSheetRef.current?.present();
      },

      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }),
    [],
  );

  const activeTag = useAccountStore((s) => s.activeTag);
  const accounts = useAccountStore((s) => s.accounts);
  const switchAccount = useAccountStore((s) => s.switchAccount);

  const profile = useAccountStore((s) =>
    s.activeTag ? (s.profilesByTag[s.activeTag] ?? null) : null,
  );

  const [entities, setEntities] = useState<EntityRecord[]>([]);

  // --------------------------------------------------
  // LOAD ENTITIES
  // --------------------------------------------------

  useEffect(() => {
    if (!activeTag) {
      setEntities([]);
      return;
    }

    let mounted = true;

    async function load() {
      if (!activeTag) return;
      try {
        const data = await getEntities(activeTag);

        if (mounted) {
          setEntities(data);
        }
      } catch (error) {
        console.error("❌ DROPDOWN ENTITY ERROR", activeTag, error);

        if (mounted) {
          setEntities([]);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [activeTag]);

  // --------------------------------------------------
  // ACTIONS
  // --------------------------------------------------

  async function handleAccountSwitch(tag: string) {
    if (tag === activeTag) return;

    bottomSheetRef.current?.dismiss();

    await switchAccount(tag);
  }

  const handleDismiss = () => {
    console.log("🔥 [PROFILE SHEET DISMISSED]");
    onClose?.();
  };

  const handleSync = () => {
    bottomSheetRef.current?.dismiss();
    onSync();
  };

  const handleSetting = () => {
    bottomSheetRef.current?.dismiss();
    onSetting();
  };

  const handleOpenProfile = () => {
    bottomSheetRef.current?.dismiss();
    onOpenProfile();
  };

  // --------------------------------------------------
  // DATA
  // --------------------------------------------------

  const activeAccount = accounts.find((a) => a.tag === activeTag);

  const helpers = entities.filter((e) => e.type?.toLowerCase() === "helper");

  const guardians = entities.filter(
    (e) => e.type?.toLowerCase() === "guardian",
  );

  // --------------------------------------------------
  // BACKDROP
  // --------------------------------------------------

  const renderBackdrop = (
    props: React.ComponentProps<typeof BottomSheetBackdrop>,
  ) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.55}
      pressBehavior="close"
    />
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["60%", "92%"]}
      enablePanDownToClose
      enableDynamicSizing={false}
      onChange={(index) => {
        console.log("🔥 [PROFILE SHEET CHANGE]", index);
      }}
      onAnimate={(fromIndex, toIndex) => {
        console.log("🔥 [PROFILE SHEET ANIMATE]", fromIndex, "→", toIndex);
      }}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {!profile ? (
          <View style={styles.emptyProfile}>
            <Ionicons name="person-outline" size={30} color={colors.textMuted} />

            <Text style={styles.emptyProfileText}>No profile connected</Text>
          </View>
        ) : (
          <>
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
                    <Ionicons name="people-outline" size={16} color={colors.textSecondary} />

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
                        accessibilityState={{
                          selected: isActive,
                        }}
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
                              borderColor: isActive
                                ? acc.color
                                : `${acc.color}66`,
                              backgroundColor: isActive
                                ? `${acc.color}20`
                                : colors.surfaceRaised,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarInitials,
                              { color: acc.color },
                            ]}
                          >
                            {initials}
                          </Text>

                          <View style={styles.townHallBadge}>
                            <Image
                              source={{
                                uri: resolveEntityIcon(1000001, {
                                  village: "home",
                                  level: acc.townhall,
                                }),
                              }}
                              style={styles.townHallBadgeIcon}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                            />
                          </View>

                          {isActive && (
                            <View
                              style={[
                                styles.activeBadge,
                                {
                                  backgroundColor: acc.color,
                                },
                              ]}
                            >
                              <Ionicons
                                name="checkmark"
                                size={10}
                                color={colors.background}
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
                <StatsGrid
                  title="Player stats"
                  stats={[
                    {
                      icon: "star",
                      label: "War stars",
                      value: profile.warStars,
                      highlight: true,
                      color: colors.gold,
                    },
                    {
                      icon: "flame",
                      label: "Attacks",
                      value: profile.attackWins,
                      color: colors.orange,
                    },
                    {
                      icon: "shield-checkmark",
                      label: "Defenses",
                      value: profile.defenseWins,
                      color: colors.cyan,
                    },
                    {
                      icon: "arrow-up",
                      label: "Donated",
                      value: profile.donations,
                      color: colors.success,
                    },
                    {
                      icon: "arrow-down",
                      label: "Received",
                      value: profile.donationsReceived,
                      color: colors.blue,
                    },
                    {
                      icon: "diamond",
                      label: "Capital gold",
                      value:
                        typeof profile.clanCapitalGold === "number"
                          ? formatCapital(profile.clanCapitalGold)
                          : undefined,
                      color: colors.purpleStrong,
                    },
                    {
                      icon: "construct",
                      label: "Builders",
                      value: activeAccount?.builderCount ?? 1,
                      color: colors.textSecondary,
                    },
                  ]}
                />
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsSection}>
              <ProfileActions
                onSync={handleSync}
                onSetting={handleSetting}
                onOpenProfile={handleOpenProfile}
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
              <Ionicons name="close" size={18} color={colors.textSecondary} />

              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export default ProfileDropdownSheet;

const createStyles = (colors: HomeColors) => StyleSheet.create({
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },

  handle: {
    paddingTop: 6,
    paddingBottom: 6,
  },

  handleIndicator: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.slate,
  },

  contentContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },

  emptyProfile: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },

  emptyProfileText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
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
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },

  countBadge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  countBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
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

  townHallBadge: {
    position: "absolute",
    left: -4,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  townHallBadgeIcon: {
    width: 19,
    height: 19,
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
    borderColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarLabel: {
    width: 70,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
  },

  avatarLabelActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },

  avatarSub: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.slate,
  },

  actionsSection: {
    marginTop: 18,
  },

  closeButton: {
    height: 48,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  closeButtonPressed: {
    backgroundColor: colors.surfaceRaised,
  },

  closeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
