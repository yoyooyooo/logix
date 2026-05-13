---
title: TASK-009 Type-Only Path Metadata Chain Scope
status: done-partial-accepted
version: 4
---

# TASK-009 Type-Only Path Metadata Chain Scope

## 目标

关闭 `CAP-PRESS-007-FU2` 留下的 selector 类型链 implementation gap：在不新增 public path noun、descriptor family、metadata object、第二 hook family 或 public owner token 的前提下，让 typed path 与 returned-carrier companion declaration metadata 通过同一条类型链进入 `useSelector`。

本页记录 `TASK-009` 的实施 scope 与 partial close，不承担 authority，不冻结 exact typed path spelling。若未来实施需要新增公开概念，必须先回到 concept admission。

## Source

- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-009` |
| status | `done-partial-accepted` |
| execution_topology | `multi-agent-assisted` |
| owner_lane | host selector / type chain |
| target_caps | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26`, supporting `CAP-21` |
| source_packets | `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2` |
| proof_gates | `PF-07`, supporting `PF-03`, `PF-05` |
| public_surface_budget | no new public concept; existing string slots may receive stronger type signatures only if exact authority is synchronized after implementation |

## Red Proof Baseline

| field | value |
| --- | --- |
| proof_id | `PROOF-CAP-PRESS-007-FU2-type-only-path-metadata-chain` |
| artifact | `packages/logix-react/test/Hooks/useSelector.typed-path-metadata.contract.test.ts` |
| validation | `pnpm --filter @logixjs/react typecheck` passed |
| original red lines | before `TASK-009`, `fieldValue` returned `unknown` without manual generic, invalid literal paths still passed at the host selector gate, `Form.Companion.field/byRowId` returned `unknown`, and lower result metadata did not cross `FormProgram -> handle -> selector` |
| current result | `fieldValue` typed path is green; returned-carrier companion lower result metadata is green; imperative `void` callback remains runtime-valid / honest-unknown |

## Implementation Target

| axis | target |
| --- | --- |
| typed value path | done; `fieldValue` infers value type from the handle state when literal path information is available |
| invalid literal path | done; invalid literal value path fails at compile time where the caller supplies a typed Form handle or typed state handle through `useSelector` |
| widened string | done; widened `string` degrades honestly instead of pretending exact path safety |
| companion field metadata | done for returned-carrier path; `field(path).companion({ lower })` return type is carried as type-only metadata into `FormProgram` and consumed by `Form.Companion.field(path)` |
| row companion metadata | done for returned-carrier path; `Form.Companion.byRowId(listPath, rowId, fieldPath)` infers the row field companion bundle without exposing row owner, nested remap, or cleanup coordinates |
| host boundary | React host consumes typed descriptors only; it must not reconstruct Form declaration semantics at runtime |

## Partial Implementation Result

| item | result |
| --- | --- |
| `fieldValue` typed path | implemented through an opaque typed selector carrier in `packages/logix-react/src/FormProjection.ts` |
| host overload | `useSelector` now has `FieldValueSelector` overloads that infer exact values from typed handles and reject invalid literal paths at the host-gate entry point |
| manual generic route | removed from current call sites; `fieldValue<number>("path")` is no longer the supported terminal type-safety answer |
| compile contract | `packages/logix-react/test/Hooks/useSelector.typed-path-metadata.contract.test.ts` now records `fieldValue` green behavior, returned-carrier companion exact metadata green behavior, and `void` callback honest-unknown |
| validation | `pnpm --filter @logixjs/react typecheck` passed |
| public runtime behavior | unchanged |

## Current Blocker Resolved To Partial Close

Exact companion lower result inference remains blocked by the current authoring shape unless the implementation adds a sound type-only carrier:

- `Form.make(..., ($) => { ... })` accepts an imperative callback that returns `void`.
- `$.field(path).companion({ lower })` is a side-effecting declaration method.
- TypeScript cannot soundly collect the `lower` return types from side-effecting calls inside a `void` callback into the return type of `Form.make`.
- Any implementation that claims exact `lower` result inference without changing that type carrier would be a hidden manual type truth or an unsound approximation.

[auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md) resolved this as authority writeback, not public concept admission. `TASK-009` then accepted returned-carrier as the sound exact typing path. The imperative `void` callback remains supported for runtime authoring but cannot auto-collect exact metadata; selector result typing degrades honestly.

## Candidate Write Set

| file | expected responsibility |
| --- | --- |
| `packages/logix-form/src/internal/form/types.ts` | reuse or extend `FieldPath`, `FieldValue`, `CanonicalPath`, `CanonicalValue`, `CanonicalListPath`, and `CanonicalListItem` type helpers |
| `packages/logix-form/src/internal/form/impl.ts` | carried companion metadata as phantom type on `FormProgram` / handle extension without runtime payload changes |
| `packages/logix-form/src/Form.ts` | avoid new public type exports by default; stop for concept admission if downstream typing cannot close without exporting additional path / metadata helper types |
| `packages/logix-form/src/Companion.ts` | added generic descriptor payload types for `field` and `byRowId` while preserving current runtime descriptor shape |
| `packages/logix-react/src/FormProjection.ts` | strengthened `fieldValue` and internal selector result typing while keeping runtime read-query payload unchanged |
| `packages/logix-react/src/internal/hooks/useSelector.ts` | updated overloads so typed Form companion descriptors return their carried result types through the single host gate |
| `packages/logix-react/test/Hooks/useSelector.typed-path-metadata.contract.test.ts` | converted to green returned-carrier assertions plus `void` callback honest-unknown assertions |

## Non-target Write Set

| file / area | rule |
| --- | --- |
| `docs/next/logix-api-planning/task-003*` | do not touch; root compare productization remains deferred |
| `packages/logix-react/src/internal/hooks/useModule.ts` | avoid changing runtime handle creation unless the phantom type cannot be carried through existing `Program` / `ModuleRefOfProgram` generics |
| `packages/logix-core/**` | no expected runtime change for this task |
| new public React hooks | forbidden |
| public path builder or object | forbidden unless concept admission passes first |

## Validation Gate

Minimum gate:

```bash
pnpm --filter @logixjs/react typecheck
```

The green compile contract currently covers:

- valid literal `fieldValue("items.0.warehouseId")` infers `string`
- invalid literal `fieldValue("items.0.notAField")` rejects when consumed by `useSelector` with a typed handle
- widened `string` degrades honestly
- current typed path recursion depth is finite; deeper legal paths require implementation budget expansion, not a public path noun by default

The retained non-claim is:

- imperative `void` callback declarations do not auto-collect exact companion metadata and should read as `unknown`

Supporting regression gate:

- `PF-03` companion authoring tests remain green
- `PF-05` row owner proof remains green
- no new public export appears for `Form.Path`, schema path builder, second hook family, metadata object, or owner token
- no new `@logixjs/form` public type export appears unless it is required by the landed authority budget and does not create a new public concept

## Authority Sync Rule

No concept admission was required for the `fieldValue` partial implementation because no new public concept was admitted.

Authority writeback is now satisfied for a `+0` public concept Form-owned type-only metadata carrier. Concept admission is required only if implementation cannot close without a public path noun, public metadata object, public typed descriptor family, second hook family, manual generic truth, or public owner token.

Exact authority sync is still required after implementation if public TypeScript signatures change in:

- `fieldValue(valuePath)`
- `Form.Companion.field(path)`
- `Form.Companion.byRowId(listPath, rowId, fieldPath)`
- `FormProgram` exported type parameters or inferred handle extension
- any newly required public type export from `@logixjs/form`

## Reopen Bar

Open concept admission, `COL-*`, or authority writeback before implementation continues if any of these becomes true:

- typed path cannot close without a public `Form.Path` / schema path builder value
- companion metadata cannot cross the existing `FormProgram -> ModuleRefOfProgram -> useSelector` type chain
- React host must interpret Form declaration metadata at runtime
- a second descriptor interpreter or second host hook family becomes necessary
- row companion exact inference requires a public owner token, nested remap coordinate, or cleanup token
- compile contracts can only pass through manual generic annotations supplied by users

## Current Sentence

`TASK-009` is done-partial-accepted. `fieldValue` typed path inference is green and runtime behavior is unchanged; returned-carrier `Form.Companion.field/byRowId` lower-result inference is green through the landed `+0` public concept Form-owned type-only metadata carrier. Imperative `void` callback authoring remains runtime-valid / honest-unknown. `TASK-003` remains deferred.
