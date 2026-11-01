# Upgrade Planner product spec

## Problem and target user

Clash of Clans players need to compare future upgrade work without changing the app's record of upgrades already running in the game. The planner is for a player who wants to keep an account-specific, editable queue and understand which work can be scheduled with the progression information currently available.

## Core jobs

- Find the next supported upgrade for a known current level.
- Enter a current level when imported data does not provide it.
- Add, reorder, edit, reassign, or remove hypothetical upgrades.
- See scheduled, blocked, and unknown work on a timeline.
- Review the effect of queue changes before saving an edited item.
- See live timers as occupied slots without changing them.

## MVP scope and non-goals

Current scope is one Home Village plan selected per account, with locally stored plan state. The app persists plan rows by account and can technically store more than one, but the screen automatically selects the most recently updated plan and has no scenario picker. The planner screen has Plan, Add, and Details segments; the selected segment is retained per account in memory while the app process is running.

In scope: catalog search and category filters; current-level entry; queue editing; builder assignment; schedule preview; known resource totals; snapshot review; live timer lane reservations.

Not currently in scope: Builder Base planning, optimization recommendations, consuming or simulating magic-item inventory, planner-specific event modifiers, drag-to-reschedule, named scenarios, or claims that a forecast is an exact in-game result.

## Main flow

1. Select an account and load its imported levels, active timers, cached game data, and account-owned plan.
2. Search or filter the Home Village catalog. For entities without a known level, set or edit a manual level.
3. Add an eligible next-level action to the queue.
4. Inspect the Gantt-style schedule and status of each action.
5. Edit a target or builder assignment. Review the proposed schedule and explicitly confirm or cancel.
6. If imported account state has changed or cannot be verified, acknowledge the current snapshot before recalculating.

## Functional requirements and current behavior

| Requirement | Current behavior |
|---|---|
| Keep planned actions separate from live timers | Plan intent is persisted in planner tables; observed timers are read as lane occupancy. |
| Do not infer missing levels | The catalog omits candidates whose current level is unknown and exposes manual-level entry. |
| Preserve unknown estimates | Cost and duration use `known`/`unknown` states; unknown duration is not scheduled as zero. |
| Prevent silent schedule changes | Editing an existing queue item requires preview confirmation. |
| Isolate account plans | Persistence queries include the account tag; screen loads data when the active account changes. |
| Distinguish stale snapshot | The screen requires explicit review when the plan has no reviewed snapshot or imported data is newer. |
| Identify data gaps | Catalog distinguishes loading, error, partial data, empty eligible results, and search misses. |

## Screen states

- **No active account:** explain that an account must be selected.
- **Loading:** show a progress indicator while account/catalog data loads.
- **Catalog load error:** show the surfaced error; do not turn it into an empty catalog.
- **Missing metadata/progression:** explain that game data must be synced.
- **Known data with no eligible items:** explain that known levels and progression candidates did not produce a next action.
- **Search miss:** identify the search term and allow changing or clearing the search.
- **Partial data:** show available catalog results and identify unavailable categories.
- **Unknown/blocked schedule:** keep actions visible and explain that no reliable slot/date can be shown.
- **Stale snapshot:** pause recalculation until the player reviews current account data.
- **No plan items:** show a timeline empty state and explain how to add the first upgrade.
- **Successful schedule:** show dates only for scheduled work; incomplete work does not receive a fabricated finish date.

## Acceptance criteria for the current slice

- The catalog uses stable candidate/entity IDs rather than display names for matching.
- Supported Home Village categories are represented when validated data exists.
- Missing levels remain unknown until imported or manually configured.
- The editor exposes all eligible entities supported by metadata or validated progression levels; it does not truncate the manual-level list.
- Queue and live upgrades remain separate, account-scoped state.
- The scheduler does not overlap work on a single lane and preserves separate-lane concurrency.
- Unknown duration, unknown prerequisite, unavailable lane, and blocked prerequisite remain distinguishable.
- Timeline edits are usable through accessible controls and do not require dragging a small bar.

These are code-audit criteria, not a substitute for Jira's authoritative acceptance criteria; Jira was not accessible during this work.
