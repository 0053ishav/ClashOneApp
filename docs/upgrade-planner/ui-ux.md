# Upgrade Planner UI/UX

## Recommendation: interactive Gantt-style timeline

The schedule is constrained by time and resource slots, so a lane-based Gantt view communicates conflicts and parallel work more directly than pie charts or category charts. The existing screen already uses this as its primary visualization. A dedicated drag-and-drop library is not needed for the current native flow.

## Screen hierarchy and workflow

The planner tab has an account pill and three in-place segments:

1. **Plan** shows the estimate summary and actionable warning counts, then the timeline as its first large element, followed by compact editable queue rows. Its primary action switches to Add.
2. **Add** keeps search and category chips fixed above a virtualized candidate list. Catalog rows show level, cost, duration, prerequisite/state information, and add actions. Missing current levels remain visible with an inline level editor.
3. **Details** contains the dated per-lane sequence, a stacked resource summary with a separate unknown-cost segment, scheduling assumptions, and explicit snapshot review/recalculation.

The selected segment is retained independently per account for the lifetime of the app process. Switching to Add does not unmount or replace the plan state; returning to Plan retains the same queue and timeline.

## Timeline interaction

The timeline has one row per builder, plus Laboratory and Pets; Goblin rows appear only when used by a plan or observed timer. The lane-label column stays alongside a horizontally scrollable time axis. Days shows a 30-day window, Weeks 90 days, and Months 365 days. Tick density decreases at longer scales.

Scheduled bars show planned work without embedded names; live timers use a locked gray style; blocked bars have a red dashed outline; unknown bars have a gray dashed outline. Bars retain a minimum visual/touch width and selecting one opens a detail sheet. Queue controls perform edits; dragging bars is not required. Today is the initial horizontal position, and selecting a scheduled bar scrolls it into view. A completion marker appears when the estimate is within the selected window.

## Supporting summaries

- The Plan summary labels finish as an estimate, reports action count and lanes in use, and says “Finish covers known work only” when a duration is unknown.
- Warning counts link to filtered queue rows, missing-level catalog entries, or snapshot review.
- Details show queue size, live timers, used lanes, and dated queue order grouped by lane.
- Resource totals include known costs for scheduled work only; unknown scheduled costs get a separate dashed bar segment and are never added as zero.
- Per-lane counts supplement the timeline. They are not a second chart competing with the schedule.

## States, accessibility, and responsive behavior

Account, catalog loading/error/partial/empty, search miss, missing level, stale snapshot, queue-save error, blocked schedule, unknown duration, and no-plan states have distinct copy or status treatment. Queue edits preview before/after start dates and finish, and destructive removal requires confirmation. Controls use native Pressable/TextInput patterns and labels; timeline rows have accessible names and selection actions. Colors use `useHomeColors` tokens.

The fixed lane labels and native horizontal scroll keep the time axis usable on narrow screens. Upgrade names and long text stay in details rather than inside bars. A device smoke test is still needed to validate actual Android font scaling, touch targets, and long-plan scrolling.

## Alternatives

- **Desktop table:** rejected as the primary view because it hides temporal overlap on mobile.
- **Pie charts:** rejected because they do not explain lane conflicts or finish dates.
- **Drag-to-reschedule:** deferred; editing the queue and reviewing a before-save schedule preview is clearer and safer for touch input.
- **Automatic optimization:** deferred because there is no validated objective function for balancing resources, Town Hall progression, heroes, or farming.

## Follow-up UX gaps

The screen has no named-plan selector, no event/modifier layer, no drag interaction, and no verified Android performance measurement for unusually large queues. Keep these out of the current acceptance claim.
