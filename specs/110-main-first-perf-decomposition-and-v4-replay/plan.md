# Implementation Plan: Main-first 性能控制线与 v4 replay 主路线

**Branch**: `110-main-first-perf-decomposition-and-v4-replay` | **Date**: 2026-03-27 | **Spec**: `specs/110-main-first-perf-decomposition-and-v4-replay/spec.md`
**Input**: Feature specification from `/specs/110-main-first-perf-decomposition-and-v4-replay/spec.md`

## Summary

本计划把当前 perf 主线固化为一条控制面路线：

- `main` 先做收益鉴定与切口筛选
- `v4-perf` 只接收已证实的 accepted cut
- replay 后如果 `v4-perf` 仍落后 `main`，剩余差额统一归入 residual attribution
- 所有升级都遵守 `cheap local -> focused local -> heavier local -> PR/CI last`

另外，本 plan 要把 `110` 从“路线说明”补成“主控规格”：

- 维护最新 Branch Ledger
- 维护 Current Progress Snapshot
- 维护 live decision ledger / residual latest / current next actions
- 维护 Cut Decision Record Format 与 promotion / handoff 协议

## Cross-Spec Boundaries

- `110`：唯一主控 spec，负责 route、ledgers、promotion gate、`110 -> 111` handoff。
- `111`：后续系统性方向，只能消费 `110` 的 latest ledger 与 residual latest，在 `main` 控制线上先做 shadow / PoC。
- `013-auto-converge-planner`：当前 `field:converge` 契约与 schema baseline。`111` 必须在其基础上增量扩展。
- `v4-perf` worktree 的 `103-effect-v4-forward-cutover`：保留为 dated artifacts / replay / residual 工件池，`110` 只维护 latest pointer 与 route 裁决。

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: effect v3、@logixjs/core、@logixjs/react、pnpm workspace
**Storage**: 文件系统规格与 perf 工件
**Testing**: Vitest、browser perf collect、PerfDiff
**Target Platform**: Node.js 22 + Chromium browser perf harness
**Project Type**: pnpm workspace / packages + specs
**Performance Goals**: 提高性能主线路线的可解释性和可复用性，减少错误 replay
**Constraints**: 不打断当前 perf 主线；不让 `v4-perf` 在无硬证据前重新成为最终母线
**Scale/Scope**: 覆盖 `main` 本体、`main.v3-*` 控制实验线、`v4-perf` replay 策略与 accepted cut 管理

## Constitution Check

- Intent -> Flow -> Code -> Runtime：`110` 不直接改 runtime 语义，但它负责把热路径 cut 的 route、证据门与 replay 次序收敛为唯一控制面。
- docs-first：`spec.md` 持有 live status / ledgers / next actions，`plan.md` 持有治理协议，`tasks.md` 持有当前任务包；`111` 与后续实现都只能消费这里的 route contract。
- Contracts / IR / stable ids：`110` 本身不引入新的 runtime contract、IR、稳定标识或 transaction boundary 变化；任何被 promoted 的 runtime cut 仍要回到对应实现 spec / runtime SSoT 落盘。
- Transaction boundary / React consistency：本特性无代码变更，视为 N/A；一旦后续 cut 触及这些边界，accepted gate 前必须在 member spec 中回答。
- Performance budget：唯一 promotion 梯度是 `cheap local -> focused local -> heavier local -> PR/CI last`；`accepted_with_evidence` 至少要求 focused same-node hard diff `regressions=0`。
- Diagnosability cost：`110` 只复用现有 dated reading / perf diff / trace evidence，不新增运行时事件成本；`111` 的任何新增 telemetry 都要单列开销预算。
- Breaking changes / migration：route、branch role、replay 规则如果改变，必须同步更新 `110/111` 与相关主线 spec，不保留兼容口径。
- Quality gates：本次回写需保持 spec/plan/tasks 一致；后续任何被 promoted 的 runtime cut 仍要通过 `pnpm typecheck`、`pnpm lint`、`pnpm test` 与对应 perf evidence。

## Roles

### Main Base

- 路径：`/Users/yoyo/Documents/code/personal/logix`
- 角色：fresh main baseline / truthful compare baseline
- 规则：保持干净，只承接 fresh baseline collect

### Main Perf Experiment Lines

- 典型路径：
  - `main.v3-best-replay7`
  - `main.v3-postcommit-replay8`
  - `main.v3-combined-replay9`
- 角色：收益鉴定与切口实验
- 当前最强候选：`main.v3-combined-replay9`

### v4 Replay / Residual

- 典型路径：
  - `v4-perf`
  - `v4-perf.converge-tax-debug`
- 角色：accepted cut replay、`Effect v4` 与 browser residual 归因

## Source Of Truth Allocation

- `spec.md`：live status、decision ledger、residual latest、current next actions、route exit criteria。
- `plan.md`：promotion protocol、maintenance rules、handoff contract、quality / constitution gates。
- `tasks.md`：当前任务包与并行拆分入口。
- 其他 dated readings / perf artifacts：只做证据工件，不承担主控裁决。

## Current Best Candidate Context

本节只保留上下文摘要。最新事实以 `spec.md` 的 `Current Progress Snapshot` 与 `Control-Line Decision Ledger` 为准。

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-combined-replay9`
- **Branch**: `agent/main-v3-combined-replay9-20260327`
- **Current status**:
  - correctness 门通过
  - focused same-node evidence 最强
  - `steps=200/400/1600/2000` focused same-node 都已拿到硬改善证据
  - full same-day soak 仍会被高 dirty `auto<=full` 相对阈值拖住
- **Interpretation**:
  - shared fixed tax 主问题已被明显压下
  - remaining issue 更像 auto planner / full-suite progression 的 residual

## Evidence Maintenance Rules

### Evidence Anchor Refresh

发生以下任一情况时，必须刷新 `110` 的 `Current Evidence Anchors`：

- current best candidate code line 变化
- focused best evidence 被新的 same-node 工件替代
- full hard diff 被新的 fresh baseline 替代
- harness/controller dated reading 被新的 reading 替代

### Stable Pointer Rule

- `spec.md` 的 `Current Evidence Anchors` 是唯一 latest pointer。
- `plan.md` 不复制 dated artifact 清单，只定义刷新协议与指针语义。
- 每次 evidence 更新时：
  1. 先替换 `spec.md` 中对应类别的 latest pointer；
  2. 再更新 ledger / residual latest / next actions；
  3. dated artifact 继续保留在原始 perf 工件目录。

## Master-Control Maintenance Rules

### What 110 Must Always Contain

`110` 必须长期保持以下信息为最新状态：

1. `Current Progress Snapshot`
2. `Current Branch Ledger`
3. `Current Evidence Anchors`
4. `Control-Line Decision Ledger`
5. `Residual Pool Latest`
6. `Current Next Actions`
7. `Cut Decision Record Format`
8. `Route Promotion Protocol`
9. `110 -> 111 Interface`
10. `Route Exit Criteria`

### Update Triggers

出现以下任一情况时，必须更新 `110`：

- 当前最强候选 changed
- 某条 cut 从 provisional 升级为 accepted
- 某条 cut 被 discarded
- 某条 cut 的 replay readiness 或 full status 变化
- remaining residual 的 leading hypothesis 变化
- `v4-perf` 的角色发生变化
- 新增一个长期存在的实验线 / replay 线 / residual 线

### What 110 Does Not Hold

- 不保存每个 dated perf artifact 的细节表
- 不替代 `103` 的全仓迁移主线
- 不替代 `111` 的 adaptive controller 设计细节
- 不承接一次性调试过程日志

### Minimal Update Protocol

后续每次重要 perf 会话结束后，至少做这 5 步：

1. 更新 `Current Progress Snapshot`
2. 如 current best candidate 变化，更新 `Current Evidence Anchors` 与 decision ledger
3. 更新 `Residual Pool Latest` 与 `Current Next Actions`
4. 如 `111` 的进入门发生变化，回写 `110 -> 111 Interface`
5. 将新增 cut 追加到 accepted/provisional/discarded ledger 或对应 reading

## Accepted / Provisional / Discarded

### accepted_with_evidence

- fresh same-node baseline
- `comparability=true`
- focused hard diff `regressions=0`
- correctness 门通过
- 有 dated reading 说明适用面与风险边界

### provisional

- quick/triage 有收益
- 或 focused 过线但 full long-run 仍未解释清楚
- 可以保留在控制线，不允许直接 replay

### discarded

- correctness 门失败
- hard diff 明显 regression
- 或收益不稳定且不值得继续投入

## Decision Record Protocol

后续每条 cut 在被讨论完后，至少应补一条结构化记录，包含：

- `cutId`
- `line`: `main_control | v4_replay | residual_only`
- `candidatePath`
- `candidateBranch`
- `decision`
- `before/after/diff`
- `evidenceTier`
- `replayReadiness`
- `fullStatus`
- `residual category`

如当前阶段不做单独 ledger 文件，至少要把它追加到 `110` 或对应 dated reading 中，并能从 `110` 追到。

## Route Promotion Protocol

### Stage 0 - Cheap Local First

- 目标：快速验证方向，缩小下一刀。
- 典型手段：focused quick、node bench、小范围 rerun、probe reading。
- 输出：hypothesis、疑点、下一条 targeted verify。
- 禁区：不得宣布 accepted，不得推进 replay / PR / CI。

### Stage 1 - Focused Local Hard Evidence

- 目标：给 cut 打主裁决。
- 最小门：fresh same-node before/after/diff + correctness gate + dated reading。
- 最小覆盖：`steps=200` 与当前主热点区间。
- 允许升级：只有这一层可以把 cut 升成 `accepted_with_evidence`。

### Stage 2 - Heavier Local Confirmation

- 目标：判断 replay readiness、fullStatus、residualCategory。
- 典型手段：full same-node soak、高 dirty targeted rerun、browser long-run / suite progression probe。
- 输出：是否允许 replay，以及 remaining residual 是否还指向 controller 类别。

### Stage 3 - PR / CI Last

- 进入门：Stage 1 / 2 已稳定，且已写明本次 CI 的目标、目标分支 / PR、期望工件。
- 合法目标：correctness verify、heavier perf collect、指定 replay verify。
- 固定规则：CI 不能充当第一道收益鉴定器。

## 111 Handoff Contract

- `111` 的 design / shadow / PoC 只能挂在 `main` 控制线语义下推进。
- `111` 的输入工件固定为：current best candidate anchor、decision ledger、residual latest、same-node evidence anchors。
- `111` 的 shadow entry gate 固定为：
  1. decision ledger 已更新；
  2. current best cut 已是 `accepted_with_evidence`；
  3. 当前 entry decision 至少达到 `inconclusive_after_clean_scout`；
  4. cheap local 的 static heuristic 漂移盘点已经完成。
- `111` 的 live candidate gate 固定为：
  1. shadow-only cheap local 与 heavier local gate 已完成；
  2. future residual refresh 仍稳定指向 controller 相关问题；
  3. shadow telemetry 继续保持 additive，且 live `executedMode` 语义未变。
- `111` 的禁止动作固定为：
  - 跳过 accepted ledger 直接宣布主线变更；
  - 把 `v4-perf` 当收益鉴定线；
  - 在本地证据不稳定时直接申请 PR / CI。

## Perf Evidence Plan

- Stage 0：cheap local 只做 hypothesis，不做 accepted 判门
- Stage 1：控制线 accepted 门 = focused same-node diff `regressions=0`
- Stage 2：replay 门 = replay 前先拿到 heavier local 的 replay readiness / residual category
- Stage 2：residual 门 = replay 后若仍落后 `main`，必须补 residual reading
- Stage 3：PR / CI 只能在本地结论稳定后运行，并事先声明是 correctness verify、gain verify 还是 deeper perf collect

## Structure

```text
specs/110-main-first-perf-decomposition-and-v4-replay/
├── spec.md
├── plan.md
└── tasks.md

specs/111-adaptive-auto-converge-controller/
├── spec.md
├── plan.md
└── tasks.md
```

## Completion Rule

本计划完成的标准不是“性能问题已经解决”，而是：

1. 主线路线、角色分工、decision ledger、promotion protocol、`110 -> 111` handoff 已写成可持续维护的 spec
2. 后续会话无需依赖聊天上下文也能恢复当前主线路线
3. `110` 已能充当“最终目标达成前的唯一主控”
