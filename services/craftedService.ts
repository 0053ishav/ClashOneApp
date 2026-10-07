import { ENV } from "@/config/env";
import { useCraftedStore } from "@/stores/crafted";

const CRAFTED_URL = `${ENV.BACKEND}/v2/events/crafted-defenses-event`!;

let isLoaded = false;

let lastFetch = 0;
const CACHE_TIME = 5 * 60 * 1000;

export async function ensureCraftedLoaded() {
    const now = Date.now();

  if (isLoaded && now - lastFetch < CACHE_TIME) return;

  try {
    const res = await fetch(CRAFTED_URL);

    if (!res.ok) throw new Error("Failed crafted fetch");

    const data = await res.json();

    useCraftedStore.getState().setCraftedData(data);

    isLoaded = true;

    lastFetch = now;
    console.log("✅ Crafted loaded");
  } catch (e) {
    console.warn("❌ Crafted load failed", e);
  }
}