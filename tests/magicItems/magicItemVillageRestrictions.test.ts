import { getMagicItem } from "@/config/magicItems";
import { resolveActiveMagicEffects } from "@/engine/magicItems/resolveActiveMagicEffects";

describe("Study Soup and Builder Bite village restrictions", () => {
  it.each([
    ["study-soup", "research"],
    ["builder-bite", "builders"],
  ] as const)("%s is available only in the Home Village", (itemId, target) => {
    const item = getMagicItem(itemId);

    expect(item).toBeDefined();
    expect(item?.villages).toEqual(["home"]);
    expect(item?.effect.appliesTo).toContain(target);
    expect(item?.villages).not.toContain("builderBase");
  });

  it.each([
    ["study-soup", "research"],
    ["builder-bite", "builders"],
  ] as const)("does not resolve %s as an active Builder Base effect", (itemId, target) => {
    const now = 1_000_000;

    const result = resolveActiveMagicEffects({
      now,
      target,
      village: "builderBase",
      effects: [
        {
          id: `effect-${itemId}`,
          itemId,
          startedAt: now - 1_000,
          expiresAt: now + 60 * 60 * 1000,
          village: "builderBase",
        },
      ],
    });

    expect(result).toEqual([]);
  });
});
