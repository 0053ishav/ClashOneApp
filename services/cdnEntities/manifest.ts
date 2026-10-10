import { ENV } from "@/config/env";
import type { Manifest } from "@/types/progression";

export async function fetchManifest(): Promise<Manifest> {
  if (!ENV.BACKEND) {
    throw new Error("Backend URL is not configured");
  }

  const response = await fetch(`${ENV.BACKEND}/v2/manifest`);

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: HTTP ${response.status}`);
  }

  return (await response.json()) as Manifest;
}
