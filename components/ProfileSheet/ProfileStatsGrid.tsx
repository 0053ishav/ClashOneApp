import StatsGrid from "@/components/Profile/StatsGrid";
import { HOME_COLORS } from "@/theme/home";
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
          color: HOME_COLORS.orange,
        },
        {
          icon: "shield-checkmark",
          label: "Defenses won",
          value: profile.defenseWins,
          color: HOME_COLORS.cyan,
        },
        {
          icon: "arrow-up",
          label: "Donated",
          value: profile.donations,
          color: HOME_COLORS.success,
        },
        {
          icon: "arrow-down",
          label: "Received",
          value: profile.donationsReceived,
          color: HOME_COLORS.blue,
        },
        {
          icon: "diamond",
          label: "Capital gold",
          value:
            typeof profile.clanCapitalGold === "number"
              ? formatCapital(profile.clanCapitalGold)
              : undefined,
          color: HOME_COLORS.purpleStrong,
        },
        {
          icon: "construct",
          label: "Builders",
          value: builderCount,
          color: HOME_COLORS.textSecondary,
        },
      ]}
    />
  );
}
