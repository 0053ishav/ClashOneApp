---
name: game-data-progression
description: Use when modifying Clash One generated game data, entity manifests, levels, costs, durations, icons, progression calculations, or CDN publication.
---

# Game Data and Progression Pipeline

## Respect source-of-truth boundaries

Clash One's generated game data and progression logic are distinct from the official Clash of Clans live API. Use the official API only for fields it exposes; use the project's supported imports, static/generated data, and local state for the rest.

Official API: https://developer.clashofclans.com/

## Before changing data formats

- Inspect the data-generation project, schemas, manifest, and consumers before editing generated output.
- Determine whether the file is source input, generated metadata, progression output, or a published artifact.
- Prefer changing source inputs/generator logic and regenerating artifacts over hand-editing generated files.
- Preserve stable entity IDs and explicit village/category distinctions.
- Validate levels, costs, durations, entity references, image/icon references, and missing/duplicate entries.
- Consider compatibility with already-published CDN data and older app versions.
- Never invent game values when the source is unknown; flag missing source data for verification.

## Progression logic

- Find the canonical Progression Engine implementation before adding or changing formulas.
- Keep calculations deterministic and testable. Avoid placing business calculations inside React components or widget renderers.
- Test max-level entities, missing levels, partially imported accounts, different villages, active upgrades, and malformed data as relevant.
- Ensure planner, widgets, and screens agree by consuming the same canonical calculations.

## Publishing safety

- Review the complete generated diff before publishing.
- Validate all references and expected output counts.
- Do not upload to production CDN or modify production data unless explicitly requested.
- Report source provenance and unresolved assumptions for generated values.
