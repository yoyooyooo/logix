---
title: CAP-PRESS-007-FU1 Selector Type-Safety Ceiling
status: closed-implementation-task
version: 3
---

# CAP-PRESS-007-FU1 Selector Type-Safety Ceiling

## 目标

把 selector 类型安全议题从理论 ceiling 推进到 planning control-plane 的可执行切分，明确哪些项已经证明、哪些项必须作为类型实现任务继续推进、哪些项若坚持当前形态会触发 shape reopen。

本页不冻结 typed path exact spelling，不新增 public concept，不直接开始实现。

## Source

- [capability-atom-pressure-map.md](./capability-atom-pressure-map.md)
- [../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-007-FU1` |
| status | `closed-implementation-task` |
| target_scenarios | `SC-C`, `SC-E`, `SC-F`, supporting `SC-A` |
| target_atoms | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26`, supporting `CAP-21` |
| related_projection | `PROJ-06`, supporting `PROJ-03` |
| related_enablers | `IE-06`, supporting `IE-03` |
| required_proofs | `PF-07`, supporting `PF-03`, `PF-05` |
| pressure_mode | `adversarial` |
| capability_bundle | `CAP-13 + CAP-24 + CAP-25 + CAP-26`, with `CAP-21`, `CAP-10`, `CAP-19..23` overlay where companion and row owner read through selector |
| cross_pressure_axes | host selector gate, Form selector primitive, declaration metadata/type chain, row owner read route |
| current_shape_under_attack | `useSelector(handle, selector, equalityFn?)`, `fieldValue(valuePath)`, `rawFormMeta()`, `Form.Error.field(path)`, `Form.Companion.field(path)`, `Form.Companion.byRowId(listPath, rowId, fieldPath)` |
| forced_counter_shapes | typed path carrier / descriptor; declaration metadata public typed program contract; second host helper/read family; Form-owned `useField* / useCompanion*`; schema path builder/object; permanent wide `string path` |
| status_quo_burden | no new public route must still prove readable combined proof, stable agent generation, no hidden second read route/interpreter/authority, and honest classification of remaining typed path / companion inference debt |
| implementation_proof_route | not required for FU1 decision; future type-level proof may be scoped for typed path carrier and declaration metadata propagation |
| concept_admission_gate | no new public concept admitted in FU1; any typed path value object, builder, public metadata object, or helper family must pass admission before entering registry |
| decision_policy | keep single selector gate; if target static safety is theoretically unreachable under wide `string` or detached metadata, classify the gap as implementation/type task or reopen shape instead of normalizing `unknown` |
| non_claims | no second host gate, no `useField*`, no `useCompanion*`, no exact typed path spelling freeze, no root compare productization |

## Adversarial Pressure Packet

### Capability Bundle

| pressure lane | proof sample |
| --- | --- |
| host selector gate | `useSelector(handle)`, function selector, ReadQuery selector, `Form.Error` descriptor, and `Form.Companion` descriptor all pass through one host gate |
| Form selector primitive | `Form.Error.field(path)` returns the stable explain union; `Form.Companion.field/byRowId` remain opaque descriptor-first primitives |
| declaration metadata/type chain | companion result inference currently stops before `FormProgram -> handle -> selector` can expose exact bundle result types |
| row owner read route | `Form.Companion.byRowId(listPath, rowId, fieldPath)` consumes current row owner through the same host gate; ambiguous nested owner match returns no value instead of inventing a parent-row token |

### Combined Proof

The pressure combines:

- `SC-C`: `field(path).source(...) + field(path).companion(...) + Form.Companion.field(path)` local soft fact read
- `SC-E`: `fieldArray(path).* + byRowId(rowId)` structural edit and row owner continuity
- `SC-F`: `useSelector(handle, Form.Error.field(path))`, `useSelector(handle, Form.Companion.*)`, and helper adjunct taxonomy
- `SC-A`: base `useModule + useSelector` acquisition and read route

Expected break path:

- if host selector gate is too narrow, `Form.Companion.byRowId(...)` needs a second read family
- if Form descriptors carry hidden runtime-only payload, React normalization becomes a second descriptor interpreter
- if wide `string path` remains terminal, typed path legality and path-sensitive result inference cannot both close
- if companion metadata never enters the type chain, `Form.Companion.*` exact inference remains impossible without hidden type authority

## Counter-Shapes

| counter-shape | public surface delta | owner / truth placement | first-read impact | generator impact | implementation sketch | proof requirement | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| typed path carrier / descriptor | possibly add typed path argument accepted by `fieldValue`, `Form.Error.field`, `Form.Companion.field`, and `byRowId` path slots | Form declaration / program type chain owns path legality; host only consumes selector descriptor | improves invalid-path rejection if spelling stays small; risks extra noun if surfaced as builder | improves generation safety for path-sensitive reads; hurts if agents must construct verbose path objects | type-only path carrier or branded descriptor lowers to the same runtime string/read query payload | `PF-07` compile-time positive and negative tests, plus selector route proof | accepted only as next planning/type lane; no spelling frozen in FU1 |
| declaration metadata typed program chain | add or refine type channel on `FormProgram` that carries companion bundle result by field path | `field(path).companion(...)` remains authoring owner; `Form.Companion.*` remains read primitive; host remains gate | strong if invisible to user; poor if users write metadata manually | good if inferred from `Form.make`; bad if DSL metadata must be duplicated | encode `lower` return type and deps into `FormProgram` refinement consumed by handle/selector typing | `PF-07` compile-time tests for `Form.Companion.field/byRowId` result; `PF-05` row-owner continuity unchanged | accepted as implementation/type task, with single-chain constraint |
| second host helper/read family | add `useFormSelector`, `useFieldValue`, `useCompanion`, or similar | read owner splits from canonical host selector gate | locally shorter, globally fragments read law | increases import and route choices | wrapper delegates to existing descriptors and `useSelector` | full `PF-07` plus equivalence proof with canonical gate | rejected; violates selector gate first and adds second read route |
| Form-owned `useField* / useCompanion*` hooks | add hooks under Form package or Form React subpath | Form becomes host acquisition/projection owner | form-only UI looks direct, but owner split becomes unclear | agents must choose between core hooks and Form hooks | Form hook unwraps handle/path/selector/equality and delegates | new authority page plus wrapper equivalence proof | rejected; Form exact surface does not own React hook family |
| schema path builder/object | add `Form.path(...)`, `Form.Path`, `SchemaPathMapping`, or path object DSL | path object can become second declaration carrier if it owns schema traversal | may help complex paths, but adds concept load | more tokens and lifecycle rules; may help invalid path rejection | build path object from schema/program type and lower to descriptor | concept-count proof, declaration-carrier proof, `PF-07` compile tests | rejected for FU1 public surface; can return only after concept admission |
| permanent wide `string path` | no public delta | runtime keeps string lookup; type truth cannot see path | shortest authoring | easy to generate but invalid paths pass typecheck | keep current helpers and rely on `unknown` or manual generic | must prove exact inference without typed carrier | rejected as terminal stance; allowed only as current runtime shape with explicit type debt |

## Status Quo Burden

| burden | result |
| --- | --- |
| readable combined proof | satisfied for current runtime route: `useSelector(handle, Form.Error.field(path))` and `useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))` stay readable |
| stable agent generation | satisfied for route choice: one host gate plus Form data-support namespaces keep generation branches small; arbitrary object selectors are already rejected by type tests |
| no hidden second truth/read route | satisfied for current runtime behavior: descriptor normalization stays an internal adapter behind `useSelector` |
| row owner honesty | satisfied for current matrix: ambiguous nested owner resolution exits as non-hit and does not mint public parent-row token |
| full type ceiling | satisfied for `fieldValue` literal paths within the current type recursion budget; widened `string` remains honest `unknown` |
| companion exact inference | satisfied for returned-carrier declarations; imperative `void` callback authoring remains runtime-valid / honest-unknown |
| proof coverage | partial by design: current tests cover sealed selector input, `rawFormMeta`, `Form.Error.field`, typed `fieldValue`, returned-carrier companion bundle inference, and row companion exact type; `void` callback auto-collection is not claimed |

Conclusion after `TASK-009`: public host shape keeps its current route and FU1 stays closed. The type-chain work has closed for `fieldValue` and returned-carrier companion exact typing; only imperative `void` callback auto-collection remains outside the accepted guarantee.

## Implementation Proof Boundary

No FU1 implementation proof is required. Current docs and type tests already decide these facts:

- wide `string path` is a theoretical blocker for exact path inference
- `Form.Companion.*` currently returns `unknown`
- sealed selector family and `Form.Error.field(path)` explain union are already implemented
- no evidence requires a second host gate or Form-owned React hook family

Future proof route:

| field | value |
| --- | --- |
| proof_name | `selector-typed-path-and-companion-metadata-type-proof` |
| status | `not-started` |
| scope | type-level compile contract only; no public runtime noun, no new host route |
| target | prove whether typed path carrier and declaration metadata can close `fieldValue` and `Form.Companion.*` inference through one chain |
| lifecycle | artifact-local until authority admits a public concept or implementation task consumes it |

## Concept Admission Gate

No new public concept enters [surface-candidate-registry.md](./surface-candidate-registry.md) from FU1.

Admission remains required if any follow-up proposes:

- public `Form.Path`, schema path builder, or path object value
- public typed descriptor noun beyond current selector primitives
- public metadata object on `FormProgram`
- `useField*`, `useCompanion*`, `useFormSelector`, or any second host helper/read family

The type-only strengthening route can proceed as implementation/type planning only while it does not create a new runtime public noun or second authority page.

## Implementability Split

### 1. 已实现且可直接实施

- `useSelector(handle)`
- `useSelector(handle, (state) => value)`
- `rawFormMeta()` 的精确返回
- `Form.Error.field(path)` 的最小 explain 语义

这些项已经有代码支撑。后续实施集中在类型口径收口与 compile-time contract proof，不需要先重开 API 形态。

Current landed subset:

- `useSelector` 第二参数已收紧为 sealed family
- `Form.Error.field(path)` 已拥有稳定 explain union 返回

### 2. 理论可达且当前已按教学路径实现

- `fieldValue` 的 typed path 化
- `Form.Companion.field/byRowId` 的 returned-carrier declaration-driven inference

这些项已经通过 `TASK-009` 沿单一解释链闭合。当前不声明 `void` callback 自动收集 exact companion metadata；如果未来把它作为目标，需要重开 exact authoring-shape review。

### 3. 理论不可达且需重开 API 或拒绝当前终局 stance

- 继续保留宽对象第二参数，同时要求编译期拒绝非法 selector
- 继续保留宽 `string path`，同时要求 path legality 与 path-sensitive exact inference
- 继续让 companion metadata 断在 authoring 侧，同时要求 `Form.Companion.*` 精确结果推导

以上三类不能靠补注解解决。若产品目标坚持这些能力，就必须重开 shape。

## Follow-up Ordering

| order | item | route |
| --- | --- | --- |
| `1` | 决定 `fieldValue` 的 typed path carrier | `CAP-PRESS-007-FU2` / `TASK-009` |
| `2` | 决定 `Form.Companion.*` 的 declaration metadata 入型链 | `CAP-PRESS-007-FU2` / `TASK-009` |
| `3` | 为 typed path / companion inference 补 compile contract proof | `PF-07` type-level extension |

## Decision

`CAP-PRESS-007-FU1` closes as `implementation-task`.

Accepted:

- frozen public host route stays unchanged
- no second host gate, no Form-owned hook family, no second descriptor interpreter, no second authority page
- sealed selector family, `rawFormMeta()` stable return, and `Form.Error.field(path)` explain union remain implemented / proven
- `fieldValue(valuePath)` is implemented / proven for typed handle entry through the single selector gate
- `Form.Companion.field(path)` and `Form.Companion.byRowId(...)` returned-carrier exact lower-result inference is implemented / proven after authority writeback
- imperative `void` callback authoring remains runtime-valid / honest-unknown
- `TASK-009` / `CAP-PRESS-007-FU2` closed `fieldValue` typed path and returned-carrier companion metadata carrier inference

Rejected:

- treating wide `string path` as a terminal strong-typing solution
- adding `useField*`, `useCompanion*`, `useFormSelector`, or second host helper family
- immediately reviving public `Form.Path`, schema path builder, or path object DSL
- moving companion result inference into React host normalization
- registering a new surface candidate before concept admission

## Reopen Bar

只有出现下面任一情况，才需要从 `CAP-PRESS-007-FU1` 升级为新 collision 或 authority writeback：

- single selector gate 无法承接 sealed object family
- typed path 需要改动 canonical read route owner
- companion inference 需要第二 descriptor interpreter 或第二 authority 页面
- path safety 与 exact inference 无法在当前 shape 内共存
- type-only path and declaration metadata cannot close the target without a new public path noun
- future product goals require exact companion inference for imperative `void` callbacks without returned carriers

## Next Action

- `AUTH-REVIEW-companion-metadata-carrier` and `TASK-009` have both been consumed by the accepted partial close
- next cursor is optional returned-carrier docs/examples teaching follow-up or explicit exact authoring-shape reopen
- `TASK-003` remains deferred and is not touched by this pressure packet

## Writeback

| target | update |
| --- | --- |
| [capability-atom-pressure-map.md](./capability-atom-pressure-map.md) | mark FU1 closed and keep CAP-PRESS-007 closed with `TASK-009` partial close |
| [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md) | keep `useSelector`, `rawFormMeta`, `Form.Error.field`, and `fieldValue` as implemented; keep `Form.Companion.*` partial because returned-carrier exact typing is green and `void` callback is honest-unknown |
| [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md) | keep `TASK-009` done-partial-accepted and route remaining work to optional docs/examples teaching follow-up |
| [surface-candidate-registry.md](./surface-candidate-registry.md) | no new row; only proof index notes that no public selector/path concept is admitted |
| [shape-snapshot.md](./shape-snapshot.md) | note frozen public host shape unchanged, returned-carrier exact typing green, and `void` callback honest-unknown |
| [run-state.md](./run-state.md) | stay paused with optional returned-carrier teaching follow-up and keep `TASK-003` deferred |

## 当前一句话结论

`CAP-PRESS-007-FU1` 已关闭为 `implementation-task`：single `useSelector` host gate 不重开，第二 host/read family 与 Form-owned hooks 被拒绝；`fieldValue` typed path 与 returned-carrier `Form.Companion.*` declaration-driven exact inference 已由 `TASK-009` 闭合，imperative `void` callback 继续 runtime-valid / honest-unknown。
