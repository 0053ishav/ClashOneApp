# Upgrade Planner roadmap audit

## Audit basis

The local branch is `upgrade-planner` and has a clean working tree at the audited revision. PR #45 is an open draft against `main`; its head SHA matches the local branch head. The PR description identifies its current slice as the deterministic scheduler and says later roadmap tickets remain in progress. At audit time, the available PR check runs reported success for required CI, Android debug build, TypeScript, lint, unit tests, dependency review, CodeQL, and Android fingerprint comparison.

The Jira integration is not available in this environment. Therefore the latest Jira statuses, comments, exact titles, dependencies, and acceptance criteria for CO-17 through CO-27 could not be fetched. This document does not mark Jira tickets done or infer a one-to-one mapping from ticket number to workstream.

## Jira verification

| Ticket | Verified scope from supplied brief | Jira status / acceptance criteria |
|---|---|---|
| CO-17 | Upgrade Planner roadmap; PR description identifies the initial scheduler slice | Not verified: Jira unavailable |
| CO-18 | Not independently mapped | Not verified: Jira unavailable |
| CO-19 | Not independently mapped | Not verified: Jira unavailable |
| CO-20 | Not independently mapped | Not verified: Jira unavailable |
| CO-21 | Not independently mapped | Not verified: Jira unavailable |
| CO-22 | Not independently mapped | Not verified: Jira unavailable |
| CO-23 | Home Village upgrade catalog | Not verified: Jira unavailable |
| CO-24 | Not independently mapped | Not verified: Jira unavailable |
| CO-25 | Not independently mapped | Not verified: Jira unavailable |
| CO-26 | Not independently mapped | Not verified: Jira unavailable |
| CO-27 | Not independently mapped | Not verified: Jira unavailable |

The supplied brief says the overall roadmap includes scheduling, data validation, Hammer Jam parsing, persistence, application services, catalog construction, queue editing, timeline presentation, modifiers, and end-to-end testing. Exact ticket-to-area allocation remains unverified.

## Implementation evidence in the checked-out code

| Area | Observed implementation | Status from code audit |
|---|---|---|
| Scheduler | `utils/planner/schedulePlanner.ts`; pure input/output scheduler and planner domain tests | Implemented; requirements acceptance still unverified |
| Data validation | `utils/planner/validatePlannerDataset.ts`; diagnostics and missing-category states | Implemented |
| Catalog | `services/plannerCatalogSourceService.ts`, `services/plannerCatalogService.ts`, planner screen | Implemented for Home Village; manual-level list cap was removed in this revision |
| Queue editing | `services/planner/plannerQueueService.ts`, `PlannerQueueList.tsx` | Implemented; edit preview and confirmation exist |
| Persistence | `services/plannerPersistenceService.ts`, planner schema, persistence tests | Implemented; per-account plan rows and snapshot review |
| Application projection | `services/plannerApplicationService.ts` | Implemented; disposable projections kept separate from intent |
| Timeline | `components/planner/PlannerTimeline.tsx` | Implemented; native horizontal Gantt with Days/Weeks/Months |
| Structure instance identity | `services/planner/structureInstanceService.ts`, persistence and tests | Implemented in code; prior design note needed updating |
| Hammer Jam parsing | `services/fetchHammerJamManifest.ts` and manifest-related files exist | Exists outside planner scheduling; integration/acceptance not established |
| Planner modifiers | No modifier input in current scheduler contract | Not implemented in planner |
| End-to-end Android verification | No device run performed in this audit | Not verified |

## Next smallest high-value change

The catalog's manual-level editor previously rendered only the first six eligible entities. The code now enumerates all matching Home Village entities with valid maxima from entity metadata or progression candidates, while preserving search/category filters. A focused regression test covers more than six candidates and progression-only maximum levels.

## Delivery cautions

- Keep work on the existing `upgrade-planner` branch and update PR #45; do not create a duplicate planner branch/PR.
- Do not merge the draft PR or mark Jira complete without owner authorization and the corresponding Jira acceptance evidence.
- The PR repository URL returned by GitHub is [0053ishav/ClashOneApp PR #45](https://github.com/0053ishav/ClashOneApp/pull/45); local `origin` is `0053ishav/Clash-Widget`. The PR head SHA matches local `HEAD`, but repository naming differs.
- This audit did not edit Jira, run an Android device test, or publish progression data.
