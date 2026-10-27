import { useEntityStore } from "@/stores/entityStore";
import type { ExternalEntityData } from "@/types/entities";
import type { PlayerFull } from "@/types/playerFull";
import { normalizeVillage } from "@/types/entity";
import { parseArmy } from "@/utils/profile/parseArmy";

describe("Builder Base village normalization", () => {
  afterEach(() => {
    useEntityStore.setState({
      entitiesById: {},
      entitiesByName: {},
    });
  });

  it('normalizes external metadata village "builder" to "builderBase"', () => {
    expect(normalizeVillage("builder")).toBe("builderBase");
    expect(normalizeVillage("builderBase")).toBe("builderBase");
    expect(normalizeVillage("home")).toBe("home");
    expect(normalizeVillage("unknown")).toBeNull();
  });

  it("resolves Builder Base troops and heroes from player API village values", () => {
    // The CDN metadata uses "builder" while the Clash API player payload uses
    // "builderBase". The external metadata type keeps that distinction explicit.
    const metadata: ExternalEntityData[] = [
      {
        id: 1001,
        slug: "barbarian",
        name: { en: "Barbarian" },
        type: "troop",
        village: "home",
        icon: "https://cdn.clashwidget.online/v2/home/troops/4000000/1.png",
        superTroop: {
          id: "super-barbarian",
          name: { en: "Super Barbarian" },
          icon: "https://cdn.clashwidget.online/v2/home/troops/4000000/super.png",
        },
      },
      {
        id: 4001,
        slug: "raged-barbarian",
        name: { en: "Raged Barbarian" },
        type: "troop",
        village: "builder",
      },
      {
        id: 4002,
        slug: "battle-machine",
        name: { en: "Battle Machine" },
        type: "hero",
        village: "builder",
      },
    ];

    useEntityStore.getState().setEntities(metadata);

    const player: PlayerFull = {
      tag: "#TEST",
      name: "Test Player",
      expLevel: 200,
      townHallLevel: 16,
      trophies: 5000,
      bestTrophies: 5500,
      attackWins: 100,
      defenseWins: 10,
      warStars: 200,
      donations: 100,
      donationsReceived: 50,
      troops: [
        {
          name: "Barbarian",
          level: 10,
          maxLevel: 12,
          village: "home",
        },
        {
          name: "Raged Barbarian",
          level: 18,
          maxLevel: 20,
          village: "builderBase",
        },
        {
          name: "Super Barbarian",
          level: 10,
          maxLevel: 12,
          village: "home",
        },
      ],
      heroes: [
        {
          name: "Battle Machine",
          level: 30,
          maxLevel: 35,
          village: "builderBase",
        },
      ],
    };

    const parsed = parseArmy(player);

    expect(useEntityStore.getState().getEntityId("Raged Barbarian", "builderBase")).toBe(4001);
    expect(useEntityStore.getState().getEntity(4001)?.village).toBe("builderBase");
    expect(parsed.home.troops.map((troop) => troop.name)).toEqual(["Barbarian"]);
    expect(parsed.home.superTroops.map((troop) => troop.name)).toEqual([
      "Super Barbarian",
    ]);
    expect(parsed.home.superTroops[0]?.dataId).toBe(1001);
    expect(parsed.home.superTroops[0]?.isSuperTroop).toBe(true);
    expect(useEntityStore.getState().isSuperTroop("Super Barbarian", "home")).toBe(true);
    expect(useEntityStore.getState().isSuperTroop("Barbarian", "home")).toBe(false);
    expect(parsed.builderBase.troops.map((troop) => troop.name)).toEqual([
      "Raged Barbarian",
    ]);
    expect(parsed.builderBase.heroes.map((hero) => hero.name)).toEqual([
      "Battle Machine",
    ]);
  });
});
