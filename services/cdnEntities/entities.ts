/**
 * Purpose:
 * Fetch backend metadata payloads.
 */

import type {
  EntityData,
  EntityManifest,
} from "@/types/entities";

const API =
  `${process.env.EXPO_PUBLIC_BACKEND_URL}/v2/metadata`;

export async function fetchManifest() {
  const res = await fetch(
    `${API}/manifest`,
  );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch metadata manifest",
    );
  }

  return (await res.json()) as EntityManifest;
}

export async function fetchCategory(
  category: string,
) {
  const res = await fetch(
    `${API}/${category}`,
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch metadata category: ${category}`,
    );
  }

  const data = await res.json();

  return Object.values(
    data,
  ) as EntityData[];
}