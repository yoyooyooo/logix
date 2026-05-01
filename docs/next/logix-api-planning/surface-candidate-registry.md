---
title: Logix API Surface Candidate Registry
status: draft
version: 22
---

# Logix API Surface Candidate Registry

## 目标

机械化追踪 capability planning 过程中长出的公开概念候选，避免只靠 proposal prose 或 shape snapshot 判断 API 形状是否收敛。

本页只承接 planning control plane，不冻结 exact spelling，不替代 owner authority。

## Source

- [run-state.md](./run-state.md)
- [proposal-portfolio.md](./proposal-portfolio.md)
- [shape-snapshot.md](./shape-snapshot.md)
- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [auth-review-companion-metadata-carrier.md](./auth-review-companion-metadata-carrier.md)
- [human-press-001-first-read-acceptance-taste-pressure-packet.md](./human-press-001-first-read-acceptance-taste-pressure-packet.md)
- [../../ssot/capability/01-planning-harness.md](../../ssot/capability/01-planning-harness.md)
- [../../ssot/capability/02-api-projection-decision-policy.md](../../ssot/capability/02-api-projection-decision-policy.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)

## Status Vocabulary

| status | meaning |
| --- | --- |
| `candidate` | 已出现公开概念候选，尚未完成 review |
| `under-review` | 正在碰撞、证明或等待 authority |
| `frozen` | planning 层已冻结，exact surface 仍看 authority |
| `rejected` | 已明确拒绝 |
| `authority-linked` | exact authority 已承接或回链 |
| `superseded` | 被更小或更强候选替代 |

## Registry Rules

- 每个公开概念候选必须有 owner projection
- 每个候选必须列出 covered `CAP-* / SC-*`
- 每个候选必须有 public surface delta
- 每个候选必须有 generator verdict
- 每个候选必须有 proof state
- 每个候选必须有 authority target
- `shape-snapshot.md` 只能展示本页已有候选，或显式打开本页 follow-up
- 本页状态不能冻结 exact spelling

## Current Surface Candidates

| candidate id | status | public concept | owner projection | covered caps | covered scenarios | authority target | next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SURF-001` | `authority-linked` | field-local soft fact lane with sanctioned selector route | `PROJ-03` | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` | `SC-C`, partial `SC-D`, optional `SC-E / SC-F` pressure | `13`, `runtime/10`, `specs/155` | keep as current baseline; `fieldValue` typed path and returned-carrier companion exact typing closed without new surface candidate; imperative `void` callback remains honest-unknown |
| `SURF-002` | `authority-linked` | verification scenario carrier evidence feed | `PROJ-07` | `CAP-15`, `CAP-18`, `VOB-01`, `VOB-02`, `VOB-03` | `SC-D`, `SC-F`, supporting `SC-C / SC-E` | `runtime/09` | keep boundary linked; root compare productization remains deferred |

## Proof Index

| candidate id | proof summary | source index |
| --- | --- | --- |
| `SURF-001` | local soft fact and selector route proven for current matrix scope; row owner combined host proof sample and companion boundary pressure closed without new public concept; CAP-PRESS-007-FU1 keeps the same public selector route; TASK-009 closes fieldValue typed path and returned-carrier companion exact typing through a `+0` public concept type-only carrier without a new registry row; imperative `void` callback remains honest-unknown | `PROP-001`, `COL-03`, `COL-04`, `COL-05`, `COL-06`, `COL-08`, `PF-03`, `PF-04`, `PF-05`, `PF-06`, `PF-07`, `RISK-01`, `CAP-PRESS-003-FU1`, `CAP-PRESS-004`, `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2`, `TASK-009`, `AUTH-REVIEW-companion-metadata-carrier` |
| `SURF-002` | runtime/09 accepts the scenario carrier evidence boundary; submit-link bridge, compare/perf admissibility, and CAP-PRESS-005 verification/report pressure are closed for current scope without public scenario/report/compare concept expansion | `PF-08`, `VOB-01` retained-harness proof ladder, `SURF-002` promotion review, `CAP-15` closure, `PF-09`, global closure after `PF-09`, `IMP-003..IMP-005`, `TASK-002`, `TASK-006`, `RISK-06`, `CAP-PRESS-005` |

## Consumed / Superseded Candidates

| candidate id | terminal status | replaced by | note |
| --- | --- | --- | --- |
| `none yet` | `none` | `none` | `none` |

## Global Closure Checklist

| check | status | note |
| --- | --- | --- |
| all surface candidates terminal or authority-linked | `passed-local` | `SURF-001` and `SURF-002` are authority-linked |
| snapshot generated from registry | `passed-local` | snapshot cites this registry, runtime/09 writeback, and PF-09 admissibility closure |
| authority writeback known | `passed-local` | `SURF-002` boundary writeback landed in runtime/09 |
| artifact-local evidence has lifecycle decision | `passed-local` | verification evidence promoted only as authority-linked boundary; production implementation vocabulary is retained-harness only; artifact-local helpers are demoted-test-fixture |
| frozen shape recorded | `passed-local` | total shape now lives in `docs/ssot/capability/03-frozen-api-shape.md` |

## Rejected Or Not-Admitted Selector Concepts

| concept | status | source | note |
| --- | --- | --- | --- |
| public `Form.Path` / schema path builder | `not-admitted` | `CAP-PRESS-007-FU2` | only reconsider if type-only constrained path implementation proof fails and concept admission proves lower total surface |
| public typed descriptor family | `not-admitted` | `CAP-PRESS-007-FU2` | would expand selector surface before proof |
| public metadata object on `FormProgram` | `not-admitted` | `CAP-PRESS-007-FU2` | risks second metadata truth and authoring burden |
| `useFieldValue / useCompanion / useFormSelector` | `rejected` | `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2` | second host/read route |
| public row owner token / nested remap coordinate | `not-admitted` | `AUTH-REVIEW-companion-metadata-carrier` | exact row companion typing must stay on the existing byRowId descriptor and internal owner resolver |
| carrier-bound selector route | `not-admitted` | `HUMAN-PRESS-001` | improves locality but would turn returned carrier into a second read shape beside `Form.Companion.field/byRowId` |
| generic `Fact / SoftFact` namespace | `not-admitted` | `HUMAN-PRESS-001` | broader name weakens soft-fact boundary and invites final-truth misuse |
| list/root companion as taste fix | `not-admitted` | `HUMAN-PRESS-001` | no irreducible roster-owned soft fact has appeared; current matrix remains field-local companion plus row owner resolver |
| void callback auto-collection as taste fix | `not-admitted` | `HUMAN-PRESS-001` | human authoring feel improves, but sound exact collection still requires future authoring-shape proof |

## 当前一句话结论

当前公开 API 形状候选均已 authority-linked，并被 [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md) 消费为 frozen shape。`CAP-PRESS-004` 未新增 public concept，`CAP-PRESS-007-FU1 / FU2` 也未新增 public selector/path concept，`TASK-009` 已关闭 `fieldValue` typed path 与 returned-carrier companion exact typing且未新增 registry row；imperative `void` callback 保持 honest-unknown。`HUMAN-PRESS-001` 未新增 public concept，human/taste counter-shapes 只作为 rejected/not-admitted 记录。`CAP-PRESS-005` 未新增 public concept，`SURF-002` 只补 proof index并继续由 `runtime/09` 承接 verification boundary，不冻结 retained harness / test fixture 的内部实现命名。
