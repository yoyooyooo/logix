# Implementation Plan: Adaptive Auto-Converge Controller

**Branch**: `111-adaptive-auto-converge-controller` | **Date**: 2026-03-27 | **Spec**: `specs/111-adaptive-auto-converge-controller/spec.md`
**Input**: Feature specification from `/specs/111-adaptive-auto-converge-controller/spec.md`

## Summary

当前阶段只做规划与设计，不把 adaptive controller 直接合进 perf 主线实现。

目标：

- 定义 controller 的输入、状态、输出
- 定义成本比较模型
- 定义 per-band 在线校准
- 定义 rollout 路径

## Current Readiness Decision

- current level: `shadow_only_not_live_candidate`
- reason:
  - `TX-C1` 只证明了最小 closeout 边界，不提供 controller residual 证明
  - `E-1B` 当前仍是 docs-only scout，browser long-run capture/order 敏感性还没被 clean scout 压清
- immediate next package:
  1. `111` 自身补齐 `data-model / contracts / checklist`
  2. `E-1B` clean docs-only scout
  3. 只有 clean scout 仍指向 controller，才允许 shadow-code PoC

## Cross-Spec Alignment

- `110` 定义 route gate、residual latest 与 `111` 进入门。`111` 不单独改写 perf 主线路线。
- `013-auto-converge-planner` 与 `specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json` 是当前 `trait:converge` 契约 baseline。
- `014-browser-perf-boundaries` 继续承担 heavier local / CI 侧的边界跑道，前提是本地 cheap / focused 证据已稳定。

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: effect v3、@logixjs/core、@logixjs/react  
**Storage**: 文件系统规格、perf 工件、controller 内存态  
**Testing**: Vitest、browser perf collect、node traitConverge bench  
**Target Platform**: Node.js 22 + Chromium  
**Project Type**: pnpm workspace / packages + specs  
**Performance Goals**: 降低静态阈值漂移，提高 auto/full/dirty 决策稳定性  
**Constraints**: 决策必须同步、无 IO；disabled/fallback 开销接近零；先在 `main` 控制线规划和 PoC  
**Scale/Scope**: 主要涉及 `converge-in-transaction.impl.ts` 及其 telemetry / diagnostics / evidence

## Constitution Check

- Intent -> Flow -> Code -> Runtime：`111` 只改 converge decision/controller 层，执行层仍保持现有 `full|dirty` 路径与 transaction window 约束。
- docs-first：先固化 `110/111`，再考虑 shadow / PoC；adaptive 字段若进入 `trait:converge`，必须先回写 `013` contracts 与相关 observability 文档。
- Contracts / no second truth source：`111` 复用现有 `TraitConvergeDecisionSummary` / `trace:trait:converge`，新增字段只能增量扩展。
- IR / stable ids：不改统一最小 IR；继续使用 `moduleId/instanceId/txnSeq/generation` 作为 controller 与 diagnostics 锚点。
- Transaction boundary：controller、shadow、探索逻辑都必须同步、无 IO。
- Performance budget：第一刀是 telemetry-only / shadow，disabled/fallback 额外成本接近零；live candidate 只在 cheap local 和 heavier local 稳定后推进。
- Diagnosability cost：always-on 字段保持 slim，较重的 comparison / band stats 仅允许 sampled、shadow 或 perf harness 消费。
- Breaking changes / quality gates：在 live controller 前，以加法扩展为主；quality gates 先跑 cheap local，再跑 heavier local，PR / CI 最后。

## Decomposition Brief _(mandatory before any hot-path PoC)_

目标文件：`packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`

- 当前状态：热路径目标文件已超过模块规模门槛，controller 语义改造前必须先定义无损拆分边界。
- 拆分形态：单一主体 + 同目录平铺子模块。
- 候选子模块：
  - `converge-decision.policy.ts`：static heuristic、adaptive controller、fallback ladder
  - `converge-plan.compute.ts`：dirty roots、plan 计算、cache 命中与 budget cutoff
  - `converge-decision.summary.ts`：decision summary、trace payload、adaptive additive fields
  - `converge-in-transaction.impl.ts`：事务 orchestration、draft / execution wiring、对子模块的装配
- 落地顺序：
  1. 先做无损拆分，不改行为；
  2. 用 typecheck + 现有 converge tests + focused perf smoke 验证拆分等价；
  3. 拆分完成后，才允许 shadow / adaptive 语义改造进入热路径文件。
- 单向依赖：新子模块只能依赖更深的 state-trait / runtime contracts，禁止反向依赖 `converge-in-transaction.impl.ts`。

## Proposed Architecture

### Phase A - Telemetry Normalization

最小 baseline 直接复用现有 `TraitConvergeDecisionSummary`：

- `stepStats.totalSteps`
- `stepStats.affectedSteps`
- `dirty.rootCount`
- `cache.hit / missReason / disableReason`
- `generation`
- `requestedMode`
- `executedMode`
- `executionDurationMs`
- `decisionDurationMs`
- `configScope`
- `reasons`

adaptive 增量字段：

- `bandKey`
- `fullCostEstimate`
- `dirtyCostEstimate`
- `fallbackReason`
- `controllerStateVersion`

作用域定义：

- `envBucket`：宿主 + runner + 关键 profile 的稳定桶，例如 `node-22-darwin-arm64`、`chromium-soak-darwin-arm64`
- `bandKey`：`moduleId × envBucket × stepCountBand × dirtyRootRatioBand × cacheStateClass`
- `moduleId`：沿用现有稳定 `moduleId`，不引入新的模块身份模型
- `per-band state`：仅保留在当前 runtime instance 的内存态；runtime dispose 直接清空，generation bump / cache thrash 只做降权或版本切换，不跨 instance 共享

分层策略：

- always-on slim：只保留 cheap to compute 的 decision summary + adaptive verdict
- sampled / shadow：允许补 band snapshot、candidate delta、exploration summary
- perf harness：消费完整 dated reading / diff，不把重字段常驻到默认热路径

### Phase B - Cost Model

- `fullCostEstimate(stepCount, envBucket, bandState)`
- `dirtyCostEstimate(stepCount, dirtyRootCount, planLength, cacheState, envBucket, bandState)`

决策规则：

- 仅当 `dirtyCostEstimate < fullCostEstimate * safetyMargin` 时选 dirty
- hard fallback 顺序固定为：`cold_start` / `dirty_all` / `unknown_write` / `budget_cutoff` / `controller_confidence_low`

### Phase C - Online Calibration

- `stepCountBand × dirtyRootRatioBand × envBucket × moduleId`
- generation bump / cache thrash 时降权旧数据
- band state 默认只保留内存态 latest / rolling stats，不引入持久化

### Phase D - Guarded Exploration

- 预算充足时低频探索
- exploration 可关闭、可审计、可解释
- 第一阶段仅允许 shadow exploration，不影响 live executedMode
- 预算上限：
  - 同一 `bandKey` 只允许低频采样，且必须有 cooldown
  - 任一时刻只允许一个 active exploration band
  - 超过 decision budget、出现 hard fallback、或 residual 噪声放大时立即停用探索
- 回滚策略：
  - 回退到当前 static heuristic / shadow baseline
  - 记录 `rollbackReason`
  - kill switch 持续到下一次 `controllerStateVersion` 更新或手动重新开启

### Phase E - Rollout

1. static heuristic inventory + docs/spec 对齐
2. `main` 上的 telemetry-only / shadow-mode
3. cheap local：node bench + focused same-node targeted suites
4. heavier local：full soak / high-dirty rerun / browser long-run
5. 只有在本地稳定后，才决定是否申请 PR / CI 或 replay 到 `v4-perf`

## Hard Rules That Stay Hard-Coded

- `cold_start`
- `dirty_all`
- `unknown_write`
- budget cutoff / degraded
- transaction boundary / async escape guard

## Validation Ladder

### Cheap Local First

- `bench:traitConverge:node`
- focused `converge-steps` same-node targeted suites
- 当前 cheap local 只允许：
  - telemetry-only / shadow
  - `executedMode` 不变
  - additive shadow summary 导出
- 目标：确认 telemetry contract、shadow delta、fallback reasons 与 heuristic drift

### Heavier Local Later

- `converge-steps` full same-node soak
- 高 dirty targeted rerun
- browser long-run / suite progression probe
- browser long-run 当前只作为 veto gate，不充当 live candidate 收益依据
- 目标：判断 residual 是否稳定指向 controller，并评估 live candidate 是否值得进入下一刀

### PR / CI Last

- 前提：cheap local 与 heavier local 都已经稳定
- 运行前必须声明目的：correctness verify、gain verify、还是 deeper perf collect
- 必须额外满足：单一最小边界、clean branch、不得混入 `E-1B` scout 或更宽 txn 改动
- 没有本地稳定证据时，不启动 CI

## Minimum Shadow-Only PoC Package

- first implementation form:
  - `telemetry-only / shadow-mode`
- minimum write scope after gate clears:
  1. `packages/logix-core/src/internal/state-trait/converge-in-transaction.impl.ts`
  2. `packages/logix-core/src/internal/state-trait/model.ts`
  3. only if shadow fields enter the unified contract:
     - `specs/013-auto-converge-planner/contracts/schemas/trait-converge-data.schema.json`
- explicit exclusions:
  - `ModuleRuntime.impl.ts`
  - `ModuleRuntime.transaction.ts`
  - `StateTransaction.ts`
  - `ModuleRuntime.dispatch.ts`
  - `ModuleRuntime.operation.ts`
  - `ModuleRuntime.txnQueue.ts`
  - `RuntimeExternalStore.ts`

## Replay Gate & Docs Sync

- replay 到 `v4-perf` 的前置门：
  1. `110` 已把当前 live candidate 记为 `accepted_with_evidence`
  2. heavier local 仍给出稳定净收益
  3. residual latest 不再把问题记为 `unknown`
- docs sync targets：
  - 契约字段变化：`specs/013-auto-converge-planner/contracts/schemas/*`
  - runtime / observability SSoT：`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.01-module-runtime-make.md`、`docs/ssot/runtime/logix-core/observability/09-debugging.md`
  - user-facing docs：只有 live candidate 稳定后才同步

## Perf Evidence Plan

- Baseline 语义：current static heuristic vs adaptive shadow / candidate
- cheap local suites：
  - `converge-steps`
  - `bench:traitConverge:node`
- heavier local suites：
  - `converge-steps` full soak
  - high-dirty targeted rerun
  - browser long-run / suite progression probe
- 核心指标：
  - `runtime.txnCommitMs`
  - `runtime.decisionMs`
  - `executedMode`
  - `reasons`
  - `affectedSteps / planLength`
  - `bandKey`
  - `fullCostEstimate / dirtyCostEstimate`
  - `fallbackReason`
  - `controllerStateVersion`
- CI / PR 只在本地稳定后运行，并事先写明目标分支 / PR 与 collect 目的

## Completion Rule

当前 plan 的完成条件：

1. adaptive controller 的结构、fallback、shadow path 与 rollout 路径已经明确
2. 它被明确约束在 `main` 控制线规划 / PoC，且服从 `110`
3. 它已明确继承 `013` 的 diagnostics contract baseline
4. 它在实现前已经有 Decomposition Brief，避免结构债与语义改造绑死
5. 后续实现无需重新解释 cheap local / heavier local / PR / CI 梯度
