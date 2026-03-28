# Feature Specification: Main-first 性能控制线与 v4 replay 主路线

**Feature Branch**: `110-main-first-perf-decomposition-and-v4-replay`  
**Created**: 2026-03-27  
**Status**: Active  
**Input**: 用户裁决：性能主线先以 `main` 做收益控制线，先把每个性能点在 `main` 上拆开验证，再把仅有硬证据的正收益 cut replay 到 `v4-perf`，最后再判断 `v4` 剩余差额。

## Background

当前 perf 主线已经拆成两类问题：

- `main` 上可复现、可做收益鉴定的 shared hot path / bookkeeping / post-commit observation 问题
- `v4-perf` 上才会出现的 replay residual，包括 `Effect v4`、browser-only 路径和 suite interaction

如果继续直接在 `v4-perf` 上把所有试刀混在一起，会重复遇到“收益真伪”和“v4 residual”难以分离的问题。

## Goals

1. 固化 `main` 控制线优先、`v4-perf` replay 次之的长期路线。
2. 固化 accepted / provisional / discarded 三分法。
3. 固化 branch / worktree 的职责边界。
4. 为后续 replay 到 `v4-perf` 提供明确准入门。
5. 为 `adaptive auto-converge controller` 这类系统性方案提供上层路线约束。

## Current Progress Snapshot _(mandatory)_

本节是 `110` 作为主控 spec 的核心状态页。后续任何会话恢复现状时，优先读这里。

### 当前总目标

- 大目标仍是：让 `v4-perf` 在同机 fresh baseline 下，至少不比 `main` 差。
- 当前主策略是：
  - 先在 `main` 控制线验证每条性能 cut 的收益真伪；
  - 只把 `accepted_with_evidence` 的 cut replay 到 `v4-perf`；
  - replay 之后若 `v4-perf` 仍落后 `main`，剩余差额统一记入 residual 池。

### 当前最强控制线候选

- 当前最强候选工作区：`/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-combined-replay9-cutA`
- 当前最强候选分支：`agent/main-v3-combined-replay9-cutA-20260328`
- 当前最强候选的关键改动面：
  - `runtimeStore` live resolution / cache
  - corrected `shouldObservePostCommit`
- 当前 focused same-node 结论：
  - `steps=200` 过线
  - `steps=1600/2000` 过线
  - `steps=400` focused 复核过线
  - `steps=800 @ dirtyRootsRatio=0.7/0.75/0.8` focused 复核过线
- 当前 full same-node 结论：
  - `Cut A` 的 heavier-local 复核已把 `steps=1600,2000 × dirtyRootsRatio=0.7/0.75/0.8` 全部带回门内
  - 当前 remaining residual 不再由 mixed `replay9` 承担主候选解释
  - `Cut A` 在 `v4` 侧只形成 `partial positive`
  - `E-1B browser long-run capture-order sensitivity` clean docs-only scout 已完成，当前 route classification 为 `inconclusive_after_clean_scout`
  - `111` 已具备 isolated shadow-only code PoC 候选，shadow cheap-local gate 已通过，当前下一步切到 heavier local veto gate，`live_candidate` 继续 blocked

### 当前 v4 最小 closeout 候选

- 当前最强最小 closeout 工作区：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.tx-c1-clean-candidate.run1`
- 当前最强最小 closeout 分支：`agent/v4-perf-tx-c1-clean-candidate-20260328`
- 当前最强最小 closeout 边界：
  - `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- 当前本地可比结论：
  - focused node validate 已通过
  - comparable browser subset soak 已恢复 `comparable=true / regressions=0 / budgetViolations=0`
  - 当前状态为 `local_closeout_ready`

### 当前不该再做的事情

- 不再把 `v4-perf` 当作收益鉴定主线。
- 不在没有 `accepted_with_evidence` 的情况下把新 cut 先迁到 `v4-perf`。
- 不把 focused quick/triage 的局部改善直接宣布成“可以 replay”。

## Route Promotion Protocol _(mandatory)_

### Stage 0 - Cheap Local First

- 目的：快速生成或淘汰假设，不做最终裁决。
- 允许证据：focused quick、node bench、小范围 rerun、本地 probe/reading。
- 输出：仅能产生 hypothesis、疑点清单、下一条 targeted verify。
- 禁止动作：不得把 cut 升级为 `accepted_with_evidence`，不得启动 `v4-perf` replay，不得以此申请 PR / CI。

### Stage 1 - Focused Local Hard Evidence

- 目的：在 `main` 控制线上给单条 cut 打 `accepted_with_evidence | provisional | discarded` 主裁决。
- 必备工件：fresh same-node before/after/diff、correctness gate、dated reading。
- 必备覆盖：`steps=200` 与当前主热点区间都要复核。
- 允许动作：只有这一阶段可以把 cut 升到 `accepted_with_evidence`。

### Stage 2 - Heavier Local Confirmation

- 目的：在主裁决已成立后，继续判断 replay readiness、full 状态与 residual 类别。
- 典型工件：same-node full soak、高 dirty targeted rerun、browser long-run / suite progression probe。
- 输出：`replayReadiness`、`fullStatus`、`residualCategory` 的最新事实。
- 禁止动作：本地结论未稳定前，不得推进 PR / CI。

### Stage 3 - PR / CI Last

- 进入条件：Stage 1 与 Stage 2 已给出稳定本地结论，并且已明确这次 CI 的目标。
- 合法目标：correctness 验证、更重的 perf collect、指定分支或 PR 上的 replay 验证。
- 必须声明：目标分支或 PR、运行目的、期望工件名。
- 强约束：CI 不能充当第一道收益鉴定器。

## Replay Checklist _(mandatory)_

只有同时满足以下条件，某条 cut 才允许进入 `v4-perf` replay：

1. `decision=accepted_with_evidence`
2. `evidenceTier` 至少达到 `focused_local`
3. `replayReadiness=replay_ready`
4. 最新 before / after / diff / dated reading 已写回 `110`
5. 已声明目标 replay 分支或 PR，以及 replay 后立即对比的 fresh main baseline

## Residual Checklist _(mandatory)_

以下条件同时满足时，某个问题才允许被登记为 residual，而不是继续阻塞 cut 真伪：

1. 当前 cut 的主裁决已经稳定
2. 仍存在相对 `main` 的稳定差额
3. 最新 diff / reading 路径已写回 `110`
4. 已完成 residualCategory 归类
5. 已写明下一条 targeted verify，或写明它是 `111` 的允许输入

## Current Branch Ledger _(mandatory)_

### 1. Baseline Base

- **Path**: `/Users/yoyo/Documents/code/personal/logix`
- **Branch**: `main`
- **Role**: fresh main baseline / truthful compare base
- **Writable**: 仅用于 fresh baseline collect、spec 文档、路线治理
- **Do Not**: 不在此直接做 runtime 实验改动

### 2. Route & Planning Base

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/main.perf-route-and-adaptive-specs`
- **Branch**: `agent/main-perf-route-and-adaptive-specs-20260327`
- **Role**: `110/111` 规格事实源
- **Writable**: 路线 spec、controller 规划、后续主控文档
- **Do Not**: 不在此直接做 perf hot-path 实现试刀

### 3. Control Experiment: replay7

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-best-replay7`
- **Branch**: `agent/main-v3-best-replay7-20260327`
- **Role**: `StateTransaction` dirty snapshot bookkeeping cut 的独立控制线
- **State**: focused 1600/2000 summary 级无硬 regression，但 mixed pockets 明显
- **Decision**: 当前 `provisional`，`replayReadiness=blocked`

### 4. Control Experiment: replay8

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-postcommit-replay8`
- **Branch**: `agent/main-v3-postcommit-replay8-20260327`
- **Role**: dispatch shell / transaction commit shell / post-commit gate 线
- **State**: `steps200` 很强，`1600/2000` 有 pocket
- **Decision**: 当前 `provisional`，`replayReadiness=blocked`

### 5. Control Experiment: replay9 / mixed source

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-combined-replay9`
- **Branch**: `agent/main-v3-combined-replay9-20260327`
- **Role**: mixed worktree / decomposition source
- **State**:
  - 包含 `Cut A`、`Cut B` 与测试支撑改动
  - 不再适合作为正式 accepted candidate 的唯一载体
- **Decision**: 当前 `provisional`，仅保留为 decomposition source

### 6. Control Experiment: replay9 Cut A / current best

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-combined-replay9-cutA`
- **Branch**: `agent/main-v3-combined-replay9-cutA-20260328`
- **Role**: 当前唯一 primary candidate
- **State**:
  - single-pocket A/B 已过门
  - heavier-local high-dirty 复核已全点回门
  - 最小 correctness 已通过
- **Decision**: 当前 `accepted_with_evidence`，`replayReadiness=replay_ready`，`fullStatus=not_full_golden`

### 7. Control Experiment: replay9 Cut B / secondary

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-combined-replay9-cutB`
- **Branch**: `agent/main-v3-combined-replay9-cutB-20260328`
- **Role**: secondary candidate / dirty snapshot bookkeeping verify
- **Decision**: 当前 `provisional`，保留为次级候选

### 8. Replay / Residual Motherline

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf`
- **Branch**: `v4-perf`
- **Role**: `v4` 侧收益 replay 与 residual attribution 母线
- **State**: 仍未证明整体不差于 `main`
- **Decision**: 暂不恢复为最终集成母线

### 9. v4 Residual Debug Line

- **Path**: `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug`
- **Branch**: `agent/v4-perf-converge-tax-debug-20260323`
- **Role**: `v4` 专属 residual、browser-only 路径、dated readings 工件池
- **Decision**: 保持为调试与证据线，不承担主实现职责

## Current Evidence Anchors _(mandatory)_

后续任何会话如果需要恢复“当前最好证据”，优先从这里拿路径。

### Latest Pointer Protocol

- 本节自身就是 `110` 的 stable latest pointer，不另起并行真相源。
- 每个类别只保留一个 canonical latest 指针：
  - candidate runtime code anchor
  - current best focused evidence
  - current best full evidence
- dated artifacts 与细节 diff 继续落在原始 perf 工件目录，`110` 只持有“当前最新应读哪一个”的指针。
- 当更强证据出现时，直接就地替换本节指针，同时在 ledger / residual latest 中更新原因与影响。

### Candidate Runtime Code Anchor

- `/Users/yoyo/Documents/code/personal/logix.worktrees/main.v3-combined-replay9-cutA/packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`

### Current Best Focused Evidence

- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.after.main-v3-combined-replay9-live-runtime-store-observe-1600-2000.darwin-arm64.soak.same-node.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.main-1600-2000-vs-main-v3-combined-replay9-live-runtime-store-observe.darwin-arm64.soak.same-node.diff.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.after.main-v3-combined-replay9-live-runtime-store-observe-steps200.darwin-arm64.soak.same-node.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.main-steps200-vs-main-v3-combined-replay9-live-runtime-store-observe.darwin-arm64.soak.same-node.diff.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.before.main-fresh-steps400-8c41a263.darwin-arm64.soak.same-node.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.after.live-runtime-store-observe-steps400.darwin-arm64.soak.same-node.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-converge-steps.after.live-runtime-store-observe-highdirty-desc.darwin-arm64.soak.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.after.main-v3-combined-replay9-highdirty-steps800.darwin-arm64.soak.same-node.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.after.main-v3-combined-replay9-highdirty-1600-2000.darwin-arm64.soak.same-node.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-converge-steps.after.main-v3-combined-replay9-cutA-highdirty-1600-2000.direct.darwin-arm64.soak.same-node.json`

### Current Best Full Evidence

- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.before.main-fresh-same-node-8c41a263.darwin-arm64.soak.full.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.after.live-runtime-store-observe-rerun.darwin-arm64.soak.same-node.full.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-converge-steps.main-full-fresh-vs-live-runtime-store-observe-rerun.darwin-arm64.soak.same-node.diff.json`
- `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-27-main-v3-combined-replay9-harness-probe-reading.md`

## Control-Line Decision Ledger _(mandatory)_

本节是 `110` 的唯一 latest ledger。`plan.md` 只维护更新协议，不重复持有 live ledger。

| cutId | owner line | decision | evidenceTier | replayReadiness | fullStatus | residualCategory | latest status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `replay7-dirty-snapshot-bookkeeping` | `main_control` | `provisional` | `focused_local` | `blocked` | `not_applicable` | `unknown` | focused 1600/2000 summary 级无硬 regression，但 mixed pockets 明显，暂不进入 replay |
| `replay8-postcommit-gate` | `main_control` | `provisional` | `focused_local` | `blocked` | `not_applicable` | `unknown` | `steps200` 强，`1600/2000` 仍有 pocket，适合作为组合基底 |
| `replay9-mixed-worktree` | `main_control` | `provisional` | `heavier_local` | `blocked` | `not_full_golden` | `unknown` | mixed worktree 只保留为 decomposition source，不再作为正式 accepted 候选 |
| `replay9-cutA-runtimeStore-postcommit-gate` | `main_control` | `accepted_with_evidence` | `heavier_local` | `replay_ready` | `not_full_golden` | `suite_progression_or_browser_long_run` | 当前唯一 primary candidate；single-pocket 与 broader high-dirty 复核都已回门 |
| `replay9-cutB-dirty-snapshot-bookkeeping` | `main_control` | `provisional` | `focused_local` | `blocked` | `not_applicable` | `unknown` | secondary candidate；single-pocket 过门，但暂不作为当前默认下一刀 |
| `tx-c1-state-txn-closeout` | `v4_closeout` | `accepted_with_evidence` | `heavier_local` | `not_applicable` | `comparable_subset_green` | `not_controller_signal` | isolated `StateTransaction.ts` closeout 已达到 `local_closeout_ready`，但当前只视为最小 closeout 候选，不外推出整条 `v4` 已收口 |

## Residual Pool Latest _(mandatory)_

- 当前 leading residual：`E-1B browser long-run capture-order sensitivity`。
- 当前最强假设：browser sensitivity 仍存在，但 clean scout 后已不足以单独解释整包 residual；controller attribution 仍待后续 shadow gate 继续判别。
- 当前证据面：以 `Current Best Full Evidence` 中的 fresh baseline diff 与 harness probe reading 为准。
- 当前最新 targeted 补证：
  - `steps=800 @ 0.7/0.75/0.8` 全过门；
  - `steps=1600 @ 0.7/0.75/0.8` 全过门；
  - `steps=2000` 仅 `dirtyRootsRatio=0.7` 仍出现 pocket。
- 当前 dated reading：
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-main-v3-combined-replay9-highdirty-single-pocket-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-main-v3-combined-replay9-cut-decomposition-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-main-v3-combined-replay9-cut-ab-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-main-v3-combined-replay9-cutA-broader-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-main-v3-combined-replay9-cutA-accepted-candidate.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-v4-cutA-single-pocket-not-informative-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-v4-cutA-replay-gate-selection-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-v4-cutA-browser-lowband-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-v4-cutA-lowband-replay-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-v4-cutA-replay-deprioritized-routing-note.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-v4-cutA-highdirty-full-longrun-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.converge-tax-debug/specs/103-effect-v4-forward-cutover/perf/2026-03-28-v4-cutA-highdirty-neighbor-reading.md`
  - `/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf/specs/103-effect-v4-forward-cutover/perf/2026-03-28-e1b-clean-scout-reading.md`
- 当前待证任务：
  - 围绕 `steps=2000 @ dirtyRootsRatio=0.7` 的单刀 A/B 已完成；
  - Cut A 的更宽 heavier-local 复核已完成并全点回门；
  - Cut A 已收口为独立 `accepted_with_evidence` candidate；
  - `Cut B` 暂时降级为 secondary candidate；
  - `v4-perf` 的 `steps=2000 @ dirtyRootsRatio=0.7` 已证明不是高信息量 replay gate；
  - `Cut A` 在 `v4 browser-only residual @ steps=200` 上只给出 mixed signal：absolute p95 改善，但 relative `auto/full` gate 没有同步改善；
  - `Cut A` 在 `v4 low-band queue mutation` 家族上也没有形成稳定正收益；
  - `Cut A` 在 `v4 full-longrun high-dirty @ 2000 / 0.75` 上给出第一条正向 replay 证据：`1.084 -> 1.002`；
  - 但邻近点位 `1600@0.75 / 1600@0.8 / 2000@0.8` 没有同步改善；
  - 当前只能把 `Cut A` 归为 `v4 partial positive`，还不能升成稳定 replay-ready；
  - `TX-C1` 已经不再是当前 residual 主解释，它只提供最小 closeout 候选；
  - `E-1B` clean scout 已完成，当前结论升级为 `inconclusive_after_clean_scout`；
- 当前 `111` 已完成 cheap local 与 heavier local；旧 shadow candidate 的 candidate-specific regression 已由 cutdown v2 在 representative points 上清掉。当前进入新的 shadow local recovery candidate 状态，live candidate 继续 blocked。

## Current Next Actions _(mandatory)_

- 先保持 `TX-C1` 作为 `local_closeout_ready` 的最小 closeout 候选，只在显式 workflow 决策下进入 PR / CI。
- 保持 `E-1B` 作为已完成 docs-only scout，并使用 `inconclusive_after_clean_scout` 口径，不再回退到 `blocked_by_browser_noise`。
- 当前 `111` 已完成 shadow cheap-local 与 heavier local；旧 shadow candidate 的 candidate-specific regression 已由 cutdown v2 在 representative points 上清掉。live candidate 继续 blocked。
- 当前 `111` 的下一步改为：
  - 以 cutdown v2 作为当前 shadow local recovery candidate
  - 重做 residual refresh / promotion gate 复核
  - 只有在归因仍指向 `controller_related` 时，才重开 live-candidate 讨论
- `111 shadow-only package hardening` 当前只证明 additive telemetry wiring 与 unified contract 挂接成立，不覆盖 live controller 有效性。
- `v4-perf` replay、PR、CI 一律后置到本地证据稳定之后。

## 110 -> 111 Interface _(mandatory)_

- `111` 只能在 `main` 控制线语义下推进，且默认先做 telemetry-only / shadow 方案。
- `111` 启动前必须同时满足：
  1. 本 spec 的 decision ledger 与 residual latest 已更新；
  2. 当前 best candidate 已拿到 `accepted_with_evidence`；
  3. 当前 entry decision 至少达到 `inconclusive_after_clean_scout`；
  4. cheap local 的 static heuristic 漂移证据已经在 `main` 线上盘点完成。
- `111` 若要进入 live candidate，还必须同时满足：
  1. shadow-only cheap local 与 heavier local gate 已完成；
  2. future residual refresh 仍稳定指向 `controller_related`；
  3. shadow telemetry 继续保持 additive 且不改变 live `executedMode`。
- `111` 必须复用：
  - 当前 best candidate code anchor；
  - accepted / provisional / discarded ledger；
  - residual latest；
  - same-node evidence anchors。
- `111` 当前最新状态：
  - `planning_active`
  - `shadow_code_poc_ready`
  - `shadow_cheap_local_pass`
  - `live_candidate=blocked`
- `111` 禁止动作：
  - 把 `v4-perf` 当作收益鉴定主线；
  - 绕过 accepted ledger 直接宣布新的主线赢家；
  - 在本地证据不稳定时直接申请 PR / CI。

## User Scenarios & Testing

### User Story 1 - 维护者需要稳定的主路线事实源 (Priority: P1)

作为性能主线维护者，我需要一个长期 spec 说明当前应该先在 `main` 上做什么、后在 `v4-perf` 上做什么，这样任何会话都能恢复路线。

**Why this priority**: 没有单一事实源，后续每轮 perf 试刀都会重新解释路线。

**Independent Test**: 只阅读本 spec 与 plan，就能恢复当前主线路线、分支角色和下一阶段门槛。

**Acceptance Scenarios**:

1. **Given** 一个新会话没有聊天历史，**When** 读取本 spec，**Then** 能明确 `main` 是收益控制线，`v4-perf` 是 replay 与 residual 归因线。
2. **Given** 存在多个实验 worktree，**When** 需要决定某条 cut 落在哪条线，**Then** 能按本 spec 做出确定选择。

---

### User Story 2 - 性能 owner 需要统一的 accepted/provisional/discarded 裁决 (Priority: P1)

作为性能 owner，我需要每条 cut 都有统一裁决和证据要求，这样 replay 到 `v4-perf` 时不会混入噪声。

**Why this priority**: 没有统一裁决，后续 replay 会继续污染 `v4-perf` 归因。

**Independent Test**: 任意一条 cut 都能按本 spec 的规则判断是否允许进入 replay 列表。

**Acceptance Scenarios**:

1. **Given** 某条 cut 只在 quick/triage 口径下看起来不错，**When** 按本 spec 判断，**Then** 只能标为 `provisional`。
2. **Given** 某条 cut 在 fresh same-node baseline 下 `comparability=true` 且 focused diff `regressions=0`，**When** 按本 spec 判断，**Then** 可以标为 `accepted_with_evidence`。

---

### User Story 3 - replay owner 需要明确何时把 cut 带回 v4-perf (Priority: P2)

作为 `v4-perf` replay owner，我需要知道何时允许把 `main` 上的收益 cut 带回 `v4-perf`，以及 replay 后怎么和 `main` 对比。

**Why this priority**: replay 是最终目标，但时机不清会再次混淆控制线与对照线。

**Independent Test**: 只按本 spec 中的 replay 规则执行，就能保持 `v4-perf` 只承担 replay 与 residual 归因。

**Acceptance Scenarios**:

1. **Given** `main` 上有一条已验明的正收益 cut，**When** replay 到 `v4-perf`，**Then** 必须立刻和 fresh main same-node baseline 做 compare。
2. **Given** replay 后 `v4-perf` 仍落后 `main`，**When** 复盘本 spec，**Then** 剩余差额会进入 residual 池。

## Edge Cases

- focused suite 过线，但 full long-run 仍有 residual：允许 `decision=accepted_with_evidence`，同时标记 `replayReadiness=replay_ready` 与 `fullStatus=not_full_golden`
- `v4-perf` replay 后仍回归：允许 cut 在 `main` 保持 accepted，同时把 replay 结果记为 `v4_only_regression`
- 收益只在 browser 生效：允许 accepted，但必须注明收益面
- 系统性方案例如 adaptive controller：规划先挂 `main`，PoC 也先挂 `main`
- 主仓 `specs/` 编号与 `v4-perf` worktree 的临时编号可能分叉：主控规格只以本 worktree `110/111` 为准

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 将 `main` 定义为性能收益控制线，将 `v4-perf` 定义为收益 replay 与 residual attribution 线。
- **FR-002**: 系统 MUST 将每条性能 cut 裁决为 `accepted_with_evidence`、`provisional`、`discarded` 之一。
- **FR-003**: 只有 `accepted_with_evidence` 的 cut 才允许进入 `v4-perf` replay。
- **FR-004**: 每条 accepted cut MUST 绑定 fresh same-node baseline 证据。
- **FR-005**: 系统 MUST 记录当前主线最强候选实现面及其 focused/full 证据状态。
- **FR-006**: replay 后仍落后 `main` 的差额 MUST 进入 residual 池。
- **FR-007**: 系统 MUST 为 branch/worktree 角色提供稳定说明。
- **FR-008**: push / replay / PR 准备动作 MUST 以前置本地证据为门。
- **FR-009**: 系统 MUST 与 `111-adaptive-auto-converge-controller` 保持引用关系。
- **FR-010**: 系统 MUST 在本 spec 中维护一份最新的 Branch Ledger 与 Current Progress Snapshot。
- **FR-011**: 系统 MUST 定义每条 cut 的统一记录格式，使后续 accepted/provisional/discarded 能被长期追溯。
- **FR-012**: 系统 MUST 明确“当前最强控制线候选”和“当前 remaining residual”的最新状态。
- **FR-013**: 系统 MUST 把 `cheap local -> focused local -> heavier local -> PR/CI last` 写成统一 promotion 协议。
- **FR-014**: 系统 MUST 定义 `110 -> 111` 的进入门、禁止动作与必须复用的输入工件。

### Non-Functional Requirements

- **NFR-001**: 路线裁决 MUST 绑定具体分支、worktree、工件路径和口径。
- **NFR-002**: 路线 MUST 尽量减少同一条 cut 在不同线重复解释的成本。
- **NFR-003**: `v4-perf` 在没有 accepted cut 列表前不得重新成为最终母线。
- **NFR-004**: residual 的定义和边界必须明确。
- **NFR-005**: 本 spec 作为主控时，任何新会话仅靠 `110` 就应能恢复主线 80% 以上事实。

### Key Entities

- **Control-Line Cut**: 在 `main` 上被独立验证收益正负的一条性能改动
- **Replay Candidate**: 已达到 `accepted_with_evidence`，允许迁移到 `v4-perf` 的 cut
- **Residual Pool**: replay 完成后仍存在于 `v4-perf` 相对 `main` 的剩余差额
- **Evidence Bundle**: 一条 cut 对应的 before/after/diff/readings 与判定
- **Branch Ledger Entry**: 一个 worktree/branch 的职责、状态、禁区与当前裁决
- **Control-Line Status**: 当前某条控制实验线的 latest factual state

## Cut Decision Record Format _(mandatory)_

后续每条 cut 至少要能落成以下格式：

- `cutId`
- `line`: `main_control | v4_replay | residual_only`
- `owner worktree / branch`
- `files touched`
- `before evidence`
- `after evidence`
- `diff path`
- `correctness gates`
- `decision`: `accepted_with_evidence | provisional | discarded`
- `evidenceTier`: `cheap_local | focused_local | heavier_local | ci`
- `replayReadiness`: `blocked | replay_ready`
- `fullStatus`: `not_applicable | not_full_golden | full_golden`
- `residualCategory`: `none | suite_progression | browser_long_run | suite_progression_or_browser_long_run | high_dirty_full_long_run | v4_only_regression | unknown`
- `notes`: 说明适用边界、失败边界、是否允许 replay

## Route Exit Criteria _(mandatory)_

### When `v4-perf` May Return as Final Motherline

必须同时满足：

1. 已存在 accepted cut 列表，且每条都能追溯到 `main` 控制线硬证据。
2. accepted cut 已 replay 到 `v4-perf`。
3. replay 后，`v4-perf` 相对 fresh main baseline 在当前主热点 suite 上没有未解释的 focused regression。
4. 若 full long-run 仍有差额，该差额已经被明确归入 residual 池，并和 accepted cut 真伪分离。

### When a Control-Line Candidate May Be Treated as Replay-Ready

至少满足：

1. correctness 门通过；
2. fresh same-node focused diff `regressions=0`；
3. `steps=200` 与主热点区间都已复核；
4. 剩余问题已缩到更小类别，例如 auto/full 相对阈值或 long-run progression。

### When `111` May Enter Shadow / PoC on `main`

至少满足：

1. `110` 的 latest ledger 与 residual latest 已更新；
2. 当前 remaining residual 仍稳定指向 controller 相关类别，而非单纯的 suite 噪声或 correctness 问题；
3. cheap local 的 static heuristic 漂移盘点已经完成；
4. 第一刀只能是 telemetry-only / shadow，不得直接替换 live decision。

## Success Criteria

### Measurable Outcomes

- **SC-001**: 本 spec/plan/tasks 能单独恢复当前主线路线
- **SC-002**: 任一性能 cut 都能按三分法做唯一裁决
- **SC-003**: 后续 replay 到 `v4-perf` 的 cut 都能追溯到 `main` 控制线硬证据
- **SC-004**: 后续若 `v4-perf` 仍落后 `main`，剩余问题都能进入 residual 池
- **SC-005**: 新会话只读 `110` 的 `spec/plan` 就能恢复当前各关键分支的角色和状态
- **SC-006**: 新会话只读 `110` 就能定位当前 best candidate 的关键代码与工件路径
- **SC-007**: 新会话只读 `110` 就能判断当前是否允许进入 `111` 的 shadow / PoC
