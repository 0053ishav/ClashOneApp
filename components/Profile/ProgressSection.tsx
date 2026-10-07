import EntitySection from "@/components/Profile/EntitySection";
import { PlayerFull } from "@/types/playerFull";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const GOLD = "#fbbf24";
const MAX_STARS = 3;
const PREVIEW_LIMIT = 5;

interface AchievementItemProps {
  name: string;
  stars?: number;
  info?: string;
}

export default function ProgressSection({ data }: { data: PlayerFull }) {
  const router = useRouter();
  const achievements = data.achievements ?? [];

  if (achievements.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Ionicons name="trophy" size={15} color={GOLD} />
        </View>
        <Text style={styles.title}>Progress</Text>
      </View>

      <EntitySection
        title="Achievements"
        icon="ribbon"
        count={achievements.length}
        onViewAll={() => router.push("/achievements")}
      >
        <View style={styles.list}>
          {achievements.slice(0, PREVIEW_LIMIT).map((achievement, i) => (
            <AchievementItem
              key={`${achievement.name}-${i}`}
              name={achievement.name}
              stars={achievement.stars}
              info={achievement.info}
            />
          ))}
        </View>
      </EntitySection>
    </View>
  );
}

function AchievementItem({ name, stars = 0, info }: AchievementItemProps) {
  const filled = Math.min(stars, MAX_STARS);
  const complete = filled === MAX_STARS;

  return (
    <View style={[styles.item, complete && styles.itemComplete]}>
      <View style={[styles.itemIcon, complete && styles.itemIconComplete]}>
        <Ionicons
          name={complete ? "trophy" : "trophy-outline"}
          size={14}
          color={complete ? GOLD : "#94a3b8"}
        />
      </View>

      <View style={styles.itemText}>
        <Text style={styles.itemName} numberOfLines={1}>
          {name}
        </Text>
        {!!info && (
          <Text style={styles.itemInfo} numberOfLines={1}>
            {info}
          </Text>
        )}
      </View>

      <View style={styles.starsRow}>
        {Array.from({ length: MAX_STARS }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < filled ? "star" : "star-outline"}
            size={11}
            color={i < filled ? GOLD : "#475569"}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111c2e",
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#263449",
    marginBottom: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(51, 65, 85, 0.6)",
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

  list: {
    gap: 6,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(148, 163, 184, 0.05)",
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
  },

  itemComplete: {
    borderColor: "rgba(251, 191, 36, 0.25)",
  },

  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  itemIconComplete: {
    backgroundColor: "rgba(251, 191, 36, 0.14)",
  },

  itemText: {
    flex: 1,
    gap: 1,
  },

  itemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  itemInfo: {
    fontSize: 10,
    fontWeight: "400",
    color: "#94a3b8",
  },

  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
});
