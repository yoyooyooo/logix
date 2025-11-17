# Quickstart: Trait Derived Converge Perf & Diagnostics Hardening

**Feature**: `specs/039-trait-converge-int-exec-evidence/spec.md`

**In 046**: 这是 `specs/046-core-ng-roadmap/roadmap.md` 的 M1（当前内核够硬）。通常承接 045（M0）之后的主线；完成后按 046 的 T041 回写证据入口与状态。

## What this feature is

- 只做一件事：把 `StateTrait.converge` 的“整型优化”从决策/计划层打穿到执行层，显著降低 CPU 与分配，并保持证据可解释。
- 不改变对外语义：单窗口 0/1 commit、事务窗口禁止 IO、稳定标识、统一最小 IR。

## Where to look

- 执行热路径：`packages/logix-core/src/internal/state-trait/converge.ts`
- 静态 IR 构建：`packages/logix-core/src/internal/state-trait/build.ts`、`packages/logix-core/src/internal/state-trait/converge-ir.ts`
- patch/dirty 入口：`packages/logix-core/src/internal/runtime/core/mutativePatches.ts`、`packages/logix-core/src/internal/field-path.ts`
- 事务入口：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- 证据投影与 light 裁剪：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- converge evidence schema（SSoT）：`specs/013-auto-converge-planner/contracts/`

## How to validate (local)

### 1) Semantics

- 语义回归以“单窗口 0/1 commit、降级不提交半成品、配置错误硬失败”为准。
- 任意行为变化必须能通过 `trait:converge` 证据解释（reasons/outcome/budgets/dirty/cache 等）。

### 2) Performance Baseline

本特性会新增 converge 专项基线 runner，并把证据落盘到：

`specs/039-trait-converge-int-exec-evidence/perf/*`

对比维度建议包含：

- local dirty / near-full / dirtyAll
- Diagnostics Level: off / light / full
- 不同 step 数量档位（规模 10×）
- 至少 1 个自动化 headless browser run（用于覆盖宿主特定 JIT/GC 差异）

## Non-goals reminder

- 不引入新的用户编程模型（不改 `computed.derive(state)`）；如果要做“用户逻辑也整型化”，需要另开特性并给迁移说明。
- 不实现 list.item scope 的按行派生执行（`items[].x`）。
