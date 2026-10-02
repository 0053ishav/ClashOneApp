import EntitySection from "@/components/Profile/EntitySection";
import { PlayerFull } from "@/types/playerFull";
import { parseArmy } from "@/utils/profile/parseArmy";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import EntityCard from "../EntityCard";

interface ArmyEntity {
  dataId: number;
  name: string;
  level: number;
  maxLevel: number;
}

const GOLD = "#fbbf24";
const BUILDER = "#c084fc"; // matches Builder Base purple in ProfileHeroCard
const TROOP_PREVIEW_LIMIT = 6;

export default function ArmySection({ data }: { data: PlayerFull }) {
  const router = useRouter();

  const army = parseArmy(data);

  const homeCount =
    (army.home.troops?.length ?? 0) +
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
          onViewAll={
            army.home.troops.length > TROOP_PREVIEW_LIMIT
              ? () => router.push("/profile/troops")
              : undefined
          }
        >
          <Grid items={army.home.troops.slice(0, TROOP_PREVIEW_LIMIT)} />
        </EntitySection>
      )}

      {army.home.heroes.length > 0 && (
        <EntitySection
          title="Heroes"
          icon="person"
          count={army.home.heroes.length}
        >
          <Grid items={army.home.heroes} />
        </EntitySection>
      )}

      {army.home.pets.length > 0 && (
        <EntitySection title="Pets" icon="paw" count={army.home.pets.length}>
          <Grid items={army.home.pets} />
        </EntitySection>
      )}

      {army.home.siegeMachines.length > 0 && (
        <EntitySection
          title="Siege machines"
          icon="hammer"
          count={army.home.siegeMachines.length}
        >
          <Grid items={army.home.siegeMachines} />
        </EntitySection>
      )}

      {army.builderBase.troops.length > 0 && (
        <EntitySection
          title="Builder base troops"
          icon="construct"
          count={army.builderBase.troops.length}
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
          accent={BUILDER}
        >
          <Grid items={army.builderBase.heroes} />
        </EntitySection>
      )}
    </View>
  );
}

function Grid({ items }: { items: ArmyEntity[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <EntityCard
          key={`${item.dataId}-${item.level}-${index}`}
          name={item.name}
          dataId={item.dataId}
          level={item.level}
          maxLevel={item.maxLevel}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111c2e",
    borderRadius: 20,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "#263449",
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
    color: "#f1f5f9",
    letterSpacing: -0.2,
  },

  total: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
