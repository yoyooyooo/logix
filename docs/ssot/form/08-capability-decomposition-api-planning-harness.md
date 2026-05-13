---
title: Form Capability Decomposition API Planning Harness
status: living
version: 15
---

# Form Capability Decomposition API Planning Harness

## 目标

把 [06-capability-scenario-api-support-map.md](./06-capability-scenario-api-support-map.md) 的 `SC-*` 主场景矩阵拆成可审、可组合、可验证的 capability atoms，并把这些 atoms 投影到 API planning lane、internal enabler、proof harness 与 collision ledger。

本页服务 API 设计压力测试与多 Agent 并行规划。它回答：

- 每个场景由哪些能力原子构成
- 哪些能力原子可以被同一 API lane 覆盖
- 哪些能力原子必须保持分离
- 当前 API planning lane 与 internal enabler 覆盖了哪些能力点
- 不同 lane proposal 的碰撞如何收敛、冻结或重开

## 页面角色

- 本页继承 [../capability/01-planning-harness.md](../capability/01-planning-harness.md) 与 [../capability/02-api-projection-decision-policy.md](../capability/02-api-projection-decision-policy.md)
- 本页是 Form domain capability projection 的唯一 SSoT
- Form 是 Logix capability planning harness 的 first pressure domain
- 通用能力优先回 [../capability/README.md](../capability/README.md)，本页只承接 Form domain-specific projection
- 本页从 `06` 派生，不新增场景主键
- 本页持有 `CAP-* / PROJ-* / IE-* / PF-* / VOB-* / COL-*` 规划坐标
- 本页不定义 exact public surface
- 本页不采纳 exact spelling
- 本页不替代 [13-exact-surface-contract.md](./13-exact-surface-contract.md)
- 本页不替代 [05-public-api-families.md](./05-public-api-families.md)
- 本页不替代 runtime verification authority
- 当前覆盖矩阵的全局 frozen shape 统一看 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)

## 坐标系统

| prefix | owner | 含义 | 稳定性 |
| --- | --- | --- | --- |
| `SC-*` | `06` | stable scenario id | 主坐标 |
| `CAP-*` | 本页 | 单 owner、可验证的 capability atom | 规划稳定 |
| `PROJ-*` | 本页 | public API planning lane projection | 可替换 |
| `IE-*` | 本页 | internal enabler | 可替换 |
| `PF-*` | 本页 | proof / fixture / verification harness | 可扩展 |
| `VOB-*` | 本页 | verification-only obligation | 可扩展 |
| `COL-*` | 本页 | collision / merge / split record | living |

本页默认不维护 `CB-*`。组合理由直接写进 `PROJ-*` 的 `bundle rationale`。只有同一 bundle 同时存在两个以上活跃 `PROJ-*` 竞争方案，并且 `COL-*` 无法表达 merge/split 压力时，才允许新增临时 `CB-*`。

## 状态枚举

| field | allowed values | 说明 |
| --- | --- | --- |
| `planning_status` | `kept`, `needs-split`, `deferred`, `rejected` | 能力原子在本页规划层的状态 |
| `implementation_status` | `implemented`, `partial`, `missing`, `not-applicable` | 当前代码或实现侧 substrate 状态 |
| `proof_status` | `proven`, `partial`, `missing`, `conditional` | proof harness 当前闭合状态 |
| `projection_status` | `baseline`, `under-pressure`, `needs-authority`, `rejected` | API planning lane 状态，不代表 exact surface 采纳 |
| `collision_status` | `closed`, `open`, `blocked`, `candidate`, `rejected`, `reopened` | collision ledger 状态 |
| `gate_status` | `executable`, `planned`, `conditional`, `blocked` | proof harness 可执行状态 |

## 使用规则

- 每个 `CAP-*` 必须回链至少一个 `SC-*`
- 每个 `CAP-*` 只能有一个 primary owner lane
- 每个 `CAP-*` 必须是 API-neutral capability，不得直接等同某个 spelling
- 每个 `CAP-*` 必须声明 observable invariant、proof gate、anti-goal
- 跨 owner lane 的能力只能通过 `depends_on` 或 `PROJ-*` 组合表达，不能伪装成 atom
- `PROJ-*` 只允许表达 lane-level planning projection，不允许冻结 exact noun、import shape、method spelling
- 每个 `PROJ-*` 必须声明 `authority_target`
- 每个 `COL-*` 必须有 decision question、close predicate、required proof 与 surviving alternatives
- 新增场景先改 `06`，再回到本页拆 capability

## Capability Atom Catalog

| cap id | name | scenarios | primary owner lane | capability statement | depends_on | observable invariant | proof gate | anti-goal | planning_status | implementation_status | proof_status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CAP-01` | declaration root | `SC-A` | declaration | 单一 Form declaration act 承接 field、list 与 submit 的根组合 | `-` | 同一 form program 不需要第二 declaration carrier | `PF-01` | 不下沉到 field-kernel 或 host | `kept` | `implemented` | `proven` |
| `CAP-02` | field final rule contribution | `SC-A`, `SC-D` | rule | field/list/root 最终不变量能进入统一 rule lane | `CAP-01` | rule outcome 能回链 path / row / reason slot | `PF-01`, `PF-04` | 不吸收 remote IO 或 local soft fact | `kept` | `implemented` | `partial` |
| `CAP-03` | submit attempt verdict | `SC-A`, `SC-B`, `SC-D` | submit | submit attempt 聚合当前可提交性与最终 verdict | `CAP-02` | old submit snapshot 不被 later settle 改写 | `PF-01`, `PF-02` | 不长第二 submit truth | `kept` | `implemented` | `partial` |
| `CAP-04` | submit decode gate | `SC-A` | submit | structural decode 只在 submit gate 进入 canonical submit truth | `CAP-03` | field validate 不触发 structural decode attempt | `PF-01` | 不新增 decode attempt noun | `kept` | `implemented` | `partial` |
| `CAP-05` | remote fact ingress | `SC-B`, `SC-C` | source | Query-owned remote fact 进入 Form 的唯一入口 | `CAP-01` | remote fact 只经 source receipt 消费 | `PF-02`, `PF-03` | 不吸收 companion / rule | `kept` | `implemented` | `partial` |
| `CAP-06` | source dependency scheduling | `SC-B`, `SC-C` | source | 远端依赖按 deps/key/concurrency/debounce 稳定调度 | `CAP-05` | key 变化与 stale drop 可复现 | `PF-02` | 不下沉成组件 glue | `kept` | `partial` | `partial` |
| `CAP-07` | source task lifecycle | `SC-B`, `SC-C` | source | source pending/stale/error 以 source lifecycle 表达 | `CAP-06` | pending/stale/error 不创造第二 settlement truth | `PF-02` | 不新增 pending system | `kept` | `partial` | `proven-current-matrix` |
| `CAP-08` | source submit impact | `SC-B`, `SC-D` | source | source lifecycle 对 submit 的影响由 submitImpact 声明 | `CAP-07`, `CAP-03` | blocked-by 能解释到 source receipt | `PF-02` | 不把 source 变成 submit truth owner | `kept` | `partial` | `proven-current-matrix` |
| `CAP-09` | source receipt identity | `SC-B`, `SC-C`, `SC-F` | evidence | source snapshot 产生可回链 receipt identity | `CAP-05` | receipt 能连接 later rule / submit / diagnostics | `PF-02`, `PF-08` | 不成为第二 evidence envelope | `kept` | `partial` | `proven-current-matrix` |
| `CAP-10` | local companion derivation | `SC-C`, `SC-D` | companion | field-owned local soft fact 由 value/deps/source 同步降出 | `CAP-05` | lower 同步纯计算，无 IO，无 writeback | `PF-03` | 不吸收 values / errors / submit | `kept` | `implemented` | `proven` |
| `CAP-11` | availability soft fact | `SC-C`, `SC-D` | companion | 字段可用性、可交互性、本地 gating 作为 soft fact 投影 | `CAP-10` | availability 不承接最终裁决 | `PF-03` | 不承接 render policy / final rule | `kept` | `implemented` | `proven` |
| `CAP-12` | candidate set soft fact | `SC-C`, `SC-D` | companion | options shaping、候选过滤、keep current 作为 local candidate set 投影 | `CAP-10` | current value retention 与 candidate projection 可解释 | `PF-03` | 不把 select-like proof 抬成总骨架 | `kept` | `implemented` | `proven` |
| `CAP-13` | companion selector admissibility | `SC-C`, `SC-F` | host | companion facts 能通过 sanctioned selector route 消费 | `CAP-10`, `CAP-21` | 用户代码不依赖 raw internal landing path | `PF-03`, `PF-07` | 不新增第二 host family | `kept` | `implemented` | `proven` |
| `CAP-14` | cross-row final constraint | `SC-D` | rule | 跨行互斥、唯一性、最终约束由 rule 承接 | `CAP-02`, `CAP-19` | duplicate / violation 能回链 row subject | `PF-04` | 不放进 companion final truth | `kept` | `partial` | `proven` |
| `CAP-15` | rule submit backlink | `SC-D`, `SC-F` | reason | rule outcome 与 submit summary 能回链当前 evidence | `CAP-03`, `CAP-17`, `CAP-18` | reasonSlotId 指向当前 live evidence | `PF-04`, `PF-08` | 不长第二 explain object | `kept` | `implemented` | `proven` |
| `CAP-16` | async settlement contributor | `SC-B`, `SC-D` | settlement | async rule、list.item rule、root rule 收口到 settlement lane | `CAP-03` | pending/stale 只落单一 settlement truth | `PF-04` | 不长第二 task grammar | `kept` | `partial` | `proven` |
| `CAP-17` | reason slot identity | `SC-D`, `SC-E`, `SC-F` | reason | error、pending、stale、cleanup、blocking 共用 canonical reason slot identity | `-` | 同一 token 能解释 UI / Agent / trial | `PF-04`, `PF-08` | 不新增 issue tree | `kept` | `implemented` | `proven` |
| `CAP-18` | evidence causal link | `SC-B`, `SC-D`, `SC-F` | evidence | source、companion、rule、submit 的因果链可通过 evidence links 表达 | `CAP-09`, `CAP-10`, `CAP-15` | sourceReceiptRef / bundlePatchRef / reasonSlotId 能机械回链 | `PF-08`, `PF-09` | 不新增第二 evidence envelope | `kept` | `implemented` | `proven` |
| `CAP-19` | list row identity chain | `SC-E` | active-shape | list row identity 由 canonical row id chain 解释 | `CAP-01` | reorder 后 row truth 连续 | `PF-05` | 不把 index/render order 抬成 truth | `kept` | `implemented` | `proven` |
| `CAP-20` | structural edit continuity | `SC-E` | active-shape | reorder、swap、move、replace、remove 保留或终止正确 row truth | `CAP-19` | structural edit 不造第二 row truth | `PF-05`, `PF-06` | 不靠 React key 兜底 | `kept` | `implemented` | `proven` |
| `CAP-21` | byRowId owner route | `SC-E` | active-shape | byRowId 写侧与读侧命中同一 canonical row owner | `CAP-19` | byRowId after reorder 仍命中同一 row | `PF-05` | 不公开 synthetic local id | `kept` | `implemented` | `proven` |
| `CAP-22` | active exit cleanup | `SC-E` | cleanup | hidden/removed/replaced row 的 live contribution 正确退出 | `CAP-20`, `CAP-17` | stale contribution 不再影响 reason/submit | `PF-06` | 不保留 hidden live truth | `kept` | `implemented` | `proven` |
| `CAP-23` | nested owner remap | `SC-E` | active-shape | nested list item 的 owner path 随外层 row remap | `CAP-19`, `CAP-20` | nested row error / ui / reason 跟随 owner | `PF-06` | 不丢外层 owner | `kept` | `implemented` | `proven` |
| `CAP-24` | host acquisition | `SC-A`, `SC-F` | host | React 通过单一 acquisition route 获取 Form handle | `CAP-01` | host acquisition 不复制 Form truth | `PF-01`, `PF-07` | 不新增 parallel hook family | `kept` | `implemented` | `proven` |
| `CAP-25` | selector read route | `SC-A`, `SC-B`, `SC-E`, `SC-F` | host | 读侧以 single selector gate 为主门 | `CAP-24` | selector read 不暴露 internal state shape | `PF-01`, `PF-07` | 不新增第二 read law | `kept` | `implemented` | `proven` |
| `CAP-26` | selector helper adjunct taxonomy | `SC-F` | host | helper 只作为 selector-support adjunct 分类 | `CAP-25` | helper 全部回到 single host gate | `PF-07` | 不把 helper 变成第二 authority | `kept` | `implemented` | `proven` |

## Verification Obligation Ledger

`VOB-*` 只服务 verification planning，不进入 authoring capability atom。

| vob id | name | scenarios | obligation | required caps | proof gate | gate_status |
| --- | --- | --- | --- | --- | --- | --- |
| `VOB-01` | scenario trial carrier | `SC-C`, `SC-D`, `SC-E`, `SC-F` | scenario plan 通过 fixtures/env + steps + expect 运行并输出 evidence feed；当前 verification boundary 已由 `runtime/09` 承接，`CAP-15` submit backlink 已在当前矩阵范围闭合 | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18`, `CAP-23` | `PF-08` | `executable` |
| `VOB-02` | compare / perf admissibility | `SC-F` | benchmark 只消费已通过 proof gate 的 execution carrier | `CAP-18`, `CAP-25` | `PF-09` | `executable` |
| `VOB-03` | report materializer | `SC-F` | control-plane report 只读取 canonical truth 和 evidence summary | `CAP-17`, `CAP-18` | `PF-08` | `executable` |

## Scenario To Capability Matrix

本表只保留 `SC-* -> CAP-* / VOB-*` decomposition。场景级 status、proof anchor、reopen bar 继续只看 `06`。

| scenario id | required capabilities | required verification obligations | optional capabilities |
| --- | --- | --- | --- |
| `SC-A` | `CAP-01`, `CAP-02`, `CAP-03`, `CAP-04`, `CAP-24`, `CAP-25` | `-` | `CAP-26` |
| `SC-B` | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-25`, `CAP-17`, `CAP-18` | `-` | `CAP-16` |
| `SC-C` | `CAP-05`, `CAP-06`, `CAP-09`, `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` | `VOB-01` | `CAP-17`, `CAP-18` |
| `SC-D` | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` | `VOB-01` | `CAP-08` |
| `SC-E` | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, `CAP-25`, `CAP-17` | `VOB-01` | `CAP-13`, `VOB-02` |
| `SC-F` | `CAP-24`, `CAP-25`, `CAP-26`, `CAP-17`, `CAP-18` | `VOB-01`, `VOB-02`, `VOB-03` | `CAP-13`, `CAP-15` |

## Lane Projection Ledger

`PROJ-*` 是 planning lane，不冻结 exact spelling。`surface commitment` 只允许下面三类：

- `authority-linked`
  - exact shape 已在 `authority_target` 里冻结，本页只回链
- `planning-only`
  - 本页只用于 pressure 和 collision，不得作为 exact surface
- `needs-authority`
  - 若未来采纳，必须先回写 `05 / 13 / specs/155`

| projection id | lane-level sketch | covered caps | known uncovered caps | bundle rationale | must stay separate from | authority_target | surface commitment | projection_status | collision ids |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PROJ-01` | declaration spine | `CAP-01`, `CAP-02`, `CAP-03`, `CAP-04` | source、companion、row-heavy、host helper | minimal stable form authoring spine | remote fact ingress、local soft fact、host acquisition | `13`, `05`, `specs/155` | `authority-linked` | `baseline` | `COL-01` |
| `PROJ-02` | remote source lane | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, partial `CAP-09` | local soft fact、cross-row final truth | remote fact ingress 与 source lifecycle 同证据链 | companion lane、final rule lane | `13`, `specs/155` | `authority-linked` | `baseline` | `COL-01`, `COL-06` |
| `PROJ-03` | field-local soft fact lane | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` | final rule | local soft fact authoring 与 sanctioned read 同 pressure 面 | final rule lane、reason truth | `13`, `specs/155` | `authority-linked` | `baseline` | `COL-01`, `COL-02`, `COL-03`, `COL-08` |
| `PROJ-04` | final constraint / settlement lane | `CAP-02`, `CAP-03`, `CAP-14`, `CAP-16`, `CAP-15` | local soft fact、source receipt causality | final constraint、settlement、submit 必须合并证明 | companion lane、verification lane | `13`, `runtime/06`, `specs/155` | `authority-linked` | `baseline` | `COL-02`, `COL-05` |
| `PROJ-05` | row identity operation lane | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` | trial feed | row identity/lifecycle 是同一 owner chain | companion lane、host helper lane | `13`, `runtime/06`, `specs/149` | `authority-linked` | `baseline` | `COL-03`, `COL-04` |
| `PROJ-06` | host selector gate lane | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26`, partial `CAP-17` | trial feed | acquisition 与 selector helper 回到 single host gate | report materializer、authoring lanes | `runtime/10`, `13` | `authority-linked` | `baseline` | `COL-04`, `COL-05` |
| `PROJ-07` | verification control lane | `VOB-01`, `VOB-02`, `VOB-03`, `CAP-18` | authoring semantics | diagnostics、trial、compare 共享 evidence substrate | all authoring lanes | `runtime/09`, `specs/155` | `planning-only` | `baseline` | `COL-05`, `COL-07` |

## Internal Enabler Matrix

| enabler id | name | supports caps / vobs | target modules | proof route | implementation_status | proof_status |
| --- | --- | --- | --- | --- | --- | --- |
| `IE-01` | declaration normalization | `CAP-01`, `CAP-02`, `CAP-03`, `CAP-04` | `packages/logix-form/src/internal/form/impl.ts` | exact surface tests | `implemented` | `proven` |
| `IE-02` | source task substrate | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` | field-kernel source internals、form install | source authoring + stale submit tests; `CONV-001 / IMP-006` carries implementation freshness; `CAP-PRESS-001-FU2` owns source task identity / key canonicalization law; `CAP-PRESS-001-FU3` closes submit-time debounced block freshness proof; `CAP-PRESS-001-FU4` closes source failure lifecycle/read proof; `CAP-PRESS-001-FU5` closes receipt artifact/feed/report join proof; `CAP-PRESS-001-FU6` closes row receipt disambiguation proof; `TASK-007` closes key canonicalization and same-key generation proof | `implemented-current-matrix` | `proven-current-matrix` |
| `IE-03` | companion bundle lane | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` | form impl/fields/artifacts | companion authoring + selector primitive + scenario trial | `implemented` | `proven` |
| `IE-04` | evidence envelope | `CAP-09`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` | form artifacts/errors、core verification | reason contract + startup report + host explain proofs + CAP-15 final submit linkage bridge + FU5 receipt artifact/feed/report join proof | `implemented` | `proven` |
| `IE-05` | row identity lifecycle | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23` | form rowid/arrays/fields | row identity + cleanup proofs | `implemented` | `proven` |
| `IE-06` | host projection gate | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26` | `packages/logix-react/src/FormProjection.ts` | selector recipe tests | `implemented` | `proven` |
| `IE-07` | scenario execution carrier | `VOB-01`, `VOB-03`, `CAP-18` | core verification/trial | startup report shell + `TRACE-S4` carrier law + minimal `VOB-01` review record + first internal feed contract evidence + runtime-owned producer helper evidence + row-scoped narrowing evidence + Form-state reasonSlot evidence + Form-artifact bundlePatch evidence + compaction review + bundlePatchRef constructor-law record + route-consumption record + compiled-plan carrier record + compiled-plan fixture adapter record + verification artifact lifecycle review + expectation evaluator record + `SURF-002` promotion-readiness review + CAP-15 final submit linkage bridge + FU5 receipt artifact/feed/report join proof | `implemented` | `proven` |
| `IE-08` | compare/perf admissibility gate | `VOB-02` | core compare / perf artifacts | compare + perf admissibility evidence; root compare productization remains separate | `partial` | `proven-for-admissibility` |

## Collision Ledger

| collision id | involved caps / projections | decision question | owner | status | close predicate | required proof | surviving alternatives | blocked candidate | reopen bar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `COL-01` | `PROJ-02`, `PROJ-03`, `CAP-05`, `CAP-10` | remote fact 与 local soft fact 是否需要同一 API lane | `13 / specs/155` | `closed` | source lane 与 field-local soft fact lane 可分别覆盖 `SC-B / SC-C` | `PF-02`, `PF-03` | source-only、companion-only | source absorbs companion | `SC-C` 无法由 source + local soft fact 组合覆盖 |
| `COL-02` | `PROJ-03`, `PROJ-04`, `CAP-10`, `CAP-14` | local soft fact 是否承接最终互斥裁决 | `13 / specs/155` | `closed` | companion lane 只输出 soft fact，final truth 继续由 rule/submit lane 承接 | `PF-03`, `PF-04` | companion-final, rule-only | companion final truth | final constraint 必须读取 companion internal landing path |
| `COL-03` | `PROJ-03`, `PROJ-05`, `CAP-10`, `CAP-19..23` | row-heavy 是否逼出 list/root soft fact lane | `08 / specs/157` | `closed` | field-local lane 在 reorder/replace/byRowId/cleanup 下保持 owner binding | `PF-05`, `PF-06` | field-only, list/root reopen | list/root companion baseline | irreducible roster-level soft fact 出现 |
| `COL-04` | `PROJ-05`, `PROJ-06`, `CAP-21`, `CAP-25` | byRowId 是否需要第二 read family | `runtime/10 / 13` | `closed` | selector gate 能消费 row owner projection，无 raw path | `PF-05`, `PF-07` | selector-only, byRowId read carrier | second host family | selector route 无法稳定消费 row owner |
| `COL-05` | `PROJ-06`, `PROJ-07`, `CAP-17`, `CAP-18`, `VOB-03` | diagnostics helper 与 report materializer 是否分叉 | `runtime/09 / runtime/10` | `closed` | UI/Agent/trial/report 都读取同一 evidence envelope | `PF-07`, `PF-08` | materialized report, helper-only | second report truth | UI/Agent/trial 需要不同 reason object |
| `COL-06` | `PROJ-02`, `PROJ-03`, `CAP-12` | candidates 是否被误读为 remote options API | `13 / specs/155` | `closed` | remote options 来自 source，candidates 只是 local projection | `PF-02`, `PF-03` | source options, candidates as skeleton | candidates remote IO | candidates 需要 remote IO |
| `COL-07` | `PROJ-07`, `VOB-02` | perf evidence 是否反向污染 correctness truth | `runtime/09` | `closed` | benchmark 只消费 proof whitelist，不回流 authoring | `PF-09` | perf gate as correctness, correctness-only | benchmark truth | perf gate 需要改 correctness verdict |
| `COL-08` | `PROJ-03`, `CAP-10` | field-local soft fact lane 的 public spelling 是否影响 capability decomposition | `09 / 13 / specs/155` | `closed` | spelling challenger 只进入 exact authority，不改 `CAP-10..13` decomposition | `PF-03` | companion, fact, no-public-companion | spelling-as-capability | spelling 变化要求新增 capability |

## Proof Harness Pack

| proof id | caps / vobs proven | scenario ids | fixture id | command / gate | expected evidence fields | gate_status | freshness rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PF-01` | `CAP-01`, `CAP-02`, `CAP-03`, `CAP-04`, `CAP-24`, `CAP-25` | `SC-A` | `quick-start-form` | targeted form tests + quick-start route smoke | declaration id、submitAttempt、selector projection | `executable` | rerun when declaration / submit / host route changes |
| `PF-02` | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` | `SC-B` | `source-stale-submit` | source authoring / stale submit / submitImpact tests | sourceReceiptRef、task key hash、pending/stale、blocked-by | `executable` | rerun when source task substrate changes |
| `PF-03` | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13` | `SC-C` | `companion-options-clear-bundle` | companion authoring + selector primitive proof + demo matrix contract | companion bundle ref、availability、candidates、selector read | `executable` | rerun when sanctioned companion selector primitive changes |
| `PF-04` | `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17` | `SC-D` | `cross-row-rule-submit-backlink` | final-truth state proof bundle + final submit linkage bridge | reasonSlotId、row subjectRef、submitAttempt backlink、scenario carrier feed bridge | `executable` | rerun when rule/submit/reason lowering changes |
| `PF-05` | `CAP-19`, `CAP-20`, `CAP-21` | `SC-E` | `row-reorder-byRowId` | row identity projection proof | canonicalRowIdChainDigest、ownerRef、transition | `executable` | rerun when row identity or fieldArray ops change |
| `PF-06` | `CAP-22`, `CAP-23`, `CAP-17` | `SC-E` | `row-replace-active-exit-cleanup` | cleanup / row-heavy proof | noLiveHead、cleanup receipt、staleRef、nested ownerRef | `executable` | rerun when cleanup or nested remap changes |
| `PF-07` | `CAP-13`, `CAP-24`, `CAP-25`, `CAP-26` | `SC-F` | `host-selector-gate` | React selector contract tests | handle id、selector output、helper classification | `executable` | rerun when host projection changes |
| `PF-08` | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18`, `VOB-01`, `VOB-03` | `SC-C`, `SC-D`, `SC-E`, `SC-F` | `scenario-trial-evidence-feed` | startup report floor + scenario carrier feed + FU5 receipt artifact/feed/report join | artifact `sourceRef / reasonSourceRef / sourceReceiptRef / keyHashRef / bundlePatchPath` stays internal; feed exposes `bundlePatchRef / reasonSlotId / ownerRef / transition / retention / canonicalRowIdChainDigest`; report links through `artifacts[] + focusRef + relatedArtifactOutputKeys` | `executable` | rerun when verification carrier, report shell, or evidence contract artifact changes |
| `PF-09` | `VOB-02` | `SC-F` | `benchmark-admissible-subset` | compare/perf admissibility proof | compiledPlanDigest、fixtureIdentityDigest、evidenceDigest、environmentFingerprint、correctnessVerdict=`not-owned` | `executable` | rerun when compare/perf gate changes |

## Agent Proposal Delta Contract

任何 sub-agent 拆 API、internal enabler 或 proof harness 时，必须输出下面字段。缺任一字段的 proposal 不进入 synthesis。

| field | required content |
| --- | --- |
| `claimed_caps` | 方案声称覆盖的 `CAP-* / VOB-*` |
| `excluded_caps` | 明确不覆盖的 `CAP-* / VOB-*` |
| `scenario_coverage` | 由 claimed caps 推导出的 `SC-*` 覆盖 |
| `projection_delta` | 新增、修改、删除的 `PROJ-*` |
| `enabler_delta` | 新增、修改、删除的 `IE-*` |
| `collision_delta` | 新增、关闭、重开或拒绝的 `COL-*` |
| `proof_delta` | 新增、修改、删除的 `PF-*` |
| `status_delta` | `planning_status / implementation_status / proof_status / projection_status / collision_status / gate_status` 的变更 |
| `boundary_impact` | 是否触碰 authoring、runtime、host、verification、docs 边界 |
| `authority_touchpoints` | 是否需要回写 `05 / 09 / 13 / runtime/09 / runtime/10 / specs/155` |
| `dominance_delta` | 按 `concept-count / public-surface / compat-budget / migration-cost / proof-strength / future-headroom` 给出评分 |
| `assumptions` | proposal 成立依赖的假设 |
| `non_claims` | 明确不冻结的 exact noun、import shape、helper placement、runtime object |
| `rejected_alternatives` | 被比较后拒绝的替代方案与拒绝理由 |
| `adoption_request` | `none`, `projection-baseline`, `authority-writeback`, `proof-wave` |
| `residual_risks` | 未闭合风险与建议下一轮 |

## Adoption / Freeze Gate

本页只能冻结 planning projection，不能冻结 exact surface。

一个 `PROJ-*` 若要从 `under-pressure` 进入 `baseline`，必须同时满足：

1. `claimed_caps` 覆盖对应 `SC-*` 所需能力，无 unexplained gap
2. 涉及的 `COL-*` 为 `closed`，或 open collision 有明确 `close predicate` 与下一轮 owner
3. 对应 `PF-*` 至少达到 `planned`，核心路径必须达到 `executable` 或记录 blocker
4. `authority_target` 明确，且 exact surface 变更只在 owner authority 文件里发生
5. `dominance_delta` 在 `proof-strength` 或 `future-headroom` 上严格改进，且不恶化 `public-surface`

采用记录必须写：

| field | content |
| --- | --- |
| `adopted_projection` | `PROJ-*` id |
| `frozen_decision` | 本页冻结的 planning decision |
| `authority_writeback_required` | required / not-required |
| `closed_collisions` | `COL-*` ids |
| `rejected_alternatives` | 替代方案与拒绝理由 |
| `proof_obligations` | `PF-* / VOB-*` ids |
| `remaining_risks` | residual risk |
| `reopen_bar` | 重开条件 |

## Global Closure Record

| field | value |
| --- | --- |
| closure_id | `2026-04-24-global-api-shape-closure-gate-after-pf-09` |
| status | `passed-planning-scope` |
| covered_scenarios | `SC-A..SC-F` |
| covered_caps | `CAP-01..CAP-26`, `VOB-01..VOB-03` |
| projection_state | `PROJ-01..PROJ-07 baseline for current matrix scope` |
| frozen_shape | [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md) |
| implementation_follow_up | `CONV-001 / IMP-001..IMP-006` |
| residual_non_claims | final verification experiment vocabulary, broader remote source variant productization beyond current `IE-02` proof, root compare productization beyond frozen control-plane stage |

## Loop-1 Contract

第一轮只做 capability decomposition 与 planning harness closure，不开始实现。

| item | contract |
| --- | --- |
| objective | 验证 `CAP-* / VOB-*` 集合是否足以覆盖 `SC-A..SC-F`，并找出当前 projection / collision / proof gaps |
| deliverable | 本页 capability catalog、scenario decomposition、projection ledger、internal enabler、collision ledger、proof harness、agent delta contract、adoption gate |
| validation | `plan-optimality-loop` converge 后无 blocker unresolved finding |
| done evidence | review ledger 写入 `docs/review-plan/runs/`，本页与 README / `06` 回链完成 |
| out of scope | exact public surface freeze、runtime implementation、new package API |

## Expansion Rails

- Rail 1: 从 `CAP-*` proof gap 推导下一轮 proof-wave
- Rail 2: 从 `COL-*` open item 推导多 Agent collision review
- Rail 3: 从 `PROJ-*` under-pressure item 推导 API planning candidate
- Rail 4: 若新增场景，先改 `06`，再重跑本页 decomposition

## 当前一句话结论

后续 Form API 设计继续从 `06` 的 `SC-*` 拆出单 owner、可验证的 `CAP-*`，再经 `PROJ-* / IE-* / COL-* / PF-* / VOB-*` 形成可并行、可碰撞、可冻结的规划闭环；当前 `SC-A..SC-F` 已通过 planning-level closure，并已汇总到 [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)。root compare productization 仍进入后续 authority intake；`IE-02` source substrate 在 current matrix proof 范围内已闭合。
