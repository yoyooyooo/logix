---
title: CAP-PRESS-003-FU1 Real Runtime Row Owner Proof
status: closed-implementation-proof
version: 1
---

# CAP-PRESS-003-FU1 Real Runtime Row Owner Proof

## Meta

| field | value |
| --- | --- |
| follow_up_id | `CAP-PRESS-003-FU1` |
| parent_packet | [cap-press-003-row-owner-nested-remap-pressure-packet.md](./cap-press-003-row-owner-nested-remap-pressure-packet.md) |
| status | `closed-implementation-proof` |
| lifecycle_result | `retained-harness + generalized-internal` |
| target_caps | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, overlay `CAP-13`, `CAP-25` |
| proof_gates | `PF-05`, `PF-06`, `PF-07` |
| pf08 | not claimed; no report/feed linkage asserted |

## Implementation Proof Scope

The implementation proof used real `Form.make`, real `RuntimeProvider / useModule / useSelector`, and real `Form.Companion.byRowId`.

The closing assertions do not inject fake `rowIdStore`, do not read raw `ui` paths, and do not introduce public verification-artifact vocabulary.

## Proof Samples

| proof sample | result |
| --- | --- |
| trackBy roster swap + `fieldArray("items").byRowId(rowId).update(...)` + `useSelector(handle, Form.Companion.byRowId(...))` | passed |
| nested `items -> allocations`, outer reorder, nested row companion read by nested row id | passed |
| outer replace after nested read | old nested row read exits |
| remove / replace after old row read | stale row companion read exits and does not hit replacement rows |
| duplicate nested row id across two outer rows | ambiguous owner exits instead of choosing an arbitrary row |

## Initial Friction

The first real-runtime implementation proof failed because read-side `Form.Companion.byRowId` only consumed `rowIdStore.getIndex`, while write-side `fieldArray(...).byRowId(rowId)` could still resolve by `trackBy` fallback. This exposed a read/write owner asymmetry in the internal host projection route.

## Internal Fix

`packages/logix-react/src/FormProjection.ts` now resolves row companion reads through the current state plus declared list configs, including nested list instances. It falls back to `rowIdStore.getIndex` only when declaration/state resolution is unavailable.

For duplicate nested `trackBy` values under the same `listPath`, the resolver returns `undefined`. This keeps the current public shape honest: `Form.Companion.byRowId(listPath, rowId, fieldPath)` does not invent an arbitrary parent owner and does not require a public parent row token for the current matrix.

## Retained Harness

`examples/logix-react/test/form-companion-host-gate.integration.test.tsx` is retained as the current combined host-gate proof sample.

The harness covers:

- `Form.Companion.field(path)` through `useSelector`
- row companion read/write symmetry after reorder
- nested owner remap after outer reorder
- old nested owner exit after outer replace
- stale row exit after remove / replace
- duplicate nested row id ambiguous-owner exit

## Decision Policy Check

| check | result |
| --- | --- |
| single truth | preserved; no second row truth |
| single owner | preserved; row owner remains active-shape / row identity lane |
| selector gate first | preserved; no `useRowSelector` or Form hook family |
| public surface | unchanged |
| generator stability | current spelling remains readable for current matrix; ambiguous nested duplicates are explicit non-hit |
| proof strength | improved from distributed proof to one real-runtime combined proof |

## Counter-Shape Outcome

| counter-shape | result |
| --- | --- |
| public row owner primitive | rejected for current matrix; internal resolver closes the proof without public owner noun |
| list/root companion | rejected; no irreducible roster-owned soft fact was found |
| second host read family | rejected; `useSelector(handle, Form.Companion.byRowId(...))` consumed the row owner |
| public cleanup/read-exit primitive | rejected for current matrix; stale reads exit through existing selector behavior and no live cleanup object is needed |

## Status Quo Burden

Status: satisfied for current matrix.

The burden is limited to current `SC-E` pressure and does not close `CAP-PRESS-007-FU2` / `TASK-009` declaration-driven selector type inference.

## Verification

| command | result |
| --- | --- |
| `pnpm --filter @examples/logix-react test -- --run test/form-companion-host-gate.integration.test.tsx` | passed, 5 tests |
| `pnpm --filter @logixjs/react test -- --run test/Hooks/useSelector.formCompanionDescriptor.test.tsx` | passed, 3 tests |
| `pnpm --filter @logixjs/form test -- --run test/Form/Form.Companion.RowScope.Authoring.test.ts test/Form/Form.RowIdentityContinuity.contract.test.ts` | passed, 8 tests |

## Non-claims

- no public row owner primitive
- no list/root companion
- no second host read family
- no public cleanup/read-exit primitive
- no `TASK-003` root compare productization
- no exact spelling change
- no claim that declaration-driven `Form.Companion.byRowId` result inference is implemented

## Current Sentence

`CAP-PRESS-003-FU1` closed the real-runtime row owner combined proof without reopening frozen public API. The retained harness proves current-matrix read/write/nested/cleanup/host symmetry; selector type inference remains with `CAP-PRESS-007-FU2` / `TASK-009`.
