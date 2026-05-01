---
title: Logix API Planning Workspace
status: draft
version: 39
---

# Logix API Planning Workspace

## 目标

把 `logix-capability-planning-loop` 的当前 cursor、proposal portfolio 与 API shape snapshot 收口到一个专用目录，方便新会话恢复和持续推进。

本目录只承接 planning control plane，不承担 authority。

## 恢复入口

| 页面 | 角色 |
| --- | --- |
| [run-state.md](./run-state.md) | 当前 cursor、resume artifacts、resume protocol |
| [proposal-portfolio.md](./proposal-portfolio.md) | proposal portfolio 与 closure board |
| [surface-candidate-registry.md](./surface-candidate-registry.md) | 公开概念候选、覆盖能力、proof 与 authority 状态的机械化账本 |
| [shape-snapshot.md](./shape-snapshot.md) | 面向人读的当前 API 外观 |
| [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md) | 冻结 API 形状对应的实现 / 类型 / proof 缺口总账 |
| [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md) | 当前覆盖矩阵的冻结 API 形状 |
| [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md) | 冻结形状的高风险 API slice、能力点、proof 与 reopen bar |
| [capability-atom-pressure-map.md](./capability-atom-pressure-map.md) | 第二轮 adversarial capability pressure queue，用于主动挑战 frozen shape |
| [cap-press-001-source-freshness-lifecycle-receipt-pressure-packet.md](./cap-press-001-source-freshness-lifecycle-receipt-pressure-packet.md) | `CAP-PRESS-001` source freshness / lifecycle / receipt pressure 结果 |
| [cap-press-001-fu1-manual-trigger-reachability.md](./cap-press-001-fu1-manual-trigger-reachability.md) | `CAP-PRESS-001-FU1` manual source trigger reachability 裁决 |
| [cap-press-001-fu2-source-task-identity-key-law.md](./cap-press-001-fu2-source-task-identity-key-law.md) | `CAP-PRESS-001-FU2` source task identity 与 key canonicalization law |
| [cap-press-001-fu3-exhaust-trailing-debounce-submit-impact-proof.md](./cap-press-001-fu3-exhaust-trailing-debounce-submit-impact-proof.md) | `CAP-PRESS-001-FU3` exhaust-trailing / debounce / submitImpact proof 结果 |
| [cap-press-001-fu4-source-failure-lifecycle-proof.md](./cap-press-001-fu4-source-failure-lifecycle-proof.md) | `CAP-PRESS-001-FU4` source failure lifecycle / submitImpact / read route proof 结果 |
| [cap-press-001-fu5-receipt-artifact-feed-report-join-proof.md](./cap-press-001-fu5-receipt-artifact-feed-report-join-proof.md) | `CAP-PRESS-001-FU5` receipt artifact / feed / report join proof 结果 |
| [cap-press-001-fu6-row-receipt-disambiguation-proof.md](./cap-press-001-fu6-row-receipt-disambiguation-proof.md) | `CAP-PRESS-001-FU6` row receipt disambiguation proof 结果 |
| [task-007-source-key-generation-proof-scope.md](./task-007-source-key-generation-proof-scope.md) | `TASK-007` source key canonicalization / same-key generation proof 结果 |
| [cap-press-002-final-truth-settlement-reason-pressure-packet.md](./cap-press-002-final-truth-settlement-reason-pressure-packet.md) | `CAP-PRESS-002` final truth / settlement / reason pressure 结果 |
| [cap-press-003-row-owner-nested-remap-pressure-packet.md](./cap-press-003-row-owner-nested-remap-pressure-packet.md) | `CAP-PRESS-003` row owner / nested remap / read-write symmetry pressure 包 |
| [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md) | `CAP-PRESS-003-FU1` real-runtime row owner combined proof 结果 |
| [cap-press-004-companion-soft-fact-boundary-pressure-packet.md](./cap-press-004-companion-soft-fact-boundary-pressure-packet.md) | `CAP-PRESS-004` companion soft fact boundary pressure 结果 |
| [cap-press-005-verification-scenario-report-pressure-packet.md](./cap-press-005-verification-scenario-report-pressure-packet.md) | `CAP-PRESS-005` verification scenario / report pressure 结果 |
| [task-008-final-truth-settlement-reason-proof-scope.md](./task-008-final-truth-settlement-reason-proof-scope.md) | `TASK-008` final truth / settlement / reason proof 结果 |
| [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md) | `CAP-PRESS-007-FU1` selector 类型安全 ceiling 的 pressure 结果与 `TASK-009` 切分 |
| [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md) | `CAP-PRESS-007-FU2` typed path / declaration metadata type chain 的 red-proof-backed implementation task packet |
| [task-009-type-only-path-metadata-chain-scope.md](./task-009-type-only-path-metadata-chain-scope.md) | `TASK-009` type-only path / metadata chain 的最小 implementation scope |
| [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md) | companion metadata carrier 的 authority review 与 writeback 结果 |
| [task-009-companion-metadata-carrier-implementation-scope.md](./task-009-companion-metadata-carrier-implementation-scope.md) | `TASK-009` companion metadata carrier 的 implementation scope |
| [housekeeping.md](./housekeeping.md) | 文档生命周期、预算、归档触发条件与 wave 结束清理流程 |
| [implementation-ready-conversion.md](./implementation-ready-conversion.md) | 已消费的 `CONV-001` outcome index |
| [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md) | `CONV-001` proof refresh 后的 residual implementation task queue |

## 历史结果索引

| 页面 | 角色 |
| --- | --- |
| [imp-001-companion-host-implementation-packet.md](./imp-001-companion-host-implementation-packet.md) | `IMP-001` companion / host proof refresh 结果 |
| [imp-002-row-owner-continuity-implementation-packet.md](./imp-002-row-owner-continuity-implementation-packet.md) | `IMP-002` row owner continuity proof refresh 结果 |
| [imp-003-rule-submit-reason-implementation-packet.md](./imp-003-rule-submit-reason-implementation-packet.md) | `IMP-003` rule / submit / reason proof refresh 结果 |
| [imp-004-verification-retained-harness-implementation-packet.md](./imp-004-verification-retained-harness-implementation-packet.md) | `IMP-004` verification retained-harness proof refresh 与 lifecycle 结果 |
| [imp-005-compare-perf-admissibility-implementation-packet.md](./imp-005-compare-perf-admissibility-implementation-packet.md) | `IMP-005` compare / perf admissibility proof refresh 结果 |
| [imp-006-source-substrate-implementation-packet.md](./imp-006-source-substrate-implementation-packet.md) | `IMP-006` source substrate proof refresh 与 `IE-02` residual 结果 |
| [task-001-source-receipt-freshness-scope.md](./task-001-source-receipt-freshness-scope.md) | `TASK-001` source receipt freshness narrow proof 结果 |
| [task-002-verification-artifact-lifecycle-cleanup-scope.md](./task-002-verification-artifact-lifecycle-cleanup-scope.md) | `TASK-002` verification artifact lifecycle cleanup 结果 |
| [task-004-control-plane-hygiene-scope.md](./task-004-control-plane-hygiene-scope.md) | `TASK-004` post-CONV control-plane hygiene 结果 |
| [task-005-source-scheduling-proof-scope.md](./task-005-source-scheduling-proof-scope.md) | `TASK-005` source scheduling proof 结果 |
| [task-006-verification-fixture-demotion-scope.md](./task-006-verification-fixture-demotion-scope.md) | `TASK-006` verification artifact demotion 结果 |

## Closed Risk Packet Index

| 页面 | 角色 |
| --- | --- |
| [risk-lane-closure-check.md](./risk-lane-closure-check.md) | `RISK-01..RISK-06` closure matrix 与当前暂停条件 |
| [risk-01-companion-soft-fact-boundary-pressure-packet.md](./risk-01-companion-soft-fact-boundary-pressure-packet.md) | `RISK-01` companion soft fact boundary pressure 结果 |
| [risk-02-source-freshness-pressure-packet.md](./risk-02-source-freshness-pressure-packet.md) | `RISK-02` source freshness 的 implementation-scope 与 proof-refresh plan |
| [risk-03-final-truth-reason-chain-pressure-packet.md](./risk-03-final-truth-reason-chain-pressure-packet.md) | `RISK-03` final truth / reason chain pressure 结果 |
| [risk-04-row-identity-active-exit-pressure-packet.md](./risk-04-row-identity-active-exit-pressure-packet.md) | `RISK-04` row identity / active exit pressure 结果 |
| [risk-05-host-selector-gate-watch-packet.md](./risk-05-host-selector-gate-watch-packet.md) | `RISK-05` host selector gate watch 结果 |
| [risk-06-verification-control-plane-pressure-packet.md](./risk-06-verification-control-plane-pressure-packet.md) | `RISK-06` verification control plane pressure 结果 |

## 使用规则

- 新会话恢复时先读 `run-state.md`
- 历史结果索引只在追溯 packet 或 task outcome 时读取
- proposal 变更先回 `proposal-portfolio.md`
- 公开概念候选先回 `surface-candidate-registry.md`
- 判断一个冻结点是否已实施、缺口在哪，先回 `api-implementation-gap-ledger.md`
- 人类查看当前 API 长相先看 `shape-snapshot.md`，判断冻结形状直接看 `../../ssot/capability/03-frozen-api-shape.md`
- 打磨冻结形状的高风险点先看 `frozen-api-shape-risk-lanes.md`
- 判断整体 API 形状是否 ready 时，按 capability harness 的 Global API Shape Closure Gate 检查
- 主动挑战当前 frozen shape 时，先走 `capability-atom-pressure-map.md` 的 `CAP-PRESS-*` queue
- wave 结束时按 `housekeeping.md` 做清理和归档
- 本目录文件只记录 planning 实例态，不冻结 exact surface

## 当前一句话结论

这里是 Logix API planning 的恢复入口；当前 `SC-A..SC-F / CAP-01..CAP-26 / VOB-01..VOB-03` 的冻结 API 形状已落到 `docs/ssot/capability/03-frozen-api-shape.md`。implementation gap 已统一收口到 `api-implementation-gap-ledger.md`；`RISK-01..RISK-06` 与 `TASK-001 / TASK-002 / TASK-004 / TASK-005 / TASK-006 / TASK-007 / TASK-008 / CAP-PRESS-003-FU1 / TASK-009` 已收尾；`CAP-PRESS-001-FU1 / FU2 / FU3 / FU4 / FU5 / FU6` 已关闭；`CAP-PRESS-002`、`CAP-PRESS-003`、`CAP-PRESS-004`、`CAP-PRESS-005` 与 `CAP-PRESS-007-FU1/FU2` 已关闭；当前没有必须继续压的非 blocked pressure slice。`TASK-009` 已接受 partial close：returned-carrier companion exact typing 绿灯，imperative void callback honest-unknown；`TASK-003` 仍保持 deferred。
