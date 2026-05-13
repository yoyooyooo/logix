# Implementation Plan: Workflow/Process 统一内核第一阶段（O-003）

**Branch**: `096-unified-workflow-process-engine` | **Date**: 2026-02-25 | **Spec**: `specs/096-unified-workflow-process-engine/spec.md`
**Input**: `specs/096-unified-workflow-process-engine/spec.md`

## Summary

本阶段目标是“可验证的共核抽取”，不做激进重写：

- Workflow：抽取 runBoundary + meta 组装中的重复片段；
- Process：抽取 trigger 调度接线（triggerSeq / event budget / onDrop）中的重复片段；
- 验证：补齐至少一组 workflow/process 策略行为对齐测试，证明语义不变。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）
**Primary Dependencies**: `effect` v3、`@logixjs/core` runtime 内核
**Storage**: N/A
**Testing**: Vitest + `@effect/vitest`（非 watch）
**Target Platform**: Node.js（runtime/test）
**Project Type**: pnpm monorepo
**Performance Goals**: 核心路径无明显回退；保留可复现 baseline 命令
**Constraints**: forward-only evolution；诊断 Slim 可序列化；稳定标识；事务窗口禁止 IO；不改 DSL API
**Scale/Scope**: 仅 O-003 第一阶段，限定授权文件范围

## Constitution Check

_GATE: Must pass before implementation. Re-check after Phase 1 design._

### 1) 性能预算（Performance Budget）

- 预算目标：本阶段仅重构，不改变并发策略算法复杂度与事件预算策略。
- 最小基线命令：
  - `pnpm perf bench:012:process-baseline`
  - `pnpm --filter @logixjs/core test -- test/internal/Runtime/WorkflowRuntime.075.test.ts`
- 结果落点（建议）：`specs/096-unified-workflow-process-engine/perf/`

### 2) 诊断代价（Diagnostics Cost）

- 不新增新的诊断协议；复用现有 `trace:effectop` / `process:*` 事件。
- 保持 diagnostics=`off` 路径无额外强制观测逻辑。
- 诊断载荷继续遵守 Slim + 可序列化约束。

### 3) 统一 IR / 锚点漂移点（IR & Anchor Drift）

- 本阶段不引入新的 IR 结构；不创建并行真相源。
- 保持 `moduleId/instanceId/runId/triggerSeq/runSeq/tickSeq` 的语义边界不变。
- 抽取 helper 仅重组代码，不改动态 Trace 的字段含义。

### 4) 稳定标识（Deterministic Identity）

- 不新增随机/时间型标识。
- Workflow 继续使用现有 runId 规则；Process 继续使用当前 triggerSeq/runSeq 单调机制。

### 5) 迁移说明（Migration Notes）

- 本阶段目标是非破坏性重构；若出现行为差异，需在 `specs/096.../` 补充迁移说明。
- 不引入兼容层或弃用期。

### Gate Result

- PASS（进入第一阶段实现）

## Perf Evidence Plan

- **基线命令（至少一次）**: `pnpm perf bench:012:process-baseline`
- **辅助命令（行为回归）**:
  - `pnpm --filter @logixjs/core test -- test/internal/Runtime/WorkflowRuntime.075.test.ts`
  - `pnpm --filter @logixjs/core test -- test/Process/Process.Concurrency.DropVsParallel.test.ts test/Process/Process.Concurrency.LatestVsSerial.test.ts`
- **建议产物路径**:
  - `specs/096-unified-workflow-process-engine/perf/process-baseline.<env>.txt`
  - `specs/096-unified-workflow-process-engine/perf/verification.<date>.txt`

## Project Structure

### Documentation (this feature)

```text
specs/096-unified-workflow-process-engine/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── WorkflowRuntime.ts
└── process/
   ├── ProcessRuntime.make.ts
   ├── concurrency.ts         # only if needed
   └── triggerStreams.ts      # only if needed

packages/logix-core/test/
└── ** (workflow/process scheduling consistency related)
```

**Structure Decision**: 只做“文件内共核抽取 + 测试补强”，不新增公共 API 文件、不改 DSL 层。

## Phase Plan

### Phase 0 - Spec/Plan/Tasks 完整化

- 完成 speckit 三件套落盘与约束固化。

### Phase 1 - Workflow 共核抽取

- 在 `WorkflowRuntime.ts` 抽取可复用的 boundary/meta 组装 helper。
- 保持 `workflow.run/drop/cancel/dispatch/delay/call/timeout` 语义不变。

### Phase 2 - Process 共核抽取

- 在 `ProcessRuntime.make.ts` 抽取 trigger 链路共核（triggerSeq/预算/onDrop）。
- 若无必要，不改 `concurrency.ts` 与 `triggerStreams.ts`。

### Phase 3 - 一致性测试与最小验证

- 增补/调整 workflow-process 策略行为对齐测试。
- 跑最小必要测试与类型检查，并记录结果。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| None | N/A | N/A |
