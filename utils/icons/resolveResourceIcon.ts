import { ENV } from "@/config/env";
import { ResourceType } from "@/types/resource";

export function resolveResourceIcon(
  resource?: ResourceType,
) {
  switch (resource) {
    case ResourceType.GOLD:
      return `${ENV.CDN_BASE}/v2/home/other/gold.png`;

    case ResourceType.ELIXIR:
      return `${ENV.CDN_BASE}/v2/home/other/elixir.png`;

    case ResourceType.DARK_ELIXIR:
      return `${ENV.CDN_BASE}/v2/home/other/dark-elixir.png`;

    case ResourceType.BUILDER_GOLD:
      return `${ENV.CDN_BASE}/v2/builder/other/builder-gold.png`;

    case ResourceType.BUILDER_ELIXIR:
      return `${ENV.CDN_BASE}/v2/builder/other/builder-elixir.png`;

    case ResourceType.GEMS:
      return `${ENV.CDN_BASE}/v2/home/other/gem.png`;

    case ResourceType.SEASON_POINTS:
      return `${ENV.CDN_BASE}/v2/home/other/season-points.png`;

    case ResourceType.GOLD_OR_ELIXIR:
      return undefined;

    case ResourceType.BUILDER_GOLD_OR_ELIXIR:
      return undefined;

    default:
      return undefined;
  }
}