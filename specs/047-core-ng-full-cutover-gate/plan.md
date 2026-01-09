# Implementation Plan: 047 core-ng 全套切换达标门槛（无 fallback）

**Branch**: `047-core-ng-full-cutover-gate` | **Date**: 2025-12-27 | **Spec**: `specs/047-core-ng-full-cutover-gate/spec.md`  
**Input**: Feature specification from `specs/047-core-ng-full-cutover-gate/spec.md`

## Summary

目标：把 “M3：core-ng 全套切换可达标” 从 046 的路线图口头描述，固化为一个可执行、可证据化的 **Full Cutover Gate**：

- 定义 coverage matrix（哪些 serviceId 必须由 core-ng 接管）
- 在 Full Cutover 模式下 **禁止 fallback**（否则结构化失败）
- 复用 045 的 contract verification harness（core vs core-ng）
- 如需允许差异 allowlist：SSoT=代码；仅允许 op meta 的部分 key（按 `metaKey`）；命中 allowlist 仍可 PASS 但必须输出 `allowedDiffs` 最小摘要（可审计）
- 支持装配期失败锚点：`txnSeq=0` 代表 assembly（满足最小可序列化锚点字段集合）
- 把 `$logix-perf-evidence` 的 Node + Browser before/after/diff 作为硬门槛（证据采集必须隔离：独立 `git worktree/单独目录`）
- perf evidence 的硬结论 profile 锁死为 `default`（`quick` 仅线索；`soak` 可选复核）
- 提供一键入口（例如 `Reflection.verifyFullCutoverGate`）供 CI/TrialRun/Agent 统一调用

本特性本身仍属于“规划与门槛固化”：不实现 core-ng 的具体优化算法，但会拆出实现阶段 tasks（落点到 `packages/logix-core/*`、`packages/logix-core-ng/*`、`packages/logix-react/*` 与 perf evidence）。

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、（实现阶段）`@logixjs/core-ng`  
**Storage**: N/A（证据落盘到 `specs/047-*/perf/*`）  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（必须含 ≥1 headless browser evidence）  
**Project Type**: pnpm workspace（`packages/*` + `examples/*`）  
**Performance Goals**: 在 matrix.json 的 `priority=P1` suites 上，core-ng Full Cutover 相对 core 默认不得出现 budget regression（`pnpm perf diff`：`comparability.comparable=true` 且 `summary.regressions==0`）  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）+ 稳定锚点（instanceId/txnSeq/opSeq）；事务窗口禁 IO；`diagnostics=off` 近零成本；上层不直接依赖 `@logixjs/core-ng`  
**Scale/Scope**: 本特性固化“达标门槛与验证矩阵”；实现阶段主要为 contract/cutover gate/证据跑道与少量必要的诊断字段补强

## Kernel support matrix

- `core`: supported
- `core-ng`: trial-only → supported（以 Full Cutover Gate PASS 为准；PASS 前不得宣称可切默认）

## Perf Evidence Plan（MUST）

- Baseline 语义：策略 A/B（同一份代码下 before=core（default），after=core-ng（full cutover，无 fallback））
- Matrix SSoT：`.codex/skills/logix-perf-evidence/assets/matrix.json`（before/after 的 `meta.matrixId/matrixHash` 必须一致）
- Hard conclusion：交付结论必须 `profile=default`（`quick` 仅线索；需要更稳可用 `soak` 复核）
- 采集隔离：before/after/diff 必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索不得用于宣称 Gate PASS
- PASS 判据：`pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`
- Kernel 选择（防误判）：
  - Browser：`VITE_LOGIX_PERF_KERNEL_ID=core-ng`（用于 after/core-ng 采集）；before/core 不设置该变量
  - Node：`LOGIX_PERF_KERNEL_ID=core-ng`（用于 after/core-ng 采集）；before/core 不设置该变量
  - **Full Cutover 额外硬要求**：after 必须由 `@logixjs/core-ng` 的 layer（例如 `coreNgKernelLayer`）装配，并通过 Gate/证据证明 **无 fallback**；任何 “perf-only override（只替换单个 serviceId）” 的 after 结果不得作为 047 Gate 证据（只能当调参/线索）。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Runtime 治理层（“何谓可切默认”），不改变业务侧 Flow/DSL，只约束 runtime 装配与验证。
- **Docs-first & SSoT**：以 `specs/045-dual-kernel-contract/` 与 046 registry 为裁决锚点；不把 drafts 当裁决。
- **Contracts**：复用 045 的 Kernel Contract 与 contract verification harness；新增的是 “Full Cutover Gate” 的规则与 coverage matrix（必须是单一事实源）。
- **IR & anchors**：不改变统一最小 IR；如需新增字段，仅允许 Slim、可序列化、可裁剪字段，用于解释 bindings/fallback/失败原因；装配期失败允许 `txnSeq=0`（assembly）。
- **Deterministic identity**：差异与证据锚点必须使用稳定 instanceId/txnSeq/opSeq；禁止随机/时间默认锚点。
- **Transaction boundary**：禁止在事务窗口内引入 IO/async；Full Cutover Gate 只发生在 runtime 装配与验证层。
- **Internal contracts & trial runs**：Full Cutover 的判定必须可通过 TrialRun/对照 harness 输出证据复核；不得依赖进程级全局单例。
- **Dual kernels (core + core-ng)**：consumer 仅依赖 `@logixjs/core`；Full Cutover gate 不要求上层依赖 core-ng；计划必须定义 kernel support matrix，并在“宣称可切默认”时禁止 fallback。
- **Performance budget**：强制 `$logix-perf-evidence`（Node + Browser）作为门槛；证据采集必须隔离（独立 `git worktree/单独目录`）；预算回归必须阻断。
- **Diagnosability & explainability**：off 近零成本，且 Full Cutover Gate 必须在 `diagnostics=off` 下可运行并输出最小结果；light/full 下可解释“请求 kernelId / 实际 bindings / 是否 fallback / 失败原因”并补充细节。
- **Breaking changes**：本特性主要是新增 gate/验证机制；如引入对外行为变化必须写迁移说明（但不保留兼容层）。
- **Public submodules**：实现阶段若新增导出点，必须遵守 public submodules 规则（PascalCase + internal 不泄漏）。
- **Quality gates**：实现阶段至少通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`，并追加 `$logix-perf-evidence`。

### Gate Result (Pre-Design)

- PASS（当前交付为 specs 文档与 tasks；实现阶段按 tasks 执行并复核）

## Project Structure

### Documentation (this feature)

```text
specs/047-core-ng-full-cutover-gate/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
├── quickstart.md
└── tasks.md
```

### Source Code (implementation targets)

```text
packages/logix-core/
├── src/Kernel.ts
├── src/Reflection.ts
└── src/internal/runtime/core/RuntimeKernel.ts

packages/logix-core-ng/
└── src/*                # 需要覆盖 coverage matrix 内的所有 serviceId

packages/logix-react/
└── test/browser/perf-boundaries/*   # perf evidence suites（由 $logix-perf-evidence 统一口径采集）

.codex/skills/logix-perf-evidence/
└── package.json + scripts/*
```

**Structure Decision**:

- Gate/coverage matrix/验证入口优先落在 `@logixjs/core` 的契约层（避免 consumer 依赖 core-ng）。
- core-ng 只提供实现 layer；是否达标由 gate + 证据裁决，而不是靠口头宣称。

## Deliverables by Phase

- **Phase 0（research）**：明确 coverage matrix 的维护方式（单一事实源）、允许差异策略、验证与证据矩阵（Node+Browser suites）。
- **Phase 1（design）**：产出 `data-model.md`、`contracts/*`、`quickstart.md`（如何运行 gate + 如何落盘证据）。
- **Phase 2（tasks）**：产出可执行 `tasks.md`（实现 gate、测试、证据采集与 diff、回写 046）。
