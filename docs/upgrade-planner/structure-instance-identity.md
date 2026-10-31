# Planner Structure Instance Identity

Status: design decision for the Upgrade Planner; implementation is not yet complete.

## Why this is needed

The game export contains aggregate inventory records such as:

```json
{ "data": 1000002, "lvl": 16, "cnt": 2 }
{ "data": 1000002, "lvl": 17, "cnt": 1 }
{ "data": 1000002, "lvl": 17, "cnt": 3, "supercharge": 1 }
```

These records describe multiple instances of the same entity definition at a particular level/state. The same export also contains individual active-timer records (for example a building entry with `data`, `lvl`, and `timer`) that do not necessarily provide a stable physical instance identifier.

An entity definition ID answers **what kind of structure is this?** It does not answer **which copy is this?** A plan item for a multi-instance structure therefore needs an optional instance reference, in addition to the existing progression candidate/entity ID.

## Domain boundaries

Keep these concepts distinct:

- **Entity definition**: stable game data identity, e.g. `dataId` / progression `entityId`.
- **Imported level bucket**: source observation grouped by definition, level, and applicable state, with `cnt` as the number of copies in that bucket.
- **Structure instance**: a Clash One-owned identity for one copy in one account/village. This identity is not claimed to be supplied by the game export.
- **Planned upgrade**: user intent to upgrade a particular structure instance from its observed/current level to a target level.
- **Observed active timer**: an imported live timer. Link it to an instance only when matching is unambiguous; otherwise retain an explicit unresolved association.

Do not overload `ProgressionCandidate.candidateId` or `entityId` with an instance identity. Candidates describe game progression, not a player's individual copy.

## Proposed model

Introduce a structure-instance model in the planner domain when implementation begins:

- `id`: opaque, persisted Clash One instance ID (not the game `data` ID).
- `accountTag`, `village`.
- `entityId` / `dataId`: definition reference.
- `currentLevel`: observed level for this copy.
- `superchargeLevel` or other applicable state where relevant.
- `identityConfidence`: whether the mapping is user-confirmed, reconciled from a prior snapshot, or provisional.
- Optional source metadata for import reconciliation; never use display names as keys.

Add an optional `structureInstanceId` to planned building/trap/wall upgrades where individual-copy tracking is supported. Keep it optional for entity types where one shared level is the correct game model (for example troops and spells), and for legacy plans until migrated.

## Import and reconciliation rules

1. Parse `cnt` as a positive integer when present; validate it and do not silently coerce invalid values.
2. Treat each `(account, village, definition, level, relevant state)` bucket as a count, not as individually identified objects.
3. Expand counts into app-owned instance records only in the local domain layer; do not mutate or reinterpret the raw import payload.
4. Persist generated instance IDs. On subsequent imports, reconcile against prior instance records rather than regenerating IDs from current level alone.
5. A level change can move a structure between buckets. Match prior instances to new counts conservatively; preserve identity when a match is clear, and mark ambiguity when multiple copies are indistinguishable.
6. Imported timer records are evidence that an instance is upgrading, but if multiple same-definition/same-level copies could match, do not guess which one. Represent the timer association as unresolved and let the user confirm it.
7. For a brand-new import without prior instance state, generated labels such as “Archer Tower 1” are useful UI labels only. They are not proof that the game identifies that physical building as number 1.
8. The planner must never count an active upgrade twice: once as an observed live timer and again as a newly schedulable upgrade for the same instance.

## UX implications

- Show instance labels for structures with multiple copies, e.g. “Cannon · #2”, with current level and active/scheduled state.
- Let users select the exact copy when adding a plan item.
- Where identity is ambiguous, show a confirmation/reconciliation state instead of implying certainty.
- Allow a user to rename/label copies if that helps their own tracking, but labels are presentation and must not be the primary key.
- For bulk upgrades such as walls, consider a separate quantity/batch model rather than forcing every wall segment into the builder queue as a unique structure.

## Required tests before implementation is considered complete

- Import preserves `cnt` buckets and expands count N into exactly N distinct local instance IDs.
- Same entity definition at different levels creates separate observed level groups.
- Supercharged and normal states do not get accidentally merged when their progression state differs.
- Stable IDs survive a repeated identical import.
- A clear level transition preserves instance identity where reconciliation has sufficient evidence.
- Ambiguous same-level copies are not arbitrarily mapped to a timer.
- Planned item references the chosen instance and validation rejects an instance from another account/village or incompatible entity.
- Live timer and planned item cannot double-book the same instance.
- Existing plans without `structureInstanceId` remain readable during migration.
- Tests, TypeScript type-check, lint, and Android import verification pass.

## Sources and constraints

- Example export supplied in the current conversation (Home Village `buildings` and Builder Base `buildings2` records include `data`, `lvl`, and `cnt`; active timer entries appear separately).
- Clash of Clans API portal: https://developer.clashofclans.com/
- The official API portal is a reference for documented public API behavior; do not assume the public API exposes the same full in-game export or a physical instance ID. The import payload is the evidence for the `cnt` behavior described above.

## Implementation sequence

1. Add parser/domain tests for count buckets and instance identity, without changing the existing catalog behavior.
2. Introduce persisted per-account structure instances and reconciliation.
3. Extend planned upgrade items with an optional instance reference and validate it at the application boundary.
4. Update add/edit UI to choose a copy and show live-upgrade conflicts.
5. Update scheduler projection and timeline labels to keep instance-specific items separate.
6. Run tests/type-check/lint and verify with an imported Android account before closing the related Jira work.
