import StatsGrid from "@/components/Profile/StatsGrid";
import { PlayerProfile } from "@/types/player";

function formatCapital(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";

  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";

  return value.toString();
}

export default function ProfileStatsGrid({
  profile,
  builderCount,
}: {
  profile: PlayerProfile;
  builderCount: number;
}) {
  return (
    <StatsGrid
      title="Battle stats"
      stats={[
        {
          icon: "star",
          label: "War stars",
          value: profile.warStars,
          highlight: true,
          wide: true,
        },
        {
          icon: "flame",
          label: "Attacks won",
          value: profile.attackWins,
          color: "#f97316",
        },
        {
          icon: "shield-checkmark",
          label: "Defenses won",
          value: profile.defenseWins,
          color: "#06b6d4",
        },
        {
          icon: "arrow-up",
          label: "Donated",
          value: profile.donations,
          color: "#22c55e",
        },
        {
          icon: "arrow-down",
          label: "Received",
          value: profile.donationsReceived,
          color: "#38bdf8",
        },
        {
          icon: "diamond",
          label: "Capital gold",
          value:
            typeof profile.clanCapitalGold === "number"
              ? formatCapital(profile.clanCapitalGold)
              : undefined,
          color: "#c084fc",
        },
        {
          icon: "construct",
          label: "Builders",
          value: builderCount,
          color: "#94a3b8",
        },
      ]}
    />
  );
}
