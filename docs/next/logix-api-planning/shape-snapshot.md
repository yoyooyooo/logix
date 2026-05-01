---
title: Logix API Shape Snapshot
status: draft
version: 29
---

# Logix API Shape Snapshot

## 目标

阶段性展示当前 proposal portfolio 中 API 形态已经长到什么样，供人类快速阅读。

本页只做 snapshot，不冻结 exact surface，不新增 proposal，不替代 authority。
当前冻结 API 形状统一看 [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)。

## Source

- [proposal-portfolio.md](./proposal-portfolio.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [task-009-companion-metadata-carrier-implementation-scope.md](./task-009-companion-metadata-carrier-implementation-scope.md)
- [../../ssot/capability/01-planning-harness.md](../../ssot/capability/01-planning-harness.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/06-capability-scenario-api-support-map.md](../../ssot/form/06-capability-scenario-api-support-map.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)

## Reading Rules

- 按场景组织，优先服务首读心智。
- 只放关键写法，不写完整 tutorial。
- 本页只镜像当前冻结形状；exact spelling 与 owner law 继续以 `13 / 05 / runtime/01 / runtime/09 / runtime/10` 为准。

## Scenario Snapshot Matrix

| scenario | current shape summary | involved projections | confidence | open collisions |
| --- | --- | --- | --- | --- |
| `SC-A` | minimal stable form declaration, rule, submit, and host read path remain on existing authority | `PROJ-01`, `PROJ-06` | covered baseline | none |
| `SC-B` | remote source lane and submitImpact remain the source-owned remote fact ingress | `PROJ-02`, `PROJ-04`, `PROJ-06` | covered baseline | none |
| `SC-C` | field-local soft fact lane derives availability and candidates from local context plus source under the canonical selector gate | `PROJ-03`, `PROJ-06` | covered baseline | none |
| `SC-D` | same local lane is kept soft; final truth still routes to rule / submit | `PROJ-03`, `PROJ-04` | baseline projection | none |
| `SC-E` | row-heavy continuity keeps companion read/write on the same owner chain through reorder, replace, cleanup, and `byRowId` | `PROJ-03`, `PROJ-05`, `PROJ-06` | covered baseline | none |
| `SC-F` | one host gate projects error, companion, cleanup, startup report shell, and compare/perf admissibility through the same evidence boundary | `PROJ-06`, `PROJ-07` | covered baseline | none |

## Generator Snapshot

| generator | public concepts | scenarios covered | caps covered | confidence | open collisions |
| --- | --- | --- | --- | --- | --- |
| `field-local soft fact lane` | `1` | `SC-C`, `SC-D` | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` | baseline projection | none |

## SC-C: remote options plus local coordination

Status: covered baseline. Source: `PROP-001`, `PROJ-03`, `PROJ-06`, `RISK-01`, `CAP-PRESS-004`. Exact authority: linked `13 / runtime/10 / specs/155`.

```ts
$.field("warehouseId").companion({
  deps: ["countryId", "items.warehouseId"],
  lower(ctx) {
    return {
      availability: ...,
      candidates: ...,
    }
  },
})
```

This covers `CAP-10..CAP-13`. Frozen authoring noun is `companion`; internal landing path and verification artifact vocabulary remain out of scope. Sanctioned selector primitive is `Form.Companion.field(path)`. `CAP-PRESS-004` keeps list/root companion, companion final truth owner, source/options merge, generic `Fact / SoftFact` namespace, and second companion read family rejected for the current matrix.

## SC-D: final truth remains rule / submit owned

Status: baseline projection. Source: `PROP-001`, `PROJ-03`, `PROJ-04`, `PF-04`. Exact authority: linked `13 / specs/155`.

```ts
$.field("warehouseId").companion({ ... })

$.list("items", /* final uniqueness constraint */)
$.submit(/* final blocking truth */)
```

The local lane stays soft. Final truth belongs to rule / submit. `SURF-002` covers verification boundary only. Expectation evaluator is now demoted to test fixture and does not become compare truth.

## SC-E: row continuity through owner identity

Status: covered baseline. Source: `PF-05`, `PF-06`, `PF-07`, `COL-03`, `COL-04`, `CAP-PRESS-003-FU1`. Exact authority: linked `13 / runtime/10`.

```ts
const bundle = useSelector(form, Form.Companion.byRowId('items', rowId, 'warehouseId'))

form.fieldArray('items').byRowId(rowId).update(nextRow)
form.fieldArray('items').remove(index)
```

This covers `CAP-19..CAP-23` at the frozen shape level. `CAP-PRESS-003/FU1` has closed the real-runtime combined proof without admitting a public row owner primitive, list/root companion, second host read family, or public cleanup/read-exit primitive. Duplicate nested row id ambiguity exits rather than choosing an arbitrary parent owner.

## SC-F: host read gate, trial report, and compare admissibility

Status: covered baseline. Source: `PF-07`, `PF-08`, `PF-09`, `COL-05`, `COL-07`, `RISK-06`, `CAP-PRESS-005`, `CAP-PRESS-007-FU1`. Exact authority: linked `runtime/10`, `runtime/09`, `13`.

```ts
const error = useSelector(form, Form.Error.field('warehouseId'))
const companion = useSelector(form, Form.Companion.field('warehouseId'))

const report = await Logix.Runtime.trial(formProgram, {
  runId: 'run:demo',
  buildEnv: { hostKind: 'node', config: {} },
})
```

This covers `CAP-17`, `CAP-18`, `CAP-24..CAP-26`, `VOB-03`, and `VOB-02` admissibility. `Form.Error.field(path)` currently explains canonical error leaves, source pending/stale, settled source failure, and cleanup through the same selector primitive. `CAP-PRESS-007-FU1` keeps the single `useSelector` host gate unchanged and rejects second host/read helpers, Form-owned hooks, immediate schema path builders, and permanent wide `string path` as the strong-typing end state. `TASK-009` has closed `fieldValue` typed path inference through the same host gate. `Form.Companion.*` exact lower-result inference is green for returned-carrier declarations through a `+0` public concept Form-owned type-only carrier; imperative void callback remains runtime-valid / honest-unknown. Fixture adapter is now demoted to test fixture. `CAP-PRESS-005` keeps public scenario carrier, second report object, raw evidence default compare, public receipt coordinate expansion, expectation truth owner, and root compare productization rejected or blocked for the current matrix. `runtime.compare` is frozen as a control-plane stage; productization beyond the runtime authority remains out of scope for this Form-driven planning lane.

## Remaining Non-claims

- `TASK-003` productization beyond frozen `runtime.compare` control-plane stage is deferred until explicit authority-intake or productization request.
- `sourceReceiptRef / keyHashRef / bundlePatchPath / bundlePatchRef` remain internal evidence/report linking coordinates; FU5 proves the current matrix join need without making them public authoring nouns.
- `CAP-PRESS-003-FU1` has closed row owner read/write/nested/cleanup/host symmetry for the current matrix.
- `CAP-PRESS-004` has closed companion boundary pressure for the current matrix; no public fact/list-root/final-truth/source-merge/read-family concept is admitted, and no new verification artifact lifecycle item is introduced.
- `CAP-PRESS-005` has closed verification/report pressure for the current matrix; no public scenario carrier, second report object, raw evidence default compare, public receipt coordinate expansion, expectation truth owner, root compare productization, or new verification artifact lifecycle item is introduced.
- `CAP-PRESS-007-FU1` has closed single host gate pressure as implementation/type task; no public selector/path concept is admitted.
- `TASK-009` closed `fieldValue` typed path inference after the FU2 red proof; exact companion declaration metadata is green for returned-carrier declarations; public `Form.Path`, typed descriptor family, public metadata object, and second hook family are not admitted.
- verification artifact vocabulary remains unfrozen unless owner authority promotes it.

## 当前一句话结论

当前 snapshot 已经收束到 [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md) 的 frozen baseline；`SURF-001 / SURF-002` 均为 authority-linked。`CAP-PRESS-001`、`CAP-PRESS-002`、`CAP-PRESS-003/FU1`、`CAP-PRESS-004`、`CAP-PRESS-005` 与 `CAP-PRESS-007-FU1/FU2` 已关闭且未新增 public source、settlement、reason、submit、row owner、list/root companion、fact namespace、companion final truth、source/options merge、scenario carrier、second report object、raw evidence compare、second host/read noun、Form-owned hooks 或 public path builder。`TASK-009` 已关闭 `fieldValue` typed path，returned-carrier companion exact typing 已绿；`TASK-003` 仍是 deferred authority-intake。
