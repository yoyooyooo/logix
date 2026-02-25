# Implementation Plan: SelectorGraph Watcher Dual Track（O-001）

**Branch**: `094-selectorgraph-watcher-dual-track` | **Date**: 2026-02-25 | **Spec**: `specs/094-selectorgraph-watcher-dual-track/spec.md`  
**Input**: `specs/094-selectorgraph-watcher-dual-track/spec.md`

## Summary

本特性在 `FlowRuntime.fromState` 引入“双轨收益策略”并保持保守回退：

1. 显式 `ReadQuery`：优先走 `runtime.changesReadQueryWithMeta`（静态路径），缺失时降级 `runtime.changes(query.select)`。
2. 非显式 selector：自动 `ReadQuery.compile(selector)`，能静态则走静态路径，不能静态则 fallback。

目标是“不强制显式 ReadQuery”仍可吃到 SelectorGraph 收益，同时不破坏旧语义。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/core` runtime internals（FlowRuntime/ReadQuery）  
**Storage**: N/A  
**Testing**: Vitest + `@effect/vitest`  
**Target Platform**: Node.js 20+（核心包单测）  
**Project Type**: pnpm workspace（packages/*）  
**Performance Goals**: 保持 hot-path 回归可控；Flow 仅增加一次编译判定与静态流映射，不引入额外事务成本  
**Constraints**: forward-only、统一最小 IR、稳定标识、事务窗口禁 IO、诊断 slim 可序列化  
**Scale/Scope**: 第一阶段只改 `FlowRuntime.fromState` 与 `Flow` 相关测试

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Intent → Flow/Logix → Code → Runtime**：本次是 Flow 入口路由优化，直接映射到 runtime 的 selector 订阅路径，不改业务 DSL。
- **Docs-first/SSoT**：特性事实源落在 `specs/094-selectorgraph-watcher-dual-track/*`，并与既有 `057/068/074` ReadQuery 口径对齐。
- **Effect/Logix contracts**：不新增公共 API；仅调整 `FlowRuntime.fromState` 内部路由策略。
- **IR & anchors**：不新增 IR 类型；复用 `ReadQuery.compile(...).staticIr` 与 selectorId 锚点。
- **Deterministic identity**：不生成新 id，完全复用 ReadQuery 既有稳定/降级策略。
- **Transaction boundary**：仅订阅路径改动，无事务内 IO 新增。
- **Performance budget**：核心路径改动，需给出可复现验证与后续 perf evidence 落点（见下节）。
- **Diagnosability**：不新增诊断事件协议；依赖现有 `lane/fallbackReason` 解释链路。
- **Breaking changes**：无对外破坏；保持 `fromState` 对外类型与返回值语义不变。
- **Public submodule / 目录铁律**：仅修改既有 `FlowRuntime.ts` 与 `test/Flow`，不新增跨层依赖。
- **Quality gates**：本阶段最小门禁为目标测试 + core `typecheck:test`。

### Gate Result (Pre-Design)

- PASS（第一阶段可实施）

## Perf Evidence Plan（MUST）

本特性触及 `FlowRuntime` 热路径，第一阶段采用“最小可复现 + 后续补强”策略：

- Phase-1（本次）：执行目标测试与类型门禁，确保双轨行为正确且无类型退化。
- Phase-2（后续 task）：补齐 Node 侧 watcher/perf 套件证据（before/after/diff），落盘到 `specs/094-selectorgraph-watcher-dual-track/perf/`。

建议命令（Phase-2）：

- `pnpm perf collect -- --profile default --out specs/094-selectorgraph-watcher-dual-track/perf/before.<sha>.<env>.default.json`
- `pnpm perf collect -- --profile default --out specs/094-selectorgraph-watcher-dual-track/perf/after.<sha>.<env>.default.json`
- `pnpm perf diff -- --before ... --after ... --out specs/094-selectorgraph-watcher-dual-track/perf/diff...json`

## Project Structure

### Documentation (this feature)

```text
specs/094-selectorgraph-watcher-dual-track/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
└── FlowRuntime.ts

packages/logix-core/test/Flow/
└── FlowRuntime.fromState.ReadQuery.test.ts
```

**Structure Decision**: 第一阶段严格收敛到 `FlowRuntime.fromState` + 单测，不扩散到其他 runtime 文件。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| None | N/A | N/A |
