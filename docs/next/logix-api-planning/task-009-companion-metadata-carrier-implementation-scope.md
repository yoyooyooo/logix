---
title: TASK-009 Companion Metadata Carrier Implementation Scope
status: accepted-partial-close
version: 3
---

# TASK-009 Companion Metadata Carrier Implementation Scope

## Goal

Implement exact `Form.Companion.field(path)` and `Form.Companion.byRowId(listPath, rowId, fieldPath)` lower-result inference through the landed `+0` public concept Form-owned type-only metadata carrier.

This task consumes [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md). It must not add public runtime nouns or start `TASK-003`.

## Source

- [task-009-type-only-path-metadata-chain-scope.md](./task-009-type-only-path-metadata-chain-scope.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-009-companion-metadata-carrier` |
| status | `accepted-partial-close` |
| owner_lane | Form declaration metadata / host selector type chain |
| target_caps | `CAP-10`, `CAP-13`, `CAP-21`, `CAP-25`, `CAP-26` |
| proof_gates | `PF-03`, `PF-05`, `PF-07` |
| public_surface_budget | `+0` public concept; existing `Form.make`, `FormProgram`, `Form.Companion.*`, and `useSelector` may receive type-only signature changes |
| runtime_budget | runtime descriptor payload and public runtime objects stay unchanged |

## Implementation Result

| item | result |
| --- | --- |
| Form-owned carrier | implemented as type-only phantom metadata on `FormProgram`; no runtime public object added |
| companion declaration return | `field(path).companion(...)` returns a carrier that can be returned from `define` |
| returned-carrier inference | green; `return $.field(...).companion(...)` lets `Form.Companion.field(...)` and `Form.Companion.byRowId(...)` infer exact lower result |
| imperative void callback | accepted honest fallback; side-effecting `$.field(...).companion(...)` calls inside a `void` callback are not automatically collected and return `unknown` on selector reads |
| runtime behavior | unchanged |
| public concept admission | none |

## Implementation Target

| target | requirement |
| --- | --- |
| companion metadata capture | infer exact `lower` return type from `field(path).companion({ lower })` into a type-only carrier |
| program carrier | carry companion metadata through `FormProgram` without public `metadata` value |
| descriptor typing | `Form.Companion.field(path)` and `Form.Companion.byRowId(...)` carry enough type information for `useSelector` overloads |
| host consumption | React host consumes typed descriptors and does not interpret Form declarations at runtime |
| row route | row companion exact result uses same metadata carrier and does not expose owner token or nested remap coordinate |
| widened paths | widened `string` continues to degrade honestly |

## Candidate Write Set

| file | responsibility |
| --- | --- |
| `packages/logix-form/src/internal/form/impl.ts` | extend `FormProgram` and `FormDefineApi` typing with a Form-owned phantom companion metadata carrier |
| `packages/logix-form/src/Companion.ts` | strengthen descriptor generic payload types while preserving runtime shape |
| `packages/logix-form/src/Form.ts` | re-export only existing accepted types; avoid new public nouns unless authority requires it |
| `packages/logix-react/src/internal/hooks/useSelector.ts` | add overloads that return descriptor-carried companion result types |
| `packages/logix-react/test/Hooks/useSelector.typed-path-metadata.contract.test.ts` | turn companion `@ts-expect-error` red lines green |

## Forbidden

- public `Form.Path` or schema path builder
- public `FormProgram.metadata` object
- public typed descriptor namespace
- `useCompanion`, `useFormSelector`, or any second hook family
- React-side Form declaration interpreter
- manual generic result truth
- public row owner token, nested remap coordinate, or cleanup token
- root compare productization or `TASK-003`

## Proof Contract

Minimum validation:

```bash
pnpm --filter @logixjs/react typecheck
pnpm --filter @logixjs/form typecheck
```

Compile contract proves for the returned-carrier path:

- `useSelector(form, Form.Companion.field("items.warehouseId"))` infers exact `lower` result where declaration metadata is available
- `useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))` infers the same row companion result
- returning a carrier tuple, for example `return [countryCarrier, warehouseCarrier] as const`, preserves exact metadata for multiple companion declarations
- invalid literal paths reject where typed path information exists
- widened `string` returns `unknown`
- `fieldValue` typed path behavior remains green

Regression contract must preserve:

- `PF-03` companion authoring
- `PF-05` row owner proof
- `PF-07` single host selector gate
- no public concept enters [surface-candidate-registry.md](./surface-candidate-registry.md)

## Reopen Bar

Open concept admission or `COL-*` if implementation can only pass by:

- adding a public path object
- adding public metadata object or user-authored metadata map
- adding a public typed descriptor family
- adding a second host read family
- moving companion declaration interpretation into React host
- exposing row owner or nested remap coordinates
- keeping `unknown` as the terminal companion result

Open exact authoring-shape review if a future goal requires exact companion typing for imperative `void` callbacks without returned carriers.

## Current Sentence

`TASK-009-companion-metadata-carrier` is accepted as a partial close. The returned-carrier path proves exact companion result inference without public concept admission; the imperative `void` callback remains runtime-valid but selector result typing honestly degrades. `TASK-003` remains deferred.
