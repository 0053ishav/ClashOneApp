# Planner Structure Instance Identity

Status: implemented in the planner domain and persistence path; remaining integration and Android verification are tracked below.

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

The planner domain now includes a structure-instance model:

- `id`: opaque, persisted Clash One instance ID (not the game `data` ID).
- `accountTag`, `village`.
- `entityId` / `dataId`: definition reference.
- `currentLevel`: observed level for this copy.
- `superchargeLevel` or other applicable state where relevant.
- `identityConfidence`: whether the mapping is user-confirmed, reconciled from a prior snapshot, or provisional.
- Optional source metadata for import reconciliation; never use display names as keys.

Planned items support an optional `structureInstanceId`, and legacy items without it remain readable. The catalog currently offers instance selection for structures where matching copies are available.

## Import and reconciliation rules

1. The account parser validates structure counts and produces grouped building-progress records.
2. `reconcileStructureInstances()` treats each `(account, village, definition, level, supercharge state)` bucket as a count.
3. The local service expands counts into app-owned instance records without changing raw import payloads.
4. Reconciliation preserves IDs for unchanged buckets and marks identities ambiguous when level/count distributions change.
5. Active timer association is withheld unless exactly one stable instance matches.
6. Persistence rejects missing or ambiguous instance identities for queue items that reference a copy.
7. For a brand-new import without prior instance state, generated labels such as “Archer Tower 1” are useful UI labels only. They are not proof that the game identifies that physical building as number 1.
8. The planner must never count an active upgrade twice: once as an observed live timer and again as a newly schedulable upgrade for the same instance.

## UX implications

- Show instance labels for structures with multiple copies, e.g. “Cannon · #2”, with current level and active/scheduled state.
- Let users select the exact copy when adding a plan item.
- Where identity is ambiguous, show a confirmation/reconciliation state instead of implying certainty.
- Allow a user to rename/label copies if that helps their own tracking, but labels are presentation and must not be the primary key.
- For bulk upgrades such as walls, consider a separate quantity/batch model rather than forcing every wall segment into the builder queue as a unique structure.

## Verification still required

- The planner test suite covers count expansion, stable repeated imports, ambiguous timer mapping, and persistence behavior; run it before changing reconciliation.
- Android import smoke testing remains required to validate the real export and user-facing ambiguity handling.
- Verify cross-account and village ownership constraints in the existing persistence tests before changing schema or IDs.

## Sources and constraints

- Example export supplied in the current conversation (Home Village `buildings` and Builder Base `buildings2` records include `data`, `lvl`, and `cnt`; active timer entries appear separately).
- Clash of Clans API portal: https://developer.clashofclans.com/
- The official API portal is a reference for documented public API behavior; do not assume the public API exposes the same full in-game export or a physical instance ID. The import payload is the evidence for the `cnt` behavior described above.

## Current integration limits

Instance selection exists when structure records are available. Ambiguous identities are shown with a warning and cannot be persisted as confirmed structure targets. The timeline identifies planned work by the candidate/entity and lane; detailed structure identity is displayed in catalog and queue context. The app does not claim that generated labels identify a physical copy in the game.
