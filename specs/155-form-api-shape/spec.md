# Feature Specification: Form API Shape Final Single-Track Cutover

**Feature Branch**: `155-form-api-shape`
**Created**: 2026-04-22
**Status**: Accepted / Consumed
**Finalized**: 2026-05-11
**Authority**: `docs/ssot/form/13-exact-surface-contract.md`

## Current Role

This spec is no longer a candidate exploration artifact. It is the historical owner of the Form API shape investigation and is now consumed by the final exact surface authority:

- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/form/05-public-api-families.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/internal/form-api-tutorial.md`
- `docs/internal/form-api-quicklook.md`

Historical candidates such as `AC3.3` remain trace material only. They must not be used as shadow authority when they diverge from the final exact surface.

## Final Accepted Shape

The accepted Form API is single-track:

```text
Form.make(id, config, define)
  -> FormProgram
  -> Runtime / Program law
  -> FormHandle
  -> useModule + useSelector
```

`@logixjs/form` root value exports:

```ts
Form.make
Form.Rule
Form.Error
Form.Companion
```

No other Form root/domain route is admitted.

## Final Owner Lanes

| Lane | Owner | Exact public spelling | Rejected alternatives |
| --- | --- | --- | --- |
| declaration | Form | `Form.make(id, config, define)` | `Form.from`, wrapper factory, raw field fragment route |
| remote fact | source lane + Query resource owner | `field(path).source(...)` | `Form.Source`, `form.source`, `useFieldSource`, rule fetch, React-side sync |
| local soft fact | companion lane | `field(path).companion(...)` | async companion, final-truth companion, generic `Fact/SoftFact`, list/root companion |
| final truth | rule/root/list/submit lane | `field.rule`, `root`, `list`, `submit` | source verdict truth, companion errors, second issue tree |
| row identity | Form row owner + handle primitive | `fieldArray(...).byRowId`, `Form.Companion.byRowId` | public row token, index truth, React key truth |
| host read | core React host law | `useModule + useSelector` | `@logixjs/form/react`, package-local `useForm*`, `useCompanion`, `useFormSelector` |
| verification | runtime control plane | `Runtime.check/trial/compare` | Form scenario API, second report object, raw evidence default compare |
| DX | toolkit secondary layer | mechanically reducible helpers only | toolkit truth owner, hidden host route, compatibility shim |

## Final Capability/Scenario Coverage

The final surface is accepted because the `SC-A..SC-F` matrix is covered by the lanes above:

| Scenario | Composition |
| --- | --- |
| `SC-A` minimal stable form | `Form.make -> field.rule -> submit -> useModule/useSelector` |
| `SC-B` remote dependency field | `field.source + submitImpact + selector read` |
| `SC-C` remote options + local coordination | `field.source + field.companion` |
| `SC-D` cross-row mutual exclusion + final constraint | `field.companion + row/list rule + submit` |
| `SC-E` row-heavy write/read | `list identity + fieldArray.byRowId + cleanup + selector read` |
| `SC-F` React acquisition / diagnostics / trial feed | `useModule + useSelector + Form.Error/Form.Companion descriptors + runtime report feed` |

The authoritative scenario matrix remains `docs/ssot/form/06-capability-scenario-api-support-map.md`.

## Final Negative Space

The following shapes are rejected as Form core or current source routes:

```ts
@logixjs/form/react
useForm
useField
useFieldArray
useCompanion
useFieldSource
useFormSelector
Form.Path
Form.SchemaPathMapping
Form.SchemaErrorMapping
Form.Source
Form.Row
Form.Fact
Form.SoftFact
FormProgram.metadata
field(path).options(...)
source.refresh(...)
ScenarioReport as Form API
```

If a future proposal wants one of these names, it must prove a primitive gap against `docs/ssot/form/13-exact-surface-contract.md`; taste, ecosystem mimicry, or fewer lines of wrapper code are insufficient.

## Final Source Cleanup Requirement

The final single-track cutover removes live old-route source where it creates retrievable teaching or compatibility pressure:

- delete public helper files `packages/logix-form/src/Path.ts`, `packages/logix-form/src/SchemaPathMapping.ts`, and `packages/logix-form/src/SchemaErrorMapping.ts`;
- move any needed path/schema lowering behind `packages/logix-form/src/internal/**`;
- delete `examples/logix-form-poc/**` because it teaches package-local `FormReact.useForm/useField/useFieldArray`;
- keep active examples in `examples/logix-react/src/demos/form/**` on `Form.make + useModule + useSelector` only.

## Final Toolkit Position

Human-readable UI binding belongs in toolkit, not Form core. A toolkit helper is admissible only if it mechanically reduces to the final primitives and does not own truth:

```ts
FormKit.input(form, "name")
FormKit.selectByRowId(form, { list: "items", rowId, field: "warehouseId" })
```

Toolkit helpers must not create a second host family, second source route, second error precedence policy, or hidden runtime metadata truth.

## Closure

`155` is closed. Do not reopen this spec for naming taste, old candidate reconciliation, or compatibility preservation. Future changes must start from `docs/ssot/form/13-exact-surface-contract.md` and prove that the final primitive surface cannot cover a capability or scenario in `docs/ssot/form/06-capability-scenario-api-support-map.md`.
