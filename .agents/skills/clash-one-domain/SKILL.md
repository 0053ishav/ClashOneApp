---
name: clash-one-domain
description: Use when changing Clash One account, village, builder, upgrade, import, widget, or progression behavior and when deciding which system owns a piece of state.
---

# Clash One Domain Boundaries

## Start by identifying the data source

For every field or calculation, identify whether it comes from:
1. The official Clash of Clans API.
2. Imported village data.
3. Clash One's persisted local account state.
4. Static/generated Clash One game data (entity metadata, level values, costs, durations, icons).
5. A value derived by Clash One's domain/progression logic.

Do not merge these sources into one undocumented "player data" bucket. Preserve source and freshness where the domain requires it.

Official API reference: https://developer.clashofclans.com/

## Model invariants explicitly

- Distinguish Home Village and Builder Base state; don't infer one from the other.
- Preserve account identity when switching accounts. Invalidate stale async requests and never briefly display another account's state.
- Treat upgrade timers and progression as domain state, not presentation-only values.
- Do not duplicate progression formulas in screens, widgets, or import code. Find and reuse the canonical domain/service implementation.
- Validate imported JSON and remote data at the boundary. A TypeScript assertion is not runtime validation.
- Treat missing, unknown, or newer entity identifiers as normal compatibility cases; handle them safely rather than crashing.
- Preserve persisted data compatibility. If a schema or serialized shape changes, inspect migrations, hydration, caches, and old data paths.

## Implementation workflow

1. Trace the state from its source through parsing, domain logic, persistence/store, and UI/widget consumer.
2. Locate the canonical model and calculation before adding another type or formula.
3. Define expected behavior for empty, partial, stale, malformed, and multi-account data.
4. Implement domain behavior in the appropriate service/model layer; keep components focused on display and user interaction.
5. Add tests for invariants and edge cases, including account switching and village separation when relevant.
6. Verify widget/cache consumers use the canonical prepared state.
7. Cite the official Clash API documentation for claims about API fields or limits.

## Avoid

- Assuming the API returns all village progression or upgrade timers.
- Hardcoding entity names/IDs or duplicating game-data mappings when a canonical manifest exists.
- Letting widgets calculate progression independently.
- Silently dropping unknown imported fields or overwriting valid stored data with incomplete imports.
- Fixing stale UI symptoms without tracing account-scoped async work and cache keys.
