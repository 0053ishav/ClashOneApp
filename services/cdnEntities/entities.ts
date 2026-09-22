/**
 * Purpose:
 * Fetch backend metadata payloads.
 */

import { getCategorySlug } from "@/config/categorySlugs";
import type {
  EntityData,
} from "@/types/entities";
import { ResourceType } from "@/types/resource";

const API =
  `${process.env.EXPO_PUBLIC_BACKEND_URL}/v2`;

type CraftedDefenseMetadataPayload =
  Record<
    string,
    {
      name: string;
      modules: Record<
        string,
        {
          name: string;
          stat: string;
          resource: ResourceType;
        }
      >;
    }
  >;

export async function fetchCategory(
  category: string,
): Promise<
  EntityData[] | CraftedDefenseMetadataPayload
> {
  const slug = getCategorySlug(category);

  const res = await fetch(
    `${API}/metadata/${slug}`,
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch metadata category: ${category}`,
    );
  }

  const data = await res.json();

  if (category === "craftedDefenses") {
    return data;
  }

  return Object.values(
    data,
  ) as EntityData[];
}