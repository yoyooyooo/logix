---
title: API Implementation Gap Ledger
status: active
version: 21
---

# API Implementation Gap Ledger

## 目标

把当前已冻结 API 形状对应的实施状态收成单一总账，避免“authority 已冻结”与“实现是否跟上”分散在 SSoT、pressure packet、task queue、review ledger 之间。

本页只承接 implementation gap ledger，不承担 authority，不冻结 exact surface。exact shape 继续以 [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md) 与 owner authority 为准。

## Source

- [run-state.md](./run-state.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [capability-atom-pressure-map.md](./capability-atom-pressure-map.md)
- [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md)
- [cap-press-004-companion-soft-fact-boundary-pressure-packet.md](./cap-press-004-companion-soft-fact-boundary-pressure-packet.md)
- [cap-press-005-verification-scenario-report-pressure-packet.md](./cap-press-005-verification-scenario-report-pressure-packet.md)
- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [task-009-companion-metadata-carrier-implementation-scope.md](./task-009-companion-metadata-carrier-implementation-scope.md)
- [gap-sweep-001-frozen-shape-implementation-inventory.md](./gap-sweep-001-frozen-shape-implementation-inventory.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md)

## Status Vocabulary

| field | allowed values | meaning |
| --- | --- | --- |
| `authority_status` | `frozen`, `authority-linked`, `deferred-authority` | exact/public contract 当前状态 |
| `runtime_status` | `implemented`, `partial`, `missing`, `deferred` | 运行时实现状态 |
| `type_status` | `implemented`, `partial`, `planning-open`, `theoretical-blocker`, `not-applicable` | 类型实现与 ceiling 状态 |
| `proof_status` | `proven`, `partial`, `planned`, `missing` | 当前 proof 闭合状态 |
| `gap_kind` | `none`, `implementation`, `planning`, `authority`, `theoretical-shape` | 当前主要缺口类型 |

## Reading Rules

- 每个已冻结公开点都必须至少有一行。
- `authority_status=frozen` 不等于 `runtime_status=implemented`。
- `type_status=planning-open` 表示理论可达但尚未实现。
- `type_status=theoretical-blocker` 表示若坚持当前形态，静态安全目标理论不可达，必须重开 API。
- 行上的 `next_route` 只指向下一步最小承接点，不同时列多条并行主路。

## Frozen Public Shape Gap Ledger

| api item | authority_status | runtime_status | type_status | proof_status | gap_kind | current gap | next_route |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Module.logic(...)` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `none` | `watch-only` |
| `Program.make(Module, config)` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `none` | `watch-only` |
| `Runtime.make(Program)` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `none` | `watch-only` |
| `Runtime.check(Program, options?)` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `static facade returns VerificationControlPlaneReport with stage="check" / mode="static" and does not boot the program` | `watch-only` |
| `Runtime.trial(Program, options)` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `none` | `watch-only` |
| `runtime.compare` control-plane stage | `frozen` | `partial` | `not-applicable` | `proven` | `authority` | frozen as stage only; CAP-PRESS-005 keeps root productization blocked; exact root productization remains deferred | `TASK-003 authority-intake` |
| `Form.make(..., ($) => { ... })` declaration act | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `none` | `watch-only` |
| `field(path).rule(...)` / `root(...)` / `list(...)` / `submit(...)` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | TASK-008 closed submit attempt generation guard, stale rule drop, warning non-blocking law, list.item return normalization, root/list stale settlement identity, fail channel, and CAP-15 multi-error causal backlink without public API change | `watch-only` |
| `field(path).source({ resource, deps, key, triggers?, debounceMs?, concurrency?, submitImpact? })` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | FU3 scheduled freshness proof, FU4 source failure lifecycle proof, FU5 receipt artifact/feed/report join proof, FU6 row receipt disambiguation proof, and TASK-007 key canonicalization / same-key generation proof closed; no new public source API admitted | `watch-only` |
| `field(path).companion({ deps, lower })` | `frozen` | `implemented` | `implemented` | `proven` | `none` | CAP-PRESS-004 closed companion boundary pressure across source/final-truth/row/host overlays; no list/root companion, companion final truth owner, source/options merge, generic Fact namespace, or second read family admitted | `watch-only` |
| `form.validate / validatePaths / submit / reset / setError / clearErrors` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `none` | `watch-only` |
| `form.field(path).set / blur` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `none` | `watch-only` |
| `form.fieldArray(path).* / byRowId(rowId).*` | `frozen` | `implemented` | `not-applicable` | `proven` | `none` | `CAP-PRESS-003-FU1` closed real-runtime read/write/nested/cleanup/host proof sample; no public row owner API needed | `watch-only` |
| `useModule / useImportedModule / useDispatch / useSelector` single host gate | `frozen` | `implemented` | `implemented` | `proven` | `none` | second-arg sealing landed; no second host gate admitted | `watch-only` |
| `fieldValue(valuePath)` | `frozen` | `implemented` | `implemented` | `proven` | `none` | typed path inference now closes for literal paths; invalid literal paths reject; widened string degrades to `unknown`; no public `Form.Path` admitted | `watch-only` |
| `rawFormMeta()` | `frozen` | `implemented` | `implemented` | `proven` | `none` | stable helper and stable result type already landed | `watch-only` |
| `Form.Error.field(path)` | `frozen` | `implemented` | `implemented` | `proven` | `none` | path-sensitive source pending explanation and CAP-15 multi-error causal backlink proof landed | `watch-only` |
| `Form.Companion.field(path)` | `frozen` | `implemented` | `partial` | `proven` | `none` | returned-carrier path proves exact lower-result inference; imperative `void` callback remains runtime-valid with honest `unknown` selector result | `docs/examples teaching follow-up or watch-only` |
| `Form.Companion.byRowId(listPath, rowId, fieldPath)` | `frozen` | `implemented` | `partial` | `proven` | `none` | returned-carrier path proves row companion exact inference through the same metadata carrier; imperative `void` callback remains runtime-valid with honest `unknown` selector result | `docs/examples teaching follow-up or watch-only` |
| `runtime.trial(mode=\"scenario\")` boundary | `authority-linked` | `implemented` | `not-applicable` | `proven` | `none` | CAP-PRESS-005 closed scenario/report pressure without public scenario carrier, second report object, raw evidence default compare, receipt coordinate expansion, expectation truth owner, or root compare productization | `watch-only` |

## Priority View

| priority | item | why |
| --- | --- | --- |
| `P1` | `Form.Companion.field/byRowId` | returned-carrier path is green; exact surface accepts void callback as runtime-only / honest-unknown |
| `P1` | `form.fieldArray(path).* / byRowId(rowId).*` + `Form.Companion.byRowId(...)` | combined real-runtime row owner proof closed; remaining selector pressure is type ceiling only |
| `P2` | `runtime.compare` root productization | deferred authority only; does not block current frozen shape |

## Maintenance Rules

- 任何 new frozen point、authority writeback、implementation-ready conversion、task close、pressure follow-up close，都必须同步检查本页。
- 若一行的 `authority_status`、`runtime_status`、`type_status`、`proof_status` 中任一变化，必须更新本页。
- 若某个 gap 只是迁移了 owner route，也必须更新 `next_route`。
- 本页不接受“实现暂时如此”这种无分类备注；必须落到上面的状态词表。

## 当前一句话结论

当前 frozen shape 的 row owner combined proof 已由 `CAP-PRESS-003-FU1` 关闭，companion soft fact boundary 已由 `CAP-PRESS-004` 关闭，verification/report pressure 已由 `CAP-PRESS-005` 关闭。`CAP-PRESS-007-FU1` 已关闭 single host gate 压力；`TASK-009` 已关闭 `fieldValue` typed path implementation gap。`AUTH-REVIEW-companion-metadata-carrier` 已落 authority writeback，`Form.Companion.field/byRowId` exact lower-result inference 已在 returned-carrier path 绿灯；imperative void callback 保持 runtime-valid / honest-unknown。`TASK-010` 已补齐 `Runtime.check` public facade，并用 root allowlist、selector negative-space、row owner retained harness、verification boundary guards 加固 frozen baseline；`runtime.compare` productization 仍保持 deferred；source lane 与 final truth / settlement / reason lane 在 current matrix proof 范围内已转为 `watch-only`。
