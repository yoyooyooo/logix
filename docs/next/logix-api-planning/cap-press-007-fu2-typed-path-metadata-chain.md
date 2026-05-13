---
title: CAP-PRESS-007-FU2 Typed Path Metadata Chain
status: closed-partial-implemented
version: 5
---

# CAP-PRESS-007-FU2 Typed Path Metadata Chain

## Goal

Pressure-test whether `fieldValue` typed path inference and `Form.Companion.field/byRowId` declaration-driven result inference can close through the existing single selector gate without admitting a new public path concept, second host read route, or second descriptor interpreter.

This packet does not freeze exact typed path spelling and does not admit `Form.Path`. The original artifact-local type contract has been consumed by `TASK-009`: `fieldValue` typed path is implemented, returned-carrier companion exact typing is implemented, and imperative `void` callback authoring remains runtime-valid / honest-unknown.

## Source

- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [capability-atom-pressure-map.md](./capability-atom-pressure-map.md)
- [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-007-FU2` |
| status | `closed-partial-implemented` |
| pressure_mode | `adversarial` |
| target_scenarios | `SC-C`, `SC-E`, `SC-F`, supporting `SC-A` |
| target_caps | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26`, supporting `CAP-21` |
| overlay_caps | `CAP-10`, `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` |
| related_projections | `PROJ-06`, supporting `PROJ-03`, `PROJ-05` |
| related_enablers | `IE-06`, supporting `IE-03`, `IE-05` |
| required_proofs | `PF-07`, supporting `PF-03`, `PF-05` |
| coverage_kernel | one selector gate; Form selector primitive remains data-support; row owner internals stay hidden; no new public concept without admission |
| current_shape_under_attack | `fieldValue(valuePath: string)`, `Form.Companion.field(path: string)`, `Form.Companion.byRowId(listPath: string, rowId: string, fieldPath: string)`, `FormProgram<Id,TValues,TDecoded>`, `ModuleRefOfProgram`, `useSelector` overloads |
| capability_bundle | typed path legality + field result inference + companion lower metadata + row owner read route + host selector gate |
| cross_pressure_axes | typed path, declaration metadata, Form selector primitive, React host gate, row owner read route |
| forced_counter_shapes | public `Form.Path` / schema path builder; public typed descriptor object family; manual generic annotations; second React/Form hook family; metadata-as-public-object; type-only phantom metadata chain |
| status_quo_burden | no public concept only passes if type-only path and metadata can close without hidden interpreter, permanent `unknown`, or manual type truth |
| implementation_proof_route | required; internal / test-backed / artifact-local |
| concept_admission_gate | any public path object, metadata object, descriptor family, hook family, or owner token must pass admission before registry entry |
| non_claims | no `TASK-003`, no root compare productization, no exact spelling freeze, no public surface registry row |

## Current Facts

| lane | current fact | pressure |
| --- | --- | --- |
| typed path seed | `CanonicalPath<TValues>`, `CanonicalValue<TValues, P>`, `CanonicalListPath<TValues>` already exist internally | selector helpers still accept `string` |
| companion authoring seed | `FormDefineApi.field<P extends CanonicalPath<TValues>>(...).companion(...)` has typed `CompanionLowerContext` | lower return type is not captured into readable program metadata |
| public Form selector primitive | `Form.Companion.field(path)` and `Form.Companion.byRowId(...)` are opaque descriptor-first tokens | descriptor types carry no generic result information |
| React host gate | `useSelector` second argument is sealed and consumes Form descriptors | companion overloads still return `unknown` |
| handle type chain | `ModuleRefOfProgram<Id, Sh, Ext, R>` preserves program `Ext` only if the program carries it | current `FormProgram<Id,TValues,TDecoded>` uses `Ext=FormHandle<TValues,TDecoded>` and does not expose companion metadata |
| row owner runtime route | `Form.Companion.byRowId` resolves current owner internally and exits on ambiguous nested owner | list path and row field path are not type-constrained |

## Adversarial Proof Sample

The combined proof is:

```ts
const program = Form.make("inventory", config, ($) => {
  $.list("items", { identity: { trackBy: "id" } })
  $.field("items.warehouseId").companion({
    deps: ["countryId", "items.warehouseId"],
    lower(ctx) {
      return {
        availability: { kind: "interactive" as const },
        candidates: { items: [{ id: "w1", label: "A" }] },
      }
    },
  })
})

const form = useModule(program)

const value = useSelector(form, fieldValue("items.0.warehouseId"))
const bundle = useSelector(form, Form.Companion.field("items.warehouseId"))
const rowBundle = useSelector(form, Form.Companion.byRowId("items", rowId, "warehouseId"))
```

The route is acceptable only if:

- invalid value paths fail at compile time where literal path information is available
- `value` infers from `TValues`
- `bundle` infers from the exact `lower` result or an admitted companion bundle projection type
- `rowBundle` infers the row field companion type without exposing parent row token, owner coordinate, or nested remap key
- React host never reinterprets Form DSL metadata at runtime

## Counter-Shapes

| counter-shape | public delta | owner / truth placement | first-read impact | generator impact | implementation sketch | proof requirement | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| public `Form.Path` / schema path builder | add `Form.Path` or `Form.path(...)` | path legality moves to a public value object | explicit but adds noun and lifecycle | agents must learn builder and when to lower | path object lowers to string or descriptor | `PF-07`, concept admission, concept-count proof | rejected for now; keep as fallback if type-only route fails |
| public typed descriptor family | add `Form.Selector.fieldValue(...)` or similar | descriptor owns path and result type | explicit selector family, but larger surface | more route choices | generic descriptor brand consumed by host | `PF-07`, no second interpreter proof | rejected for now; only reconsider after proof failure |
| manual generic annotations | keep `fieldValue<T>("x")` and companion as `unknown` | user becomes type truth owner | short but unsound | unstable generation; invalid paths pass | current shape plus explicit generic | cannot prove path legality | rejected as terminal answer |
| second React/Form hook family | add `useFieldValue`, `useCompanion`, `useFormSelector` | host read owner splits | locally terse | import and route branching | hook wraps `useSelector` | wrapper equivalence proof | rejected by FU1 and this packet |
| metadata-as-public-object | expose program metadata object or public generic parameter users must write | program becomes explicit metadata carrier | heavy and leaks internals | user/agent must maintain metadata | `FormProgram.metadata` or explicit companion map | authority and owner proof | rejected as public surface |
| type-only phantom metadata chain | no runtime public noun | declaration DSL infers metadata, `FormProgram` phantom carries it, host selector consumes type only | smallest first-read impact | best if inferred automatically | generic descriptor + `FormProgram` / `ModuleRef` type channel, runtime payload unchanged | type-level proof and compile contract tests | accepted as proof route |

## Status Quo Burden

| burden | result |
| --- | --- |
| readable combined proof | satisfied for the canonical route: `useSelector(handle, fieldValue(...))`, `useSelector(handle, Form.Companion.field(...))`, and `useSelector(handle, Form.Companion.byRowId(...))` stay readable |
| agent generation stability | satisfied for returned-carrier teaching path; manual generic terminal answers stay rejected and widened strings degrade honestly |
| no hidden second read route | satisfied; reads continue through the single `useSelector` host gate |
| no hidden second interpreter | satisfied for the accepted path; React host consumes Form-owned type metadata and does not reconstruct Form declarations at runtime |
| proof coverage | satisfied for `fieldValue` literal exact result, invalid literal rejection, widened string `unknown`, returned-carrier companion exact result, and row companion exact result |
| no public concept | satisfied; public `Form.Path`, metadata object, typed descriptor namespace, hook family, and row owner token remain not admitted |

Conclusion after `TASK-009`: FU2 is closed as `partial-implemented`. Public API no-change is accepted for the current matrix. The only retained type gap is imperative `void` callback auto-collection, which remains runtime-valid / honest-unknown and requires a future exact authoring-shape reopen if it becomes a product goal.

## Verification Artifact Lifecycle

| field | value |
| --- | --- |
| proof_id | `PROOF-CAP-PRESS-007-FU2-type-only-path-metadata-chain` |
| status | `executed-red-current-shape` |
| scope | internal / type-test / artifact-local |
| artifact | `packages/logix-react/test/Hooks/useSelector.typed-path-metadata.contract.test.ts` |
| validation | `pnpm --filter @logixjs/react typecheck` passed |
| allowed_edits | type declarations and compile-only tests; no public runtime noun |
| forbidden | public `Form.Path`, second hook family, React-side Form DSL interpreter, public owner token, permanent `unknown` as final result |
| must_prove | invalid literal path rejects; valid literal path returns exact value; widened string degrades honestly; companion lower return type reaches `Form.Companion.field`; row companion exact type survives `byRowId` |
| proof_result | initial implementation proof exposed two gaps; `TASK-009` closed `fieldValue` typed path and returned-carrier companion exact lower-result inference |
| lifecycle_green | reached for `fieldValue` and returned-carrier `Form.Companion.field/byRowId` exact typing |
| lifecycle_red | consumed by `TASK-009` and [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md) without admitting public path / descriptor / metadata concepts |
| lifecycle_retained_gap | imperative `void` callback auto-collection remains outside the accepted exact typing path |
| lifecycle_public_noun_needed | run concept admission for path carrier / descriptor and then authority writeback if admitted |
| lifecycle_second_interpreter_needed | reopen frozen selector shape or open `COL-*` |

## Decision

`CAP-PRESS-007-FU2` closes the pressure slice. Its implementation follow-up is now consumed by `TASK-009`:

Accepted:

- type-only phantom metadata chain is the preferred proof route
- typed path as constrained existing string slot is the first proof direction
- no new public concept enters the registry now
- `TASK-009` closed `fieldValue` path inference without a public path noun
- `TASK-009` closed returned-carrier `Form.Companion.field/byRowId` exact lower-result inference without a public metadata noun
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md) landed authority writeback for exact `Form.Companion.field/byRowId` declaration metadata inference through a `+0` public concept type-only carrier

Rejected for this packet:

- public `Form.Path` / schema path builder without proof failure and concept admission
- public metadata object on `FormProgram`
- second React/Form read hook family
- owner token / nested remap coordinate in public path
- manual generics as the terminal type-safety answer

Status quo burden after implementation follow-up:

- public API no-change remains acceptable for `fieldValue`, because typed path inference closed without `Form.Path`
- public API no-change remains acceptable for returned-carrier companion lower-result inference, because the Form-owned type-only carrier keeps runtime public nouns unchanged
- imperative `void` callback auto-collection is not part of the accepted exact typing guarantee; that route continues to read as `unknown`
- reopen concept admission only if a future implementation goal requires public path object, public metadata object, typed descriptor namespace, second hook family, public row owner token, or exact inference for imperative `void` callbacks without a returned carrier

## Writeback

| target | update |
| --- | --- |
| [capability-atom-pressure-map.md](./capability-atom-pressure-map.md) | keep `CAP-PRESS-007` pressure closed; record `TASK-009` partial close and optional returned-carrier teaching follow-up |
| [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md) | mark `TASK-009` done-partial-accepted; next route is docs/examples teaching follow-up or watch-only |
| [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md) | mark `fieldValue` implemented/proven; mark `Form.Companion.*` type status partial because returned-carrier is exact and `void` callback remains honest-unknown |
| [surface-candidate-registry.md](./surface-candidate-registry.md) | keep no new row; public path/descriptor/hook shapes remain not admitted |
| [shape-snapshot.md](./shape-snapshot.md) | reflect that selector type chain is closed for `fieldValue` and returned-carrier companion exact typing; `void` callback remains honest-unknown |
| [run-state.md](./run-state.md) | cursor stays paused with optional returned-carrier docs/examples teaching follow-up; no non-blocked pressure slice remains |

## Current Sentence

`CAP-PRESS-007-FU2` pressure is closed. `TASK-009` implemented `fieldValue` typed path inference and returned-carrier `Form.Companion.*` exact lower-result inference without admitting a public path or metadata concept. Imperative `void` callback authoring remains runtime-valid / honest-unknown. Next cursor is optional returned-carrier docs/examples teaching follow-up; no non-blocked pressure slice remains. `TASK-003` stays deferred.
