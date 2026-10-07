import { Manifest } from "@/types/progression";

const API =
  `${process.env.EXPO_PUBLIC_BACKEND_URL}/v2`;

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(
    `${API}/manifest`,
  );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch manifest",
    );
  }

  return (await res.json()) as Manifest;
}
