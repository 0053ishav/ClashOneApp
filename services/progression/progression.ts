/**
 * Purpose:
 * Fetch backend progression payloads.
 */

import { getCategorySlug } from "@/config/categorySlugs";
import { ProgressionData } from "@/types/progression";


const API =
  `${process.env.EXPO_PUBLIC_BACKEND_URL}/v2`;

export async function fetchProgressionCategory(
  category: string,
) {
  const slug = getCategorySlug(category);

  const res = await fetch(
    `${API}/progression/${slug}`,
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch progression category: ${category}`,
    );
  }

  const data = await res.json();

  /**
   * Backend returns as Object keyed by entity ID.
   * Flatten into an array for hydration.
   */
  return Object.values(
    data,
  ) as ProgressionData[];
}