---
title: Post-CONV Implementation Task Queue
status: active
version: 30
---

# Post-CONV Implementation Task Queue

## 目标

承接 `CONV-001 / IMP-001..IMP-006` proof refresh 后留下的真实实现任务，避免 residual 在 proposal、packet、proof 和 authority 文档之间漂移。

本页只做 post-conversion task queue，不承担 authority，不冻结 exact surface。任何公开 surface 变化必须回到 owner authority 与 surface candidate registry。

## Source

- [run-state.md](./run-state.md)
- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [proposal-portfolio.md](./proposal-portfolio.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [task-009-companion-metadata-carrier-implementation-scope.md](./task-009-companion-metadata-carrier-implementation-scope.md)
- [gap-sweep-001-frozen-shape-implementation-inventory.md](./gap-sweep-001-frozen-shape-implementation-inventory.md)
- [../../superpowers/plans/2026-04-25-frozen-api-baseline-hardening.md](../../superpowers/plans/2026-04-25-frozen-api-baseline-hardening.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)

## Queue Rules

- 只收 `CONV-001` 之后仍需要实际实现、清理、泛化或 authority intake 的任务。
- 每个任务必须回链来源 packet、capability / VOB、proof gate、non-claims 与 reopen bar。
- `ready-to-scope` 只表示下一轮可起草实施 scope，不表示已经允许直接改 public API。
- verification artifact vocabulary 的推广、替换、降级、删除必须先过 lifecycle decision。
- root `Runtime.compare` 产品化需要单独 authority intake，不能从 `PF-09` 自动推出。
- `TASK-003` 不阻塞当前 frozen API shape；当前 `runtime.compare` 只按 control-plane stage 冻结。

## Task State Vocabulary

| status | meaning |
| --- | --- |
| `ready-to-scope` | 下一轮可起草实施 scope |
| `ready-to-proof` | 需要最小实现 proof 验证 |
| `ready-to-implement` | authority 与实施 scope 已落地，下一步可进入代码实现 |
| `plan-ready` | 最终 implementation plan 已落地，下一步可按 plan 执行 |
| `planned-fixture-local` | planning 已要求 fixture-local proof，但尚未起草具体实施 scope |
| `authority-intake` | 需要先回到 authority owner 决定 surface 或 exact boundary |
| `deferred` | 当前不进入下一轮 |
| `done` | 已被实施、删除、降级或 authority 消费 |

## Task Queue

| task id | status | owner lane | source packets | target | proof gates | next action |
| --- | --- | --- | --- | --- | --- | --- |
| `TASK-001` | `done` | source / evidence | `IMP-006` | decide the smallest implementation step for `IE-02` source receipt identity and source substrate completion | `PF-02`, `PF-08` | closed by [task-001-source-receipt-freshness-scope.md](./task-001-source-receipt-freshness-scope.md) |
| `TASK-002` | `done` | verification lifecycle | `IMP-003`, `IMP-004` | classify scenario carrier / fixture / expectation artifacts into retain, demote, rename, delete, or promote request | `PF-08` | closed by [task-002-verification-artifact-lifecycle-cleanup-scope.md](./task-002-verification-artifact-lifecycle-cleanup-scope.md) |
| `TASK-003` | `deferred` | compare / perf | `IMP-005` | decide future productization route beyond frozen `runtime.compare` control-plane stage | `PF-09` | open authority intake only when productization is explicitly requested |
| `TASK-004` | `done` | control-plane hygiene | `CONV-001` | compress consumed planning artifacts and ensure run-state stays below active cursor budget | docs checks | closed by [task-004-control-plane-hygiene-scope.md](./task-004-control-plane-hygiene-scope.md) |
| `TASK-005` | `done` | source / scheduling | `RISK-02` | honor public `field(path).source({ debounceMs, concurrency })` scheduling knobs without new surface | `PF-02` | closed by [task-005-source-scheduling-proof-scope.md](./task-005-source-scheduling-proof-scope.md) |
| `TASK-006` | `done` | verification lifecycle | `TASK-002`, `RISK-06` | demote fixture-local verification helpers from production internal source into test fixture/support while preserving proof gates | `PF-08`, `PF-09` | closed by [task-006-verification-fixture-demotion-scope.md](./task-006-verification-fixture-demotion-scope.md) |
| `TASK-007` | `done` | source / identity | `CAP-PRESS-001-FU2`, `CAP-PRESS-001-FU3`, `CAP-PRESS-001-FU4`, `CAP-PRESS-001-FU5`, `CAP-PRESS-001-FU6` | implement deterministic source key canonicalization rejection / diagnostics and generation-safe same-key writeback; preserve FU3 submit-time freshness flush, FU4 source failure lifecycle/read boundary, FU5 receipt artifact/report linking boundary, and FU6 row receipt disambiguation boundary | `PF-02`, `PF-08` | closed by [task-007-source-key-generation-proof-scope.md](./task-007-source-key-generation-proof-scope.md) |
| `TASK-008` | `done` | final truth / settlement / reason | `CAP-PRESS-002` | prove and implement internal submit generation, effectful rule stale/drop law, path-sensitive source pending explanation, warning blocking law, CAP-15 causal backlink, and list.item rule return normalization without new public settlement / reason / submit noun | `PF-04`, `PF-08` | closed by [task-008-final-truth-settlement-reason-proof-scope.md](./task-008-final-truth-settlement-reason-proof-scope.md) |
| `CAP-PRESS-003-FU1` | `done` | row owner / host selector | `CAP-PRESS-003` | real-runtime combined row owner proof across byRowId write, `Form.Companion.byRowId` read, nested outer remap, cleanup exit, duplicate nested row id ambiguity, and host selector gate without new public API | `PF-05`, `PF-06`, `PF-07`; `PF-08` not claimed | closed by [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md) |
| `TASK-009` | `done-partial-accepted` | host selector / type chain | `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2`, `AUTH-REVIEW-companion-metadata-carrier` | exact `Form.Companion.field/byRowId` inference is green for returned-carrier declarations; imperative callback remains runtime-valid / honest-unknown | `PF-07`, supporting `PF-03`, `PF-05` | optional docs/examples teaching follow-up |
| `TASK-010` | `done` | verification static control plane / frozen-shape hardening | `GAP-SWEEP-001` | implement `Runtime.check` public facade and harden frozen baseline drift guards without productizing `runtime.compare` | control-plane contract tests, root export allowlist, selector negative-space tests, row owner retained harness, docs smoke | closed by [2026-04-25-frozen-api-baseline-hardening.md](../../superpowers/plans/2026-04-25-frozen-api-baseline-hardening.md) |

## Completed Task Index

| task | outcome owner | compressed result |
| --- | --- | --- |
| `TASK-001` | [task-001-source-receipt-freshness-scope.md](./task-001-source-receipt-freshness-scope.md) | narrow source receipt proof added; `IE-02` remains `partial`; no public API change |
| `TASK-002` | [task-002-verification-artifact-lifecycle-cleanup-scope.md](./task-002-verification-artifact-lifecycle-cleanup-scope.md) | verification artifact lifecycle markers added; final verification artifact vocabulary remains unfrozen |
| `TASK-004` | [task-004-control-plane-hygiene-scope.md](./task-004-control-plane-hygiene-scope.md) | queue paused; completed tasks and consumed `CONV-001` compressed |
| `TASK-005` | [task-005-source-scheduling-proof-scope.md](./task-005-source-scheduling-proof-scope.md) | per-source onKeyChange debounce implemented; switch/debounce proof added; no public API change |
| `TASK-006` | [task-006-verification-fixture-demotion-scope.md](./task-006-verification-fixture-demotion-scope.md) | fixture-local verification helpers demoted from production internals to test fixtures; `PF-08 / PF-09` preserved |
| `TASK-007` | [task-007-source-key-generation-proof-scope.md](./task-007-source-key-generation-proof-scope.md) | strict source key canonicalization and generation-safe same-key writeback implemented; no public source API change |
| `TASK-008` | [task-008-final-truth-settlement-reason-proof-scope.md](./task-008-final-truth-settlement-reason-proof-scope.md) | submit/rule settlement generation, warning law, path-sensitive pending, list.item normalization, CAP-15 multi-error link, and fail channel closed without public settlement / reason / submit noun |
| `CAP-PRESS-003-FU1` | [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md) | row owner read/write/nested/cleanup/host symmetry closed with retained harness and generalized internal resolver; no public row owner/list companion/second host route |
| `TASK-010` | [2026-04-25-frozen-api-baseline-hardening.md](../../superpowers/plans/2026-04-25-frozen-api-baseline-hardening.md) | `Runtime.check` implemented as static control-plane facade; root export allowlists, selector negative-space, row owner retained harness, and verification boundary guards harden frozen baseline; no `Runtime.compare` productization |

## TASK-009 Scope Seed

| field | value |
| --- | --- |
| target_caps | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26`, supporting `CAP-21` |
| source_packet | `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2` |
| current_status | done-partial-accepted for companion metadata carrier |
| implementation_question | can typed path/result inference and companion declaration metadata inference close through `field(path).companion(...) -> FormProgram -> handle -> Form.Companion.* -> useSelector` without public route expansion |
| public_surface_budget | no second host gate, no Form-owned React hook family, no public `Form.Path` / schema path builder unless concept admission passes, no second descriptor interpreter, no second authority page |
| proof_scope | `PF-07` compile-time contract tests for invalid path rejection, `fieldValue` result inference, `Form.Companion.field` bundle inference, and `Form.Companion.byRowId` row companion inference; preserve `PF-03` companion authoring and `PF-05` row owner proof |
| proof_policy | red type-level proof exists; internal/test-backed/fixture-local until consumed by implementation or admitted by authority |
| proof_id | `PROOF-CAP-PRESS-007-FU2-type-only-path-metadata-chain` |
| result | `fieldValue` typed path inference is implemented and proven by `pnpm --filter @logixjs/react typecheck`; companion exact lower-result inference is green when the type-only carrier is returned from `define`; imperative void callback remains runtime-valid / honest-unknown |
| implementation_scope | [task-009-type-only-path-metadata-chain-scope.md](./task-009-type-only-path-metadata-chain-scope.md) |
| companion_scope | [task-009-companion-metadata-carrier-implementation-scope.md](./task-009-companion-metadata-carrier-implementation-scope.md) |
| authority_writeback_trigger | satisfied by [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md); next scope must keep runtime public nouns unchanged |
| non_claims | no root compare productization, no `TASK-003`, no public typed path spelling freeze in FU1, no claim that current wide `string path` satisfies exact inference |

## TASK-010 Scope Seed

| field | value |
| --- | --- |
| target_caps | verification lane plus `CAP-13`, `CAP-21`, `CAP-24`, `CAP-25`, `CAP-26` drift guards |
| source_packet | `GAP-SWEEP-001` |
| current_status | done |
| implementation_question | close the missing `Runtime.check` public facade and harden frozen baseline against root export, selector, row owner, scenario vocabulary, and docs drift |
| public_surface_budget | `Runtime.check` only; no `Runtime.compare` productization, no public scenario carrier, no public `Form.Path`, no Form-owned hook family, no public row owner token, no void callback exact-inference reopen |
| proof_scope | static control-plane contract test, root allowlist tests, selector negative-space tests, retained row owner proof, docs keyword smoke |
| implementation_plan | [2026-04-25-frozen-api-baseline-hardening.md](../../superpowers/plans/2026-04-25-frozen-api-baseline-hardening.md) |
| authority_writeback_trigger | only if implementing `Runtime.check` requires changing `03-frozen-api-shape`, `runtime/09`, or exact root exports beyond already frozen control-plane stage |
| non_claims | no `TASK-003`, no compare correctness truth, no scenario authoring API, no companion void callback auto-collection |
| result | `Runtime.check` returns `VerificationControlPlaneReport` with `stage="check"` / `mode="static"` without booting the program; public roots and selector helper boundaries are guarded by allowlist and negative-space tests |

## CAP-PRESS-003-FU1 Scope Seed

| field | value |
| --- | --- |
| target_caps | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, overlay `CAP-13`, `CAP-25` |
| source_packet | `CAP-PRESS-003` |
| current_status | done |
| implementation_question | can the frozen row owner route prove read/write/nested/cleanup/host symmetry in one real Form runtime proof |
| public_surface_budget | no public row owner primitive, no list/root companion, no second host read family, no exact surface change |
| proof_scope | use real `Form.make`, real runtime/host path, real `Form.Companion.byRowId`; avoid fake row store in the closing assertion |
| lifecycle | closed as `retained-harness + generalized-internal` |
| authority_writeback_trigger | only if the proof shows hidden second row truth, irreducible roster soft fact, selector route failure, or exact `byRowId` ambiguity |
| non_claims | no `TASK-003`, no public verification artifact vocabulary, no selector type-ceiling closure |

## TASK-008 Scope Seed

| field | value |
| --- | --- |
| target_caps | `CAP-03`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` |
| source_packet | `CAP-PRESS-002` |
| current_status | done-current-matrix |
| implementation_question | make submit / async rule / reason evidence obey one internal settlement generation law while keeping public API unchanged |
| public_surface_budget | no public `Settlement`, no public `Reason`, no public `SubmitAttempt`, no second evidence envelope, no second report object |
| first_wave_done | concurrent submit stale overwrite, field-level stale effectful rule drop, warning non-blocking law, path-sensitive source pending explanation |
| second_wave_done | list.item return normalization, root/list stale settlement identity, public export boundary |
| final_wave_done | CAP-15 multi-error causal backlink, rule fail channel |
| authority_writeback_trigger | only if warning carrier semantics or rule return exact contract must change |
| non_claims | `TASK-003` compare productization, scenario verification artifact vocabulary promotion, new public helper family |

## TASK-007 Scope Seed

| field | value |
| --- | --- |
| target_caps | `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` |
| source_packet | `CAP-PRESS-001-FU2` |
| current_status | done; FU3 freshness flush proof, FU4 source failure lifecycle proof, FU5 receipt artifact/report linking proof, and FU6 row receipt disambiguation proof are preserved |
| implementation_question | make source key canonicalization and same-key refresh writeback match the FU2 law |
| public_surface_budget | no `Form.Source`, no `useFieldSource`, no public source refresh helper, no public receipt identity API |
| result | strict canonical key rejection / diagnostics and generation-safe same-key writeback landed in source internals |
| non_claims | source-owned submit truth, second evidence envelope, complete remote variant productization beyond current source substrate law |

## TASK-006 Outcome

| field | value |
| --- | --- |
| target_vobs | `VOB-01`, `VOB-02`, `VOB-03` |
| source_packets | `TASK-002`, `RISK-06` |
| current_status | done |
| implementation_result | `scenarioCarrierReasonLinkFixture`, `scenarioCompiledPlanFixtureAdapter`, `scenarioEvidenceExpectationFixture`, and `comparePerfAdmissibilityFixture` are test fixtures; production `src/internal/verification` retains only generalized harness |
| public_surface_budget | no public scenario trial facade, no compare truth, no package export change |
| non_claims | final scenario compiler vocabulary, root compare productization, report summary rewrite |

## TASK-003 Scope Seed

| field | value |
| --- | --- |
| target_vob | `VOB-02` |
| source_packet | `IMP-005` |
| current_status | admissibility-only |
| implementation_question | whether productization beyond frozen `runtime.compare` control-plane stage is needed now |
| public_surface_budget | blocked until authority intake |
| non_claims | benchmark correctness truth, raw trace default compare surface |

不要只凭本 queue 启动 `TASK-003` 编码。它必须先由 authority intake 判断当前产品目标是否需要 root compare productization。

## 当前一句话结论

`TASK-001 / TASK-002 / TASK-004 / TASK-005 / TASK-006 / TASK-007 / TASK-008 / CAP-PRESS-003-FU1 / TASK-010` 已关闭。source lane、final truth / settlement / reason lane、row owner combined proof 当前 implementation residual 已清到 current matrix proof 范围内。`TASK-009` 已关闭 `fieldValue` typed path 与 returned-carrier companion exact inference；imperative `void` callback 保持 runtime-valid / honest-unknown。`Runtime.check` public facade 和 frozen baseline drift guards 已落地；`TASK-003` 保持 deferred，必须等到明确的 root compare productization 或 authority-intake 请求。
