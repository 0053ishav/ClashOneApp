import EntitySection from "@/components/Profile/EntitySection";
import type { HomeColors } from "@/theme/home";
import { useHomeColors } from "@/theme/useHomeColors";
import type { PlayerFull, PlayerVillage } from "@/types/playerFull";
import { parseArmy } from "@/utils/profile/parseArmy";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import EntityCard from "../EntityCard";
import ProgressionBreakdownSheet, { type ProgressionBreakdownSheetRef } from "@/components/Profile/ProgressionBreakdownSheet";
import { useRef } from "react";

interface ArmyEntity {
  dataId: number;
  name: string;
  level: number;
  maxLevel: number;
  village: PlayerVillage;
  isSuperTroop?: boolean;
}

const TROOP_PREVIEW_LIMIT = 6;

export default function ArmySection({ data }: { data: PlayerFull }) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const GOLD = colors.gold;
  const BUILDER = colors.purpleStrong;
  const router = useRouter();
  const progressionSheetRef = useRef<ProgressionBreakdownSheetRef>(null);

  const army = parseArmy(data);
  const progressionCategories = [
    { key: "home-troops", title: "Home Troops", items: army.home.troops },
    { key: "super-troops", title: "Super Troops", items: army.home.superTroops },
    { key: "heroes", title: "Heroes", items: army.home.heroes },
    { key: "pets", title: "Pets", items: army.home.pets },
    { key: "siege-machines", title: "Siege Machines", items: army.home.siegeMachines },
    { key: "builder-troops", title: "Builder Base Troops", items: army.builderBase.troops },
    { key: "builder-heroes", title: "Builder Base Heroes", items: army.builderBase.heroes },
  ];

  const homeCount =
    (army.home.troops?.length ?? 0) +
    (army.home.superTroops?.length ?? 0) +
    (army.home.heroes?.length ?? 0) +
    (army.home.pets?.length ?? 0) +
    (army.home.siegeMachines?.length ?? 0);

  const builderCount =
    (army.builderBase?.troops?.length ?? 0) +
    (army.builderBase?.heroes?.length ?? 0);

  const total = homeCount + builderCount;

  if (total === 0) return null;

  return (
    <View style={styles.container}>
      <ProgressionBreakdownSheet ref={progressionSheetRef} categories={progressionCategories} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <Ionicons name="shield" size={15} color={GOLD} />
          </View>
          <Text style={styles.title}>Army</Text>
        </View>
        <Text style={styles.total}>{total} units</Text>
      </View>

      {army.home.troops.length > 0 && (
        <EntitySection
          title="Home troops"
          icon="flash"
          count={army.home.troops.length}
          onViewAll={() => router.push("/profile/troops")}
          onPressHeader={() => progressionSheetRef.current?.present("home-troops")}
        >
          <Grid items={army.home.troops.slice(0, TROOP_PREVIEW_LIMIT)} />
        </EntitySection>
      )}

      {army.home.superTroops.length > 0 && (
        <EntitySection
          title="Super Troops"
          icon="flash"
          count={army.home.superTroops.length}
          onPressHeader={() => progressionSheetRef.current?.present("super-troops")}
        >
          <Grid items={army.home.superTroops} />
        </EntitySection>
      )}

      {army.home.heroes.length > 0 && (
        <EntitySection
          title="Heroes"
          icon="person"
          count={army.home.heroes.length}
          onPressHeader={() => progressionSheetRef.current?.present("heroes")}
        >
          <Grid items={army.home.heroes} />
        </EntitySection>
      )}

      {army.home.pets.length > 0 && (
        <EntitySection title="Pets" icon="paw" count={army.home.pets.length} onPressHeader={() => progressionSheetRef.current?.present("pets")}>
          <Grid items={army.home.pets} />
        </EntitySection>
      )}

      {army.home.siegeMachines.length > 0 && (
        <EntitySection
          title="Siege machines"
          icon="hammer"
          count={army.home.siegeMachines.length}
          onPressHeader={() => progressionSheetRef.current?.present("siege-machines")}
        >
          <Grid items={army.home.siegeMachines} />
        </EntitySection>
      )}

      {army.builderBase.troops.length > 0 && (
        <EntitySection
          title="Builder base troops"
          icon="construct"
          count={army.builderBase.troops.length}
          onPressHeader={() => progressionSheetRef.current?.present("builder-troops")}
          accent={BUILDER}
        >
          <Grid items={army.builderBase.troops} />
        </EntitySection>
      )}

      {army.builderBase.heroes.length > 0 && (
        <EntitySection
          title="Builder base heroes"
          icon="person"
          count={army.builderBase.heroes.length}
          onPressHeader={() => progressionSheetRef.current?.present("builder-heroes")}
          accent={BUILDER}
        >
          <Grid items={army.builderBase.heroes} />
        </EntitySection>
      )}
    </View>
  );
}

function Grid({ items }: { items: ArmyEntity[] }) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <EntityCard
          key={`${item.dataId}-${item.level}-${index}`}
          name={item.name}
          dataId={item.dataId}
          level={item.level}
          maxLevel={item.maxLevel}
          village={item.village}
          isSuperTroop={item.isSuperTroop}
          compact
        />
      ))}
    </View>
  );
}

const createStyles = (colors: HomeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(51, 65, 85, 0.6)",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  total: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
});
