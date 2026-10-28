/**
 * Purpose:
 * Fetch backend progression payloads.
 */

import { getCategorySlug } from "@/config/categorySlugs";
import { ProgressionData } from "@/types/progression";
import { fetchJson } from "@/services/http/fetchJson";


const API =
  `${process.env.EXPO_PUBLIC_BACKEND_URL}/v2`;

export async function fetchProgressionCategory(
  category: string,
) {
  const slug = getCategorySlug(category);

  const data = await fetchJson<unknown>(`${API}/progression/${slug}`);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid progression payload for category: ${category}`);
  }

  /**
   * Backend returns as Object keyed by entity ID.
   * Flatten into an array for hydration.
   */
  return Object.values(data) as ProgressionData[];
}