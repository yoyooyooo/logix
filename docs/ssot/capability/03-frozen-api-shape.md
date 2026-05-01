---
title: Logix Frozen API Shape
status: frozen
version: 4
---

# Logix Frozen API Shape

## 目标

冻结当前 `SC-A..SC-F` / `CAP-01..CAP-26` / `VOB-01..VOB-03` 矩阵范围内的 API 形状。

本页只做全局 frozen shape 汇总。exact spelling 仍由各 owner authority 持有：

- core public spine 看 [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)
- Form exact surface 看 [../form/13-exact-surface-contract.md](../form/13-exact-surface-contract.md)
- Form route boundary 看 [../form/05-public-api-families.md](../form/05-public-api-families.md)
- React host law 看 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)
- verification control plane 看 [../runtime/09-verification-control-plane.md](../runtime/09-verification-control-plane.md)
- capability decomposition 看 [../form/08-capability-decomposition-api-planning-harness.md](../form/08-capability-decomposition-api-planning-harness.md)

## Freeze Scope

| field | value |
| --- | --- |
| frozen_scenarios | `SC-A..SC-F` |
| frozen_caps | `CAP-01..CAP-26` |
| frozen_vobs | `VOB-01..VOB-03` |
| projection_state | `PROJ-01..PROJ-07` baseline |
| surface_candidates | `SURF-001`, `SURF-002` authority-linked |
| public_surface_delta | no extra public concept beyond owner authority pages |
| closure_basis | `2026-04-24-global-api-shape-closure-gate-after-pf-09` plus post-CONV task closure |

## Frozen Public Shape

### Core Runtime Spine

The frozen spine is:

```ts
Module.logic(...)
Program.make(Module, config)
Runtime.make(Program)
```

`runtime.check / runtime.trial / runtime.compare` are frozen as runtime control-plane stages. They do not enter authoring surface.
Landed public verification facades are `Runtime.check(Program, options?)` and `Runtime.trial(Program, options)`.
`runtime.compare` remains frozen only as a runtime control-plane stage.

### Form Authoring Route

The frozen Form domain authoring route is:

```ts
Form.make(id, config, ($) => {
  $.rules(...)

  $.field(path).rule(rule, options?)

  $.field(path).source({
    resource,
    deps,
    key,
    triggers?,
    debounceMs?,
    concurrency?,
    submitImpact?,
  })

  $.field(path).companion({
    deps,
    lower(ctx) {
      return {
        availability,
        candidates,
      }
    },
  })

  $.root(rule)
  $.list(path, spec)
  $.submit(config?)
})
```

This shape covers declaration, rule, submit, source, local soft fact, and list/root helper needs without adding a second declaration carrier.
The exact source trigger set is owned by [../form/13-exact-surface-contract.md](../form/13-exact-surface-contract.md); current day-one Form source triggers are limited to `onMount` and `onKeyChange`.

### Form Runtime Handle Route

The frozen Form runtime handle route is:

```ts
form.validate()
form.validatePaths(paths)
form.submit(options?)
form.reset(values?)
form.setError(path, error)
form.clearErrors(paths?)

form.field(path).set(value)
form.field(path).blur()

form.fieldArray(path).append(value)
form.fieldArray(path).prepend(value)
form.fieldArray(path).insert(index, value)
form.fieldArray(path).update(index, value)
form.fieldArray(path).replace(nextItems)
form.fieldArray(path).remove(index)
form.fieldArray(path).swap(indexA, indexB)
form.fieldArray(path).move(from, to)
form.fieldArray(path).byRowId(rowId).update(value)
form.fieldArray(path).byRowId(rowId).remove()
```

This shape covers submit effects, manual error effects, field mutation, list mutation, and row identity operations.

### Data-support Namespaces

The frozen Form data-support namespaces are:

```ts
Form.Rule
Form.Error
Form.Companion
```

The frozen selector primitives are:

```ts
Form.Error.field(path)
Form.Companion.field(path)
Form.Companion.byRowId(listPath, rowId, fieldPath)
```

They are consumed only through the core host selector gate.

### React Host Route

The frozen React host route is:

```tsx
<RuntimeProvider runtime={runtime}>
  {children}
</RuntimeProvider>

const shared = useModule(ModuleTag)
const local = useModule(Program, options?)
const child = parent.imports.get(ModuleTag)
const childViaHook = useImportedModule(parent, ModuleTag)

const dispatch = useDispatch(handle)
const selected = useSelector(handle, selector, equalityFn?)

const value = useSelector(handle, fieldValue(path))
const tuple = useSelector(handle, fieldValues(paths))
const meta = useSelector(handle, rawFormMeta())
const error = useSelector(handle, Form.Error.field(path))
const companion = useSelector(handle, Form.Companion.field(path))
const rowCompanion = useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))
```

This shape covers host acquisition, local instantiation, parent-scope child resolution, dispatch, state projection, error projection, companion projection, and row-owner projection.

No-arg `useSelector(handle)` is not part of the terminal public React host route. Whole-state snapshot reads are repo-internal Devtools/debug/test-harness concerns.

`fieldValue(path)` is a core-owned typed selector carrier: literal paths can infer exact values when consumed with a typed handle through `useSelector`, invalid literal paths reject at that host-gate entry point, and widened `string` paths are rejected for typed handles because they cannot be checked against state. The current typed path helper has a finite recursion-depth budget; extending that budget remains implementation work and does not admit `Form.Path` or a schema path builder.

`fieldValues(paths)` is the core-owned multi-read tuple sibling of `fieldValue(path)`. Non-empty literal path tuples infer readonly tuples, invalid literal paths reject at the host-gate entry point, fixed tuple slots such as `fieldValues([""])` and `fieldValues(["count", ""])` offer typed handle state path completion, and widened `string[]` paths are rejected for typed handles because they cannot be checked against state. The editor-completion budget covers 10 tuple slots for small UI-atom tuples and does not admit a public object/struct projection descriptor.

`Form.Companion.field(path)` and `Form.Companion.byRowId(listPath, rowId, fieldPath)` remain the frozen public companion selector primitives. Exact lower-result inference is approved only through a Form-owned type-only declaration metadata carrier on the same `Form.make -> FormProgram -> handle -> selector` chain. This does not admit public `FormProgram.metadata`, `Form.Path`, a typed descriptor namespace, a second hook family, or a public row owner token.

### Verification Control Plane

The frozen verification shape is:

```ts
runtime.check
runtime.trial(mode: "startup")
runtime.trial(mode: "scenario")
runtime.compare
```

The first-version scenario input protocol is:

```ts
{
  fixtures: {
    env: ...
  },
  steps: [...],
  expect: [...],
}
```

The frozen report shell is `VerificationControlPlaneReport`.

`runtime.compare` is part of runtime control plane. It is not a Form authoring API, not a second correctness truth, and not a benchmark truth owner.

## Capability Coverage

| lane | frozen API shape | covered capabilities |
| --- | --- | --- |
| declaration spine | `Form.make`, `rules`, `field(...).rule`, `root`, `list`, `submit` | `CAP-01`, `CAP-02`, `CAP-03`, `CAP-04` |
| source lane | `field(path).source({ resource, deps, key, ... })` | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` |
| local soft fact lane | `field(path).companion({ deps, lower })`, `Form.Companion.field(path)` | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` |
| final truth / reason lane | `field(...).rule`, `root`, `list`, `submit`, `Form.Error.field(path)` | `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` |
| row identity lane | `fieldArray(path).*`, `fieldArray(path).byRowId(rowId).*`, `Form.Companion.byRowId(...)` | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` |
| host selector lane | `useModule`, `useImportedModule`, `useDispatch`, `useSelector`, `fieldValue`, `fieldValues`, `rawFormMeta` | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26` |
| verification lane | `runtime.check`, `runtime.trial`, `runtime.compare`, `fixtures/env + steps + expect` | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18`, `VOB-01`, `VOB-02`, `VOB-03` |

All capability atoms in the current matrix are covered by at least one frozen lane.
These coverage lanes serve capability accounting only. They do not redefine route owner or truth owner.
For companion, `field(path).companion({ deps, lower })` remains the authoring act and truth origin. `Form.Companion.field(path)` and `Form.Companion.byRowId(...)` remain root-visible selector primitives consumed only through the core host gate.

## Scenario Coverage

| scenario | frozen route composition |
| --- | --- |
| `SC-A` | `Form.make` + final rule / submit + `useModule` + `useSelector` |
| `SC-B` | `field(path).source(...)` + submit impact + source receipt evidence + selector read |
| `SC-C` | `field(path).source(...)` + `field(path).companion(...)` + `Form.Companion.field(path)` |
| `SC-D` | companion soft fact + final rule / submit truth + reason evidence + verification boundary |
| `SC-E` | `fieldArray(path).*` + `byRowId` write/read + cleanup reason evidence |
| `SC-F` | host selector gate + `Form.Error / Form.Companion` selector primitives + runtime control plane |

## Frozen Negative Space

The following shapes are rejected for the current matrix:

- `@logixjs/form/react`
- package-local `useForm*`
- Form-owned React hook family
- Form-owned pure projection family
- second host read family
- list/root companion baseline
- `Form.Source`
- `useFieldSource`
- public manual source refresh helper
- companion final truth owner
- source as submit truth owner
- benchmark truth owner
- second evidence envelope
- second report object
- raw evidence as default compare surface
- public scenario carrier / proof-only implementation vocabulary
- helper-side error precedence
- wrapper / factory family as canonical route

## Residuals That Do Not Block This Freeze

| residual | owner | why it does not block frozen shape |
| --- | --- | --- |
| `IE-02` implementation freshness | Form source substrate | implementation freshness does not require a new public API lane |
| artifact-local verification vocabulary | runtime verification | proof names remain lifecycle-controlled and do not freeze public surface |
| `sourceReceiptRef / bundlePatchRef` exact internal nouns | evidence substrate | internal evidence coordinates are not public authoring API |
| companion exact result type carrier | Form declaration / host selector | authority writeback allows a type-only carrier without changing public runtime nouns; returned-carrier proof is green, while imperative `void` callback remains runtime-valid / honest-unknown |
| root `Runtime.compare` productization task | runtime control plane | `runtime.compare` shape is frozen as control-plane stage; no extra Form-driven public concept is admitted |

## Reopen Gate

Reopen this frozen shape only if one of these becomes true:

- a new scenario is added to the scenario SSoT
- a current `CAP-* / VOB-*` loses proof coverage
- an owner authority page contradicts this frozen shape
- a proposed API deletes an existing public concept while preserving all covered capabilities
- root `Runtime.compare` productization is explicitly requested as a runtime authority task
- implementation proves an internal residual cannot be solved without a new public API lane

## 当前一句话结论

当前矩阵范围内，覆盖 `CAP-01..CAP-26` 与 `VOB-01..VOB-03` 的 API 形状已经冻结：核心 spine、Form authoring、Form runtime handle、Form data-support selector primitives、React host law 与 runtime control plane 共同构成最小完备公开面。
