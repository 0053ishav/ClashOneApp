const CATEGORY_SLUGS: Record<string, string> = {
    craftedDefenses: "crafted-defenses",
}

export function getCategorySlug(
    category: string,
): string {
    return CATEGORY_SLUGS[category] ?? category;
}