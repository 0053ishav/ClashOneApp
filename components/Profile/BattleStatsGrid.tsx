import StatsGrid from "@/components/Profile/StatsGrid";
import { PlayerFull } from "@/types/playerFull";

export default function BattleStatsGrid({ data }: { data: PlayerFull }) {
  return (
    <StatsGrid
      title="Battle stats"
      stats={[
        {
          icon: "star",
          label: "War stars",
          value: data.warStars,
          highlight: true,
          wide: true,
        },
        {
          icon: "flame",
          label: "Attacks won",
          value: data.attackWins,
          color: "#f97316",
        },
        {
          icon: "shield-checkmark",
          label: "Defenses won",
          value: data.defenseWins,
          color: "#06b6d4",
        },
        {
          icon: "arrow-up",
          label: "Donated",
          value: data.donations,
          color: "#22c55e",
        },
        {
          icon: "arrow-down",
          label: "Received",
          value: data.donationsReceived,
          color: "#38bdf8",
        },
      ]}
    />
  );
}
