# Upgrade Planner

## Purpose and current scope

The Upgrade Planner is a Home Village-only feature for drafting hypothetical future upgrades. It keeps a saved queue separate from live upgrade timers and projects queue items onto builder, Laboratory, and Pet lanes.

The current app includes a validated progression catalog, per-account manual level entry, persistent queue editing, a deterministic schedule preview, and a horizontal Gantt-style timeline. Builder Base planning, magic-item simulation, event-adjusted durations, optimal-plan generation, and multiple named scenarios are not part of the current UI.

## Architecture at a glance

- Game entity metadata and cached progression records provide names, levels, costs, durations, and supported prerequisite fields.
- Imported account state and saved manual overrides provide known current levels; imported values take precedence.
- SQLite stores account-owned plan intent and structure-instance identity.
- The pure scheduler computes disposable projections from the queue, progression candidates, current levels, lane availability, and observed live timers.
- React Native components render the catalog, queue, schedule, and account/snapshot warnings.

See [architecture](./architecture.md), [data sources](./data-sources.md), and [scheduling engine](./scheduling-engine.md) for boundaries and limitations.

## User experience

The main screen presents account context and three in-place segments: **Plan**, **Add**, and **Details**. Plan starts with an estimate summary and actionable warnings, then places the multiscale horizontal timeline before the compact editable queue. Add keeps search/category controls visible above a virtualized catalog, including rows with unknown levels and inline level entry. Details presents a dated per-lane sequence, a partial resource summary, explicit scheduling assumptions, and snapshot review/recalculation. The selected segment is remembered per account during the app session. Timeline bars open details, while queue edits support a bounded target level, eligible lane/order controls, and a before-save schedule preview.

## Known limitations

- Only Home Village plans are represented by the planner domain.
- Goblin Builder and Goblin Laboratory assignments are modeled but are ineligible in the current screen because active-event/player eligibility is not confirmed there.
- Missing costs may be shown as unknown without blocking scheduling; missing durations produce an unknown projection.
- The Add catalog shows the next eligible level for each entity. Missing current levels remain visible with manual level entry; queued edits can target supported later levels and aggregate the intervening validated estimates.
- The current screen selects the most recently updated account plan; it does not offer a named-scenario selector.
- Game-data modifiers are not applied by the planner scheduler.
- Jira status and acceptance criteria for CO-17 through CO-27 were not available to this audit.

## Verification

Run the relevant checks from the repository root:

```powershell
npm test -- --runInBand tests/planner
npm run typecheck
npm run lint
```

The planner-specific tests cover catalog validation, queue mutations, persistence, projections, and structure-instance behavior. An Android development build/device smoke test remains necessary for final UI verification.

## Detailed documents

- [Product spec](./product-spec.md)
- [Game domain](./game-domain.md)
- [Architecture](./architecture.md)
- [Scheduling engine](./scheduling-engine.md)
- [UI/UX](./ui-ux.md)
- [Data sources](./data-sources.md)
- [Roadmap audit](./roadmap.md)
- [Structure-instance identity](./structure-instance-identity.md)
- [Magic item mechanisms](../mechanism-for-magic-items.md)
