---
title: Plan Optimality Loop Universal Review Contract
status: proposed
version: 2
---

# Plan Optimality Loop Universal Review Contract

## 目标

把 `$plan-optimality-loop` 扩成同时覆盖 implementation plan 与 SSoT contract 的通用规划工件 review skill，同时保持现有 reviewer 人格、多 sub-agent 主链路、五阶段 workflow 与单一 review ledger 不变。

本轮只冻结 phase 1 contract，不开始改 skill 实现。

## 当前要守住的内核

后续优化不能破坏这些单点权威：

- reviewer 人格与多 sub-agent 主链路
- `bootstrap -> challenge -> synthesize -> freeze -> converge`
- kernel council
- dominance axes
- stop rule
- reopen bar
- 单一 review ledger

本轮优化对象只有三件事：

- 如何识别工件
- 如何把输入归一化成单一可审对象
- 如何在不分叉 workflow 的前提下，覆盖不同类型的规划工件

## phase 1 核心判断

phase 1 不追求“一次性列全所有模式”。
phase 1 只冻结双 mode 内核：

- `implementation-plan`
- `ssot-contract`

`doc-family-closure` 与 `zero-unresolved-audit` 都不再作为一等 mode。
它们由：

- `review_goal`
- `review_object_manifest`
- derived legality matrix

共同表达。

## 顶层 public contract

phase 1 只保留四个核心输入：

- `artifact_kind`
- `review_goal`
- `target_claim`
- `target_refs`

其中：

- `artifact_kind`
  - `implementation-plan`
  - `ssot-contract`
- `review_goal`
  - `design-closure`
  - `implementation-ready`
  - `zero-unresolved`
- `target_refs`
  - 可是单文件
  - 可是一组文件
  - 可是聊天里的 inline 文本

除这四项以外，其余都不作为 phase 1 的 public 必填输入。

## 单一 review_object_manifest

所有 review 都必须先归一化成一份 `review_object_manifest`。
这是 phase 1 最关键的新增对象。

它至少绑定：

- `source_inputs`
- `materialized_targets`
- `authority_target`
- `bound_docs`
- `derived_scope`
- `allowed_classes`
- `blocker_classes`
- `ledger_target`

含义：

- reviewer 只审 `review_object_manifest`
- 主 agent 只按 `authority_target` 回写事实
- ledger 只按 `ledger_target` 落盘

这样 review 对象、authority 对象、ledger 对象三者不再错位。

## preflight / postflight wrapper

phase 1 不改五阶段 workflow。
它只允许在五阶段外侧增加轻量 wrapper。

### preflight

`recognize / normalize / materialize` 全部收进 bootstrap 前的 preflight wrapper。

规则：

- 文件输入默认走 identity path
- inline 输入只在需要稳定对象时 materialize
- materialize 完成后必须冻结成 `review_object_manifest`

### postflight

`ledger-normalize` 不进入 phase vocabulary。
它只作为写后 housekeeping 存在。

所以公开 workflow 继续只承认：

- `bootstrap`
- `challenge`
- `synthesize`
- `freeze`
- `converge`

## derived legality matrix

phase 1 不暴露独立的 policy 开关，不暴露独立 lens 开关。
这些都改成由 `artifact_kind x review_goal` 派生的 legality matrix。

matrix 至少产出：

- 正文里哪些对象合法
- 哪些对象出现就算 blocker
- reviewer 默认强调什么
- cross-ref 是否必须同步

### A. `implementation-plan`

#### `design-closure`

- 合法：
  - task
  - dependency
  - risk
  - rollback
  - verification backlog
- 主查：
  - 目标函数
  - 任务边界
  - 依赖顺序

#### `implementation-ready`

- 合法：
  - wave
  - task
  - dependency
  - rollback
  - verification backlog
- 主查：
  - 执行顺序
  - 粒度
  - 验证门
  - 回滚面

#### `zero-unresolved`

- 合法：
  - residual risk
  - final gate
- blocker：
  - 活的任务歧义
  - 未绑定的依赖
  - 未封口的验证门

### B. `ssot-contract`

#### `design-closure`

- 合法：
  - frozen contract
  - current snapshot
  - closed mapping
  - canonical proof slices
- blocker：
  - living gap
  - direction page
  - planning queue
  - open assumptions
  - proof backlog
- 主查：
  - 单点 authority
  - 词表闭合
  - 页面角色纯度
  - 第二系统

#### `implementation-ready`

- 合法：
  - frozen contract
  - implementation handoff boundary
  - acceptance proof contract
- blocker：
  - 活的规划锚点
  - 未闭合的 cross-ref
  - 同一对象多重 authority

#### `zero-unresolved`

- 合法：
  - frozen contract
  - closure boundary
  - single review ledger conclusion
- blocker：
  - living planning anchor
  - 旧词表残留
  - 假 closed
  - stale ledger

## non_default_overrides

phase 1 只允许非常小的 override 面。

只记录：

- `non_default_overrides`

每个 override 都必须说明：

- 为什么默认 legality matrix 不够
- 不这样做会造成什么 blocker
- 它影响哪类 reviewer 判断

没有显式 override，就一律按派生 matrix 执行。

## 单一 review ledger

phase 1 继续只允许一份 review ledger。

不新增：

- `drift ledger mode`
- `closure ledger mode`
- `bound ledger mode`

若需要支持文档组闭环，做法只有两个：

1. `review_object_manifest` 里记录多目标关系
2. ledger schema 在单一 ledger 内扩充 `review_contract` 与 `targets[]`

review ledger 仍只负责：

- 当前有效事实
- adoption
- consensus
- residual risk

它不升级成第二套目标工件体系。

## 归一化落点

默认 materialize 落点规则：

- `implementation-plan`
  - 优先落到 `plan.md / tasks.md`
- `ssot-contract`
  - 优先落到单页 contract 文档
- 多文件输入
  - 进入 `review_object_manifest.materialized_targets`
- `zero-unresolved`
  - 只在单一 review ledger 内新增 closure 结论或相关字段记录，不新增第二 workflow、第二 ledger

## 非目标

- 不拆 skill
- 不改 reviewer 人格体系
- 不改五阶段 workflow
- 不把 code review、PR 收口、CI 排障塞进这个 skill
- 不在 phase 1 冻结更多 mode

## 采用门槛

phase 1 只有在同时满足下面条件时，才进入 adopted freeze：

1. 双 mode 内核已足够覆盖 implementation plan 与 SSoT contract
2. `review_object_manifest` 已把 review 对象、authority 对象、ledger 对象绑定成单一闭环
3. 五阶段 workflow 继续是唯一公开 workflow
4. review ledger 继续只有一份
5. derived legality matrix 足以消化 `doc-family` 与 `zero-unresolved` 需求，不需要再升格成一等 mode

## 当前一句话结论

`$plan-optimality-loop` 的 phase 1 正确方向，是保持一个 skill、五阶段 workflow、单一 review ledger不变，只冻结 `implementation-plan + ssot-contract` 双 mode 内核，再用 `review_goal + review_object_manifest + derived legality matrix` 覆盖文档族闭环与 zero-unresolved 收口。
