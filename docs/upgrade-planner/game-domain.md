# Upgrade Planner game domain

## Village boundary

The planner domain currently declares `PlannerVillage` as `"home"`. Builder Base is supported elsewhere in the app but is not a planner scope. Home Village timers are the only live timers considered for Home Village lane occupancy.

The code models five lane identifiers:

| Lane | Current use |
|---|---|
| Normal builders | One serialized lane per builder index; count comes from the active account profile. |
| Laboratory | One serialized research lane. |
| Pets | One serialized pet-upgrade lane. |
| Goblin Builder | Modeled but currently ineligible in the planner screen. |
| Goblin Laboratory | Modeled but currently ineligible in the planner screen. |

The last two lanes require verified active-event and player-eligibility inputs. The screen currently supplies `false` for both. The existence of a lane type is not evidence that a player can use it.

## Entity taxonomy

The planner catalog maps supported Home Village entity metadata types to progression categories: buildings, heroes, troops, spells, siege machines, pets, traps, and walls. Categories without usable metadata or progression records are reported as unavailable; they must not be presented as a verified empty category.

Stable entity IDs and progression candidate IDs identify catalog entries. Display names are localized presentation only. Structure-copy IDs are Clash One-owned identities and are distinct from entity definition IDs.

## Progression facts and levels

- Upgrade candidates are derived from Clash One's validated, cached progression dataset.
- A catalog card represents the next level for a known current level, not every future level.
- Imported structure-level records and saved per-account manual overrides are the current-level sources used by this screen. Imported values override manual values for the same entity.
- A missing current level is not treated as level zero. Manual entry allows zero to mean not built/unlocked when the user explicitly enters it.
- The catalog can derive maximum level from validated progression candidates when display metadata has no level list. The manual editor likewise uses validated progression maxima when available.
- Costs are represented per resource (gold, elixir, dark elixir) and may be partially known. Unknown is not zero.
- Duration is represented in milliseconds after validated source seconds are converted. A known zero duration is distinct from an unknown duration.

## Prerequisites and eligibility

The data validator currently parses supported Town Hall, Laboratory, and Pet House level prerequisites. The domain type and scheduler also represent entity-level prerequisites. Prerequisite state can be unmet or unknown; missing entity level is not proof that the prerequisite is satisfied.

Lane eligibility is checked by the scheduler. Builder indices must be within the account's available builder count. Goblin lanes require explicit eligibility and are currently disabled by the screen. Pets, research, and builder work are scheduled independently; items assigned to the same lane serialize according to their queue order.

## Structure copies and active timers

Imported structure records can be grouped counts rather than physical identities. The planner's structure-instance service expands those groups into app-owned IDs, preserves IDs for unchanged buckets, and marks identity ambiguous when import changes cannot identify which copy changed. Active timers are linked only when a unique stable instance match exists. See [structure-instance identity](./structure-instance-identity.md).

Live upgrade timers remain observed app state. The timeline may show them as locked lane reservations, but the planner does not create, finish, or mutate live timers.

## Modifiers and events

The main app has separate magic-item and Hammer Jam mechanisms, but the planner scheduler currently receives no modifier input. Planner forecasts therefore do not simulate books, hammers, potions, boosts, or event windows. Do not infer an exact planner finish time under modifiers. See [the app's magic-item mechanism](../mechanism-for-magic-items.md) for behavior outside the planner.

## Sources and unresolved rules

The catalog adapter reads the local entity store, progression manifest, and cached category payloads. Account levels and active timers come from Clash One account/import state. Scheduler dates and lane placements are derived by Clash One. The official [Clash of Clans API portal](https://developer.clashofclans.com/) is a reference for the public API; planner costs, durations, full inventories, and event rules must not be attributed to it unless the API explicitly exposes them.

Unresolved or unsupported: authoritative event eligibility, planner-specific modifier semantics, general entity-to-entity prerequisite ingestion, and exact Jira acceptance criteria.
