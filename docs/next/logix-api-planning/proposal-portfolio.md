---
title: Logix API Proposal Portfolio
status: draft
version: 38
---

# Logix API Proposal Portfolio

## 目标

统一收纳从 capability atoms 派生出的 API planning proposals，让提案先在规划沙盘中完成 review、collision、principle promotion 与 proof planning，再进入 implementation-ready plan。

## 页面角色

- 本页只承接 proposal portfolio，不承担 authority
- 本页只索引 proposal，不冻结 exact surface
- proposal 进入 implementation-ready 前，必须回链 capability harness 和 review ledger

## Source

- [../../ssot/capability/01-planning-harness.md](../../ssot/capability/01-planning-harness.md)
- [../../ssot/capability/02-api-projection-decision-policy.md](../../ssot/capability/02-api-projection-decision-policy.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [./surface-candidate-registry.md](./surface-candidate-registry.md)

## Proposal State Machine

| status | meaning | exit gate |
| --- | --- | --- |
| `draft` | proposal 初稿 | has required template fields |
| `reviewed` | 单提案已完成 review | review ledger has no blocker |
| `portfolio-admitted` | 进入 portfolio | target caps / projections / collisions indexed |
| `collision-review` | 正在同层碰撞 | related `COL-*` updated |
| `principle-candidate` | 产生 `PRIN-*` 候选 | promotion gate resolved |
| `frozen-projection` | planning projection 已冻结 | adoption freeze record exists |
| `implementation-ready` | 可消化为实施计划 | readiness gate passed |
| `retired` | 被替代或拒绝 | rejection reason recorded |

## Portfolio Rules

- 本页只保留活跃 proposal 的主体信息
- `consumed / superseded / archived` proposal 只在下方索引，不再保留长说明
- 每个 active proposal 必须有 owner、review ledger、next action
- 每个 collision-review proposal 必须列出触碰的 `COL-*`
- 每个 implementation-ready proposal set 必须有单一 freeze record

## Current Portfolio Health

| field | value |
| --- | --- |
| active_count | `0` |
| frozen_count | `1` |
| implementation_ready_count | `1` |
| open_collision_count | `0` |
| surface_candidate_open_count | `0` |
| stale_rows | `0` |

## Active Proposal Index

| proposal id | status | target caps | target projection | generator verdict | conflicts | required principles | review ledger | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `none active` | `none` | `none` | `none` | `none` | `none` | `none` | `none` | `post-CONV queue paused after TASK-004` |

## Frozen Proposal Index

| proposal id | frozen decision | linked collisions | proof obligations | next step |
| --- | --- | --- | --- | --- |
| `PROP-001` | `PROJ-03` is the frozen planning baseline for field-local soft facts and its sanctioned selector route | `COL-03`, `COL-04`, `COL-05` | `PF-03`, `PF-05`, `PF-06`, `PF-07`; `PF-04 / PF-08 / PF-09 / CAP-15` closure accepted current matrix scope without reopening the proposal | `keep PROP-001 frozen; CONV-001 has consumed the proposal set` |

## Retired Proposal Index

| proposal id | terminal status | replaced_by | archive note |
| --- | --- | --- | --- |
| `none yet` | `none yet` | `none` | `none` |

## CAP Coverage Board

| cap slice | coverage status | proposals | gaps |
| --- | --- | --- | --- |
| `SC-C local coordination slice` | `covered` | `PROP-001`, `RISK-01`, `CAP-PRESS-004` | `none on the current baseline; companion boundary pressure closed without new public concept` |
| `SC-E row-heavy continuity slice` | `covered` | `PROP-001`, `PF-05 / PF-06`, `CAP-PRESS-003`, `CAP-PRESS-003-FU1`, `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2` | `none for current matrix; fieldValue typed path and returned-carrier exact companion metadata path accepted partial close, while void callback remains honest-unknown` |
| `SC-F host/read/report slice` | `covered` | `PROP-001` plus `PF-08 / PF-09`, `RISK-06`, `CAP-PRESS-005` | `productization beyond frozen runtime compare control-plane stage remains out of scope and remains blocked by TASK-003 authority intake` |
| `SC-D final-truth closure slice` | `covered` | `PROP-001` plus `PF-04`, `VOB-01`, `SURF-002`, `CAP-15` and global closure packets | `none for current matrix scope` |

## PROJ Pressure Board

| projection | proposals touching it | pressure type | required collision |
| --- | --- | --- | --- |
| `PROJ-03` | `PROP-001`, `CAP-PRESS-003`, `CAP-PRESS-004`, `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2`, `AUTH-REVIEW-companion-metadata-carrier` | `minimal-generator`, `host-read-admissibility`, `row-heavy sufficiency`, `row-owner pressure`, `companion boundary pressure`, `selector type ceiling` | `frozen baseline remains; CAP-PRESS-003/FU1 and CAP-PRESS-004 closed no-public-change for current matrix; returned-carrier exact companion metadata path is closed by TASK-009; void callback exact inference would require a future authoring-shape reopen` |
| `PROJ-06` | `CAP-PRESS-003`, `CAP-PRESS-004`, `CAP-PRESS-005`, `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2`, `AUTH-REVIEW-companion-metadata-carrier` | `single host selector gate`, `selector helper taxonomy`, `type ceiling` | `single host gate remains; second host/read family and Form-owned hooks rejected; fieldValue typed path and returned-carrier companion exact typing closed; void callback remains honest-unknown` |
| `PROJ-04` | `PF-04` follow-up plus `CAP-15` final submit linkage packet | `rule lane proven`, `submit backlink bridge accepted`, `SC-D covered for current matrix scope` | `none open; baseline for current matrix scope` |
| `PROJ-07` | `PF-08`, `VOB-01`, `SURF-002`, `CAP-15`, `PF-09`, `CAP-PRESS-005`, global closure after PF-09 | `startup evidence floor accepted`, `scenario-carrier boundary authority-linked`, `submit-link bridge accepted`, `VOB-02 executable for admissibility scope`, `verification/report pressure closed` | `none open; COL-05 and COL-07 are closed; productization beyond frozen runtime compare stage is deferred outside current matrix closure` |

## Generator Efficiency Board

| proposal | public concepts | covered caps | covered scenarios | collisions introduced | verdict |
| --- | --- | --- | --- | --- | --- |
| `PROP-001` | `1 field-local soft fact lane` | `4` | `2` | `0 new`, `4 touched` | `candidate generator` |

## Surface Candidate Board

| candidate | status | owner projection | source | next action |
| --- | --- | --- | --- | --- |
| `SURF-001` | `authority-linked` | `PROJ-03` | `PROP-001`, `CAP-PRESS-004`, `CAP-PRESS-007-FU1`, `CAP-PRESS-007-FU2` | `keep as current baseline; no new companion-adjacent or selector/path public concept admitted` |
| `SURF-002` | `authority-linked` | `PROJ-07` | `PF-08 / VOB-01 / PF-09 / CAP-PRESS-005` | `keep boundary linked to runtime/09; do not freeze verification artifact vocabulary or start TASK-003` |

## Collision Board

| collision | status | owner | proposals | close predicate |
| --- | --- | --- | --- | --- |
| `COL-03` | `closed-under-pressure` | `08 / specs/157` | `PROP-001`, `CAP-PRESS-003` | `closed; reopen only if a future scenario proves irreducible roster-owned soft fact or field-local owner binding failure` |
| `COL-04` | `closed-under-pressure` | `runtime/10 / 13` | `CAP-PRESS-003` | `closed; reopen only if a future scenario proves Form.Companion.byRowId cannot consume row owner through the canonical host gate` |
| `COL-05` | `closed` | `runtime/09 / runtime/10` | `none frozen proposal` | `closed by single evidence-envelope rule across UI, trial, compare feed, and report shell` |

## Principle Candidate Board

| principle | source collisions | status | authority target | backpropagation |
| --- | --- | --- | --- | --- |
| `soft-fact-owner-split` | `COL-01`, `COL-02`, `COL-08` | `candidate-level-non-blocking` | `13 / specs/155` | `no promotion required by current global closure` |

## Implementation Readiness Board

| proposal set | included proposals | blockers | required writeback | status |
| --- | --- | --- | --- | --- |
| `PROP-001-set` | `PROP-001` | `none` | `13 / runtime/10 / runtime/09 writeback already landed` | `consumed by CONV-001 outcome index; residuals routed to post-conv task queue` |

## Row Validation Checklist

- no row without owner
- no row without next action
- no active row without review ledger
- no collision row without close predicate
- no implementation-ready row without required writeback
- no surface candidate without owner projection, proof state, authority target, and next action

## 当前一句话结论

当前 `PROP-001` 已进入 implementation-ready 且保持 frozen；`SC-A..SC-F` 当前矩阵范围已通过 planning-level closure，并已汇总到 `docs/ssot/capability/03-frozen-api-shape.md`。`CAP-PRESS-003/FU1` 已关闭 row owner no-change proof，`CAP-PRESS-004` 已关闭 companion boundary no-change proof，`CAP-PRESS-005` 已关闭 verification/report no-change proof，`CAP-PRESS-007-FU1/FU2` 已关闭 pressure且未新增 public concept。`TASK-009` 已关闭 `fieldValue` typed path 与 returned-carrier exact companion metadata path；imperative `void` callback 仍 runtime-valid / honest-unknown。下一步为 optional docs/examples teaching follow-up，`TASK-003` 仍 deferred。
