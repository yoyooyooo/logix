---
title: Form Public API Families
status: accepted
version: 10
last-updated: 2026-05-11
---

# Form Public API Families

## Authority

本页只冻结 Form route-level boundary。exact names/signatures 统一看 [13-exact-surface-contract.md](./13-exact-surface-contract.md)。旧 proposal、旧 spec、旧 demo 若与本页冲突，以本页和 `13` 为准。

## Final route map

Form 当前只拥有两条 domain route。

| Route | Acquisition | Owner | What it owns | What it must not own |
| --- | --- | --- | --- | --- |
| Domain authoring | `import * as Form from "@logixjs/form"` + `Form.make(id, config, define)` | Form | input-state DSL; `field.rule`; `field.source`; `field.companion`; `root`; `list`; `submit`; `Form.Rule`; `Form.Error`; `Form.Companion` data-support namespaces | React hooks; pure projection family; package-local source/fact/path/row namespace; raw field fragments as user route |
| Domain runtime handle | `FormProgram` materialized by Runtime/host | Form | `validate`; `validatePaths`; `submit`; `reset`; `setError`; `clearErrors`; `field(...).set/blur`; `fieldArray(...).*`; `byRowId(...).*` | read subscription; pure selector execution; second runtime; second command bridge |

Everything else routes through core or runtime control plane:

| Route | Acquisition | Owner | Form role |
| --- | --- | --- | --- |
| Composition/runtime | `Program.make` / `Runtime.make` / `Runtime.run` | core runtime | `FormProgram` participates as a core `Program` refinement |
| React host read | `useModule` + `useSelector` from `@logixjs/react` | core React host law | `Form.Error.field` and `Form.Companion.*` only provide descriptor data-support |
| Verification | `Runtime.check` / `Runtime.trial` / `Runtime.compare` | runtime control plane | Form contributes artifacts/evidence; it does not own scenario/report surface |
| UI binding sugar | `@logixjs/toolkit/form` or equivalent toolkit layer | toolkit | thin mechanical wrappers only; no truth, no owner law |

## Owner split

The final single-track owner split is:

```text
Form.make                      -> declaration act
field(path).source(...)        -> remote fact ingress; Query-owned resource consumed by Form
field(path).companion(...)     -> synchronous local soft fact
rule / root / list / submit    -> final truth, errors, blocking, settlement
FormHandle                     -> effectful mutation and submit commands
useModule + useSelector        -> host acquisition and pure projection
Runtime.check/trial/compare    -> verification control plane
```

No route is allowed to absorb another route's authority.

## Data-support namespaces

`Form.Error` and `Form.Companion` are not third routes. They are root-visible data-support namespaces.

`Form.Error` may expose:

- canonical error leaf constructors;
- `Form.Error.field(path)` selector descriptor factory;
- pure data normalizers that do not execute host reads.

`Form.Companion` may expose:

- `Form.Companion.field(path)` descriptor factory;
- `Form.Companion.byRowId(listPath, rowId, fieldPath)` descriptor factory.

They must not expose package-local hooks, projection helpers, raw internal landing paths, precedence knobs, source refresh helpers, or final-truth APIs.

## Negative space

The following are rejected as Form core routes:

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
source.refresh
field(path).options(...)
list().companion(...)
root().companion(...)
ScenarioReport as Form API
```

If any of these names exist in source, examples, generated docs, tests, package exports, or teaching material, they are cutover debt. They are not compatibility promises.

## Toolkit rule

Toolkit may improve human readability only when every helper mechanically reduces to this page's routes and exact primitives. A toolkit helper cannot:

- create a new truth source;
- create a Form-owned host route;
- change source/companion/rule/submit ownership;
- change error precedence;
- claim verification/report truth;
- hide owner law behind a black-box wrapper.

## One-line conclusion

Form owns authoring and domain handle only. Core owns composition, runtime, React host reads, and verification. Toolkit owns optional DX wrappers that mechanically reduce to the frozen Form/core primitives.

## Toolkit boundary for final cutover

Toolkit helpers may exist only as secondary, mechanically reducible wrappers. They must expand to `Form.make`, `field.source`, `field.companion`, `rule/root/list/submit`, `FormHandle`, and core `useSelector` without hidden state, hidden source scheduling, hidden host reads, hidden final truth, or compatibility aliases.
