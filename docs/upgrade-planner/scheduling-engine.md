# Scheduling engine

## Inputs and output

`schedulePlanner()` takes an explicit `nowMs`, progression candidates, persisted plan items, observed active timers, prerequisite state, and lane availability. It returns one projection per planned item with a `scheduled`, `blocked`, or `unknown` state. It has no persistence, React, network, or `Date.now()` dependency.

## Lane model

Each builder index has its own reservation. Laboratory, Pets, Goblin Builder, and Goblin Laboratory each have one modeled reservation. Independent lanes can progress concurrently. An observed live timer reserves its known lane until its completion timestamp. A timer with an invalid/unknown completion makes the lane unavailable rather than inventing a free time.

## Ordering and dependencies

Queue order is stable within a lane, with creation timestamp and item ID as deterministic tie-breakers. The scheduler checks lane eligibility, prerequisite state, candidate existence, duration, and target validity before projecting completion. When an entity-level prerequisite is not met, a queued candidate for that entity that can satisfy it may provide a completion dependency. A Town Hall-level prerequisite can likewise depend on a queued Town Hall candidate explicitly identified from entity metadata. Unresolved work remains blocked or is reported as a dependency cycle.

An earlier queued action that is still waiting on a prerequisite holds later actions in the same lane. Work on another eligible lane can continue; when the dependency completes, the earlier action is scheduled before subsequent same-lane work.

Town Hall, Laboratory, and Pet House levels are evaluated against the current prerequisite snapshot. Missing entity levels are reported as unknown rather than accepted. The catalog data adapter currently extracts Town Hall, Laboratory, and Pet House prerequisites; general game-data prerequisite coverage remains incomplete.

## Unknown estimates

- Unknown duration produces an `unknown` projection and does not occupy a lane as a zero-duration action.
- Unknown cost does not prevent scheduling when duration and other required inputs are known. The cost is excluded from known resource totals and counted as incomplete.
- Invalid target levels, missing candidates, unsatisfied prerequisites, unavailable lanes, and cycles produce blocked projections with reason codes.
- Overall completion estimates include scheduled work only. The view labels the overall estimate incomplete when work is blocked or unknown.

## Determinism and complexity

The clock is explicit. Queue ordering uses stable values, and output is generated from the same immutable input set. Scheduling passes are bounded by `items.length + 1`; each pass walks pending items and checks candidate/prerequisite relationships. Cycle detection uses a depth-first traversal over the derived dependency graph. This is suitable for the current account-sized queues; large-plan stress limits have not been measured on Android.

## Modifiers

No modifier or event-window input exists in the current scheduler contract. Do not adjust durations for boosts, books, hammers, Hammer Jam, or inventory. Such support requires verified effect rules and explicit availability/overlap semantics before the engine is extended.

## Invariants and tests

Planner tests cover deterministic scheduling, lane conflicts and concurrency, occupied or unknown lanes, prerequisites and cycles, instant tasks, Goblin eligibility, unknown costs/durations, and projection view-model totals. Queue/persistence tests cover ordering, account ownership, and durable intent. Confirm current test coverage in `tests/planner/` before changing any invariant.
