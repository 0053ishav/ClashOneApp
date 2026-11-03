import { useEntityStore } from "@/stores/entityStore";
import {
  FALLBACK_ICON,
  resolveEntityIcon,
  resolveHallIcon,
} from "@/utils/icons/resolveEntityIcon";

jest.mock("@/config/env", () => ({
  ENV: {
    CDN_BASE: "https://cdn.test",
  },
}));

describe("resolveEntityIcon", () => {
  beforeEach(() => {
    useEntityStore.setState({
      entitiesById: {},
      entitiesByName: {},
    });
  });

  it("resolves a lab entity's first level image when its current level is missing", () => {
    useEntityStore.setState({
      entitiesById: {
        4000000: {
          id: 4000000,
          slug: "barbarian",
          type: "troop",
          village: "home",
          name: { en: "Barbarian" },
        },
      },
    });

    expect(
      resolveEntityIcon(4000000, {
        village: "home",
        level: undefined,
      }),
    ).toBe("https://cdn.test/v2/home/troops/4000000/1.png");
  });

  it("resolves pet assets even when the upgrade level is missing", () => {
    useEntityStore.setState({
      entitiesById: {
        73000011: {
          id: 73000011,
          slug: "unicorn",
          type: "pet",
          village: "home",
          name: { en: "Unicorn" },
        },
      },
    });

    expect(
      resolveEntityIcon(73000011, {
        village: "home",
        type: "pet",
        level: undefined,
      }),
    ).toBe("https://cdn.test/v2/home/pets/73000011/1.png");
  });

  it("resolves a helper's category asset without relying on metadata.icon", () => {
    expect(
      resolveEntityIcon(93000003, {
        village: "home",
        type: "helper",
      }),
    ).toBe("https://cdn.test/v2/home/helpers/93000003/1.png");
  });

  it("uses the explicit entity category when metadata is not hydrated", () => {
    expect(
      resolveEntityIcon(73000011, {
        village: "home",
        type: "pet",
      }),
    ).toBe("https://cdn.test/v2/home/pets/73000011/1.png");
  });

  it("resolves a stored upgrade through its canonical entity name when its ID is stale", () => {
    useEntityStore.getState().setEntities([
      {
        id: 4000000,
        slug: "barbarian",
        type: "troop",
        village: "home",
        name: { en: "Barbarian" },
      },
    ]);

    expect(
      resolveEntityIcon(4999999, {
        village: "home",
        type: "troop",
        entityName: "Barbarian",
      }),
    ).toBe("https://cdn.test/v2/home/troops/4000000/1.png");
  });

  it("returns the fallback when both metadata and explicit category context are absent", () => {
    expect(resolveEntityIcon(99999999)).toBe(FALLBACK_ICON);
  });
});

describe("resolveHallIcon", () => {
  it("resolves Town Hall assets without entity-store metadata", () => {
    expect(resolveHallIcon("home", 18)).toBe(
      "https://cdn.test/v2/home/townhalls/18.png",
    );
  });

  it("resolves Builder Hall assets without entity-store metadata", () => {
    expect(resolveHallIcon("builderBase", 10)).toBe(
      "https://cdn.test/v2/builder/builderhalls/10.png",
    );
  });

  it("normalizes invalid hall levels to the first asset level", () => {
    expect(resolveHallIcon("home", 0)).toBe(
      "https://cdn.test/v2/home/townhalls/1.png",
    );
  });
});
