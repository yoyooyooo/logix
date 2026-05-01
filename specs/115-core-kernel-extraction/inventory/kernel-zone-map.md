# Inventory: Kernel Zone Map

## Goal

把 `@logixjs/core` 和 `@logixjs/core-ng` 当前相关路径映射到五个稳定 zone：

- `kernel`
- `runtime-shell`
- `observability`
- `reflection`
- `process`

## Current Zone Map

| Zone | Current Paths | Role | Depends On |
| --- | --- | --- | --- |
| `kernel` | `packages/logix-core/src/internal/kernel-api.ts`, `packages/logix-core/src/internal/runtime/core/**` | 最小执行核、事务、调度、状态推进、运行时服务 | `observability`, `reflection`, `process` |
| `runtime-shell` | `packages/logix-core/src/Runtime.ts`, `packages/logix-core/src/Module.ts`, `packages/logix-core/src/Logic.ts`, `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`, `packages/logix-core/src/internal/runtime/Runtime.ts`, `packages/logix-core/src/internal/runtime/index.ts`, `packages/logix-core/src/internal/runtime/AppRuntime.ts`, `packages/logix-core/src/internal/runtime/ModuleFactory.ts` | 对外 runtime 装配、公开面与壳层协调 | `kernel`, `observability`, `reflection`, `process` |
| `observability` | `packages/logix-core/src/internal/evidence-api.ts`, `packages/logix-core/src/internal/observability/**`, `packages/logix-core/src/internal/debug/**` | 证据、报告、trial run、调试事件与导出 | `kernel`, `process` |
| `reflection` | `packages/logix-core/src/internal/reflection-api.ts`, `packages/logix-core/src/internal/reflection/**`, `packages/logix-core/src/internal/workflow/**` | manifest、static IR、diff、control surface 与反射导出 | `kernel` |
| `process` | `packages/logix-core/src/internal/runtime/core/process/**`, `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`, `packages/logix-core/src/internal/runtime/ProgramRunner*.ts` | process runtime、trigger、selector diagnostics、runner 链路 | `kernel`, `observability` |

## Key Module Placement

| Module | Current Path | Zone | Note |
| --- | --- | --- | --- |
| `RuntimeKernel` | `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts` | `kernel` | 内核中枢，继续作为长期主线 |
| `ModuleRuntime` | `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` | `kernel` | 热链路核心实现 |
| `StateTransaction` | `packages/logix-core/src/internal/runtime/core/StateTransaction.ts` | `kernel` | 事务边界核心模块 |
| `TaskRunner` | `packages/logix-core/src/internal/runtime/core/TaskRunner.ts` | `kernel` | 调度与任务执行核 |
| `DebugSink` | `packages/logix-core/src/internal/runtime/core/DebugSink.ts` | `observability` | 实现落在 core，下游职责归 observability 簇 |
| `ProcessRuntime` | `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.ts` | `process` | 继续独立成簇，不与 kernel 混成单层 |
| `Reflection` | `packages/logix-core/src/internal/reflection-api.ts` | `reflection` | 公开入口在外层，深层实现留在 `internal/reflection/**` |
| `ProgramRunner` | `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts` | `runtime-shell` | 更接近外层装配与运行协调 |

## Core-Ng Position

| Path | Current Reading | Target |
| --- | --- | --- |
| `packages/logix-core-ng/src/index.ts` | legacy barrel | support matrix 输入 |
| `packages/logix-core-ng/src/RuntimeServices.impls.ts` | runtime services 旧实现对照材料 | 迁移到 `kernel` support matrix |
| `packages/logix-core-ng/src/CoreNgLayer.ts` | legacy layer 入口 | 不再作为并列主线入口 |
| `packages/logix-core-ng/src/ExecVmEvidence.ts` | 旧执行证据残留 | 进入 observability/reuse 审计 |

## Audit Notes

- `packages/logix-core/src/internal/runtime/core/**` 已经能承载 kernel 主叙事，无需新开第二套 `internal/kernel/**`
- `DebugSink` 与 `DevtoolsHub` 当前实现落在 core 目录，职责上应由 observability 解释
- `ProgramRunner` 与 `ProcessRuntime` 相邻但不等价，前者更偏外层运行协调，后者更偏 process 功能簇
- `core-ng` 当前最有价值的输入是 `RuntimeServices.impls.ts` 和相关 contract tests
