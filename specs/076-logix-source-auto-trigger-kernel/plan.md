# Implementation Plan: Source Auto-Trigger Kernel（dirtyPaths + depsIndex）

**Branch**: `076-logix-source-auto-trigger-kernel` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/076-logix-source-auto-trigger-kernel/spec.md`

## Summary

把 “source 自动刷新” 从 feature 包的 watcher 胶水（监听 action / 反查 trait）下沉到 `@logixjs/core` 内核：

- 以 `dirtyPaths + depsIndex` 增量定位受影响 sources（避免线性扫描）；
- 将 onMount/onDepsChange + debounce 的受限控制律固化为内核语义（可诊断/可回放/可预算，且对齐 tick 参考系）；
- 迁移 `@logixjs/query`/`@logixjs/form`：删除/收敛默认 auto-trigger 逻辑，只保留显式手动 refresh 作为 escape hatch；
- 明确边界：复杂工作流（delay/retry/timeout/分支）升级到 075 FlowProgram（不强塞进 trait meta）。

## 073/075 对齐（防漂移）

- 参考系：以 073 的 `tickSeq` 定义“同时性”；任何自动触发/时间语义必须能归因到 tick 证据链（禁止影子时间线）。
- 分层：Trait 描述绑定事实（受限几何）；Source Auto-Trigger 是内核提供的 `Π_source`；通用 `Π_general` 由 075 FlowProgram 提供。
- 事务：事务窗口禁 IO；auto-trigger 只能 enqueue/dispatch；真正 IO 由 source refresh runtime 在窗口外执行。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM；以仓库 `package.json` 为准）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@logixjs/core`、（迁移包）`@logixjs/query`、`@logixjs/form`  
**Storage**: N/A  
**Testing**: Vitest（Effect-heavy 优先 `@effect/vitest`）  
**Target Platform**: Node.js 20+ + modern browsers（若需要浏览器 perf 证据则复用 073 的矩阵）  
**Performance Goals**: 每次提交 `O(|dirtyPaths| + |affectedSources|)`；diagnostics=off 近零成本；debounce 不引入无界 fiber 洪峰  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）；稳定标识（tickSeq/instanceId/txnSeq/opSeq）；事务窗口禁 IO；禁止“从静态里推断动态”的反射式胶水  

## Constitution Check（对齐口径）

- Intent→Flow/Logix→Code→Runtime：本特性属于 Runtime/Logix 内核（source 绑定的受限控制律）。
- SSoT：形式化模型与分层裁决见 `docs/ssot/platform/contracts/00-execution-model.md` 的 “1.2 最小系统方程”。
- IR：source 的 policy 必须可导出为 Static IR（用于解释与 diff），动态只输出锚点与摘要（见 `contracts/ir.md`）。
- 时间语义：debounce 必须可观测/可回放（timer schedule/cancel/fired 进入 trace 或能归因 tickSeq）。
- 性能：禁止 per-commit 扫描所有 source；禁止在热路径分配大对象；需要 perf evidence。
- 破坏性变更：forward-only，无兼容层；迁移说明写入 `contracts/migration.md`。

## Plan

### Phase 1: Contracts & API（先固化语义）

- 定义 `StateTrait.source` 的 auto-trigger policy（替代现有 `triggers/debounceMs` 的反射式解释口径）。
- 统一触发语义与默认值：
  - 默认开启 onMount + onDepsChange；
  - `autoRefresh: false` 表示 manual-only（仍允许显式 `traits.source.refresh`）。
- 在 StateTrait Static IR 中补齐 policy 输出（复用 `policy` 字段，不新增平行 IR）。

### Phase 2: Core Implementation（depsIndex + kernel）

- 在 TraitProgram build 阶段预计算 `depsIndex`（depFieldPathId → affectedSourceFieldPathId[]）。
- 在 module commit/tick 边界消费 `dirtyPaths`：
  - canonicalize 到 pattern path / fieldPathId；
  - 查 `depsIndex` 得到 affected sources；
  - 按 policy 触发 refresh（含 debounce 合并/可取消）。
- 诊断事件：
  - diagnostics=off：不产生 trace；
  - diagnostics=light/sampled/full：输出 Slim 事件（reason + affectedCount + debounceStats + tickSeq）。

### Phase 3: Migrations（消灭胶水）

- `@logixjs/query`：
  - 移除 `auto-trigger` watcher（或退化为纯 manual helper）。
  - source refresh 实现内部吸收“cache peek skip loading”（避免 UI jitter），不再需要外层 hydrate watcher。
- `@logixjs/form`：
  - 移除对 `TraitLifecycle.makeSourceWiring` 的依赖（或让其成为 core 内部实现）。

### Phase 4: Evidence & Gates（收口）

- perf collect/diff：对比 “旧胶水 watcher” vs “内核 auto-trigger” 的提交成本与 debounce 合并成本。
- workspace 质量门：typecheck/lint/test。

## Perf Evidence Plan（MUST）

Baseline 语义：before=当前 Query/Form 方案（action-wiring）；after=内核 auto-trigger。

- envId/profile：沿用 073 的 perf matrix（至少 1 组可对比证据）
- 点位最小要求：
  - 高频输入（模拟 params 每 16ms 更新）+ debounce=200ms：比较提交成本与触发次数
  - 大量 source（≥1000）+ 小 dirtyPaths：验证 `O(|dirtyPaths|+|affected|)`，禁止线性扫描退化

Failure Policy：同 073（`comparable=false` 禁止下硬结论）。

## Project Structure

### Documentation (this feature)

```text
specs/076-logix-source-auto-trigger-kernel/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── public-api.md
    ├── ir.md
    ├── diagnostics.md
    └── migration.md
```

### Source Code (repository root)（拟定落点）

```text
packages/logix-core/
├── src/
│   ├── StateTrait.ts                          # UPDATE: source policy surface
│   └── internal/
│       ├── state-trait/build.ts               # UPDATE: precompute depsIndex
│       ├── trait-lifecycle/index.ts           # UPDATE/REPLACE: remove reflective makeSourceWiring
│       └── runtime/core/SourceAutoTrigger.ts  # NEW: consume dirtyPaths + schedule refresh (tick-aware)
├── test/
│   └── internal/runtime/SourceAutoTrigger.*.test.ts

packages/logix-query/
├── src/
│   ├── Traits.ts                              # UPDATE: stop lowering triggers/debounce into StateTrait meta
│   └── internal/logics/auto-trigger.ts        # DELETE or reduce to manual helper
└── test/
    └── Query.AutoTriggerKernel.*.test.ts
```
