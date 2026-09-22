import { CRAFTED_CATEGORY } from "@/services/progression/hydrateProgression";
import { loadProgressionCategory, loadProgressionManifest } from "@/storage/progressionStorage";
import { useCraftedDefenseProgressionStore } from "@/stores/crafted";
import { log } from "@/utils/logger";
import { normalizeCraftedDefenseProgression, RawCraftedDefenseProgressions } from "./normalizeCraftedDefenseProgression";

export function hyradteCraftedDefenseProgression() {
    const manifest = loadProgressionManifest();

    if (!manifest) {
        return;
    }

    if (
        manifest.categories[
        CRAFTED_CATEGORY
        ] == null
    ) {
        log(
            "[CraftedProgression] Category missing from manifest",
        );

        return;
    }

    const raw = loadProgressionCategory(CRAFTED_CATEGORY);

    if (!raw) {
        log("[CraftedProgression] No stored progression");
        return;
    }

    const craftedRaw =
        raw as unknown as RawCraftedDefenseProgressions;

    const normalized = normalizeCraftedDefenseProgression(craftedRaw);

    useCraftedDefenseProgressionStore
        .getState()
        .setProgressions(normalized)

    log(`[CraftedProgression] Loaded ${normalized.length} defenses`);
}