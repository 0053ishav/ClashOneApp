/**
 * Purpose:
 * Fetch backend metadata payloads.
 */

import { getCategorySlug } from "@/config/categorySlugs";
import type {
  ExternalEntityData,
} from "@/types/entities";
import { ResourceType } from "@/types/resource";
import { fetchJson } from "@/services/http/fetchJson";

const API =
  `${process.env.EXPO_PUBLIC_BACKEND_URL}/v2`;

export type CraftedDefenseMetadataPayload =
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
  ExternalEntityData[] | CraftedDefenseMetadataPayload
> {
  const slug = getCategorySlug(category);

  const data = await fetchJson<unknown>(`${API}/metadata/${slug}`);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid metadata payload for category: ${category}`);
  }

  if (category === "craftedDefenses") {
    return data as CraftedDefenseMetadataPayload;
  }

  return Object.values(data) as ExternalEntityData[];
}