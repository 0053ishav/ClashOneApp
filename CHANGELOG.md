# Changelog

All notable Clash One changes are documented here.

## [Unreleased]

### Repository
- Consolidated the historical feature branches into `main`.
- Added GitHub issue and pull request templates.
- Added CI for linting and TypeScript checks.
- Added CODEOWNERS.
- Added contribution and security guidance.
- Added automated GitHub releases from version tags.

## [1.3.0]

### Added
- Added a dedicated Profile tab with locally cached player profiles to make profile data quicker to reopen.
- Added an Army Overview progression breakdown with an interactive grid, level-completion metrics, and an overall radar chart.
- Added detailed army progression costs and level indicators, with improved support for Home Village and Builder Base troops and heroes.
- Added Supercharge import and upgrade-detail support, including charge indicators and remaining cost/time calculations.
- Added configurable light, dark, and system appearance preferences across app screens and Android widgets.
- Added manual Gold Pass and Re-engagement Builder/Research boost settings for eligible Home Village progression.

### Improved
- Refreshed the app UI with more consistent styling, clearer loading and empty states, and improved screen and dialog presentation.
- Improved player Profile army rendering and caching, including the first-visit loading experience.
- Improved village JSON import and add-account flows with clipboard paste, editable input, syntax feedback, and clearer setup screens.
- Improved entity, troop, Super Troop, Magic Item, and builder-status icon resolution and presentation.
- Improved upgrade finish-time visibility and Home refresh reliability.
- Improved remote game-data request resilience by deduplicating concurrent requests, caching manifest responses, and respecting rate-limit cooldowns.

### Fixed
- Fixed village reset and tracked-upgrade clearing so account-scoped data is cleaned up and Home status refreshes correctly.
- Fixed progression and icon-resolution edge cases affecting army entities, Super Troops, and crafted defenses.
- Fixed theme-aware startup to reduce the flash between the splash screen and the app's selected appearance.

## [1.2.1]

Builder Base support and stability work. See the corresponding GitHub release for the final user-facing notes.
