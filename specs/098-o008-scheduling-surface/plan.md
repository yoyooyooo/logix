# Implementation Plan: O-008 调度平面统一（Scheduling Surface）

**Branch**: `098-o008-scheduling-surface` | **Date**: 2026-02-25 | **Spec**: `specs/098-o008-scheduling-surface/spec.md`
**Input**: Feature specification from `specs/098-o008-scheduling-surface/spec.md`

## Summary

本特性把 `txnQueue + TickScheduler + ConcurrencyPolicy` 三处分散决策收敛为单一 scheduling policy surface：

- 一次调度决策窗口内只使用一份策略快照，避免 queue/tick/concurrency 语义漂移。
- backlog / degrade / recover 诊断事件与真实调度行为强绑定，做到“一条事件对应一条行为事实”。
- 保持 forward-only：不保留旧语义兼容层；通过迁移说明引导从分散入口迁移到统一策略面。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-9, NS-10
- **Kill Features (KF)**: KF-5, KF-8

## Dependencies

- `specs/021-limit-unbounded-concurrency/`（并发控制面、backpressure 与诊断基础）
- `specs/073-logix-external-store-tick/`（tick 调度与降级路径既有语义）
- Runtime SSoT：`docs/ssot/runtime/logix-core/*`（调度与诊断协议）

## Technical Context

**Language/Version**: TypeScript 5.8.2（workspace）
**Primary Dependencies**: effect v3.19.13、`@logixjs/core`、`@effect/vitest`、Vitest 4
**Storage**: N/A（运行时内存与诊断事件）
**Testing**: `vitest run`（core 单测 + Effect tests）
**Target Platform**: Node.js 20+（CI） + modern browsers（诊断消费侧）
**Project Type**: pnpm workspace（packages/apps/examples）
**Performance Goals**:

- 调度热路径（enqueue + tick flush + policy resolve）在 diagnostics=off 下开销回归 ≤ 5%
- backlog/degrade 事件对齐准确率 100%
- 策略快照一致性在测试中 100%
  **Constraints**:
- 事务窗口禁止 IO
- 稳定标识：instanceId/txnSeq/opSeq 不可随机化
- 诊断事件必须 slim、可序列化、可降噪
- 统一最小 IR（Static IR + Dynamic Trace）不新增并行真相源
  **Scale/Scope**:
- 仅覆盖 logix-core runtime 调度内核 + 对应中文文档
- 不扩展新 DSL，不引入第二运行时

## Constitution Check

_GATE: 进入实现前必须 PASS；Phase 1 设计后复核一次。_

### Pre-Implementation Gate

- **NS/KF 对齐**: PASS。`spec.md` 已标注 NS-9/NS-10 与 KF-5/KF-8。
- **Intent → Flow/Logix → Code → Runtime 映射**: PASS。O-008 只动 Runtime 决策面与诊断协议，不改 Intent 表达层。
- **docs-first / SSoT**: PASS。先落 `spec/plan/research/data-model/contracts/quickstart`，实现后同步 runtime 中文文档。
- **Effect/Logix 契约变更**: PASS（受控）。若事件字段变化，将同步 `docs/ssot/runtime/logix-core/observability/*` 与用户文档。
- **IR/锚点漂移点**: PASS（有风险点）。风险点为 backlog/degrade 事件 reason 与 tick boundary 映射；通过统一事件 schema + 回归测试防漂移。
- **稳定标识**: PASS。所有调度事件复用 `instanceId/txnSeq/opSeq/moduleId`，禁止 wall-clock/random 做主锚。
- **事务窗口禁止 IO**: PASS。等待/yield 继续限定在事务外；若发现穿透将作为阻断缺陷处理。
- **Performance 预算**: PASS。预算为吞吐/延迟/内存回归 ≤ 5%，并执行 before/after/diff。
- **诊断成本**: PASS。事件保持 slim + cooldown；diagnostics off 路径不新增重分配。
- **迁移说明（forward-only）**: PASS。破坏性语义通过 quickstart + 文档迁移段说明，不留兼容层。
- **Quality Gates**: PASS。合并前必须通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`。

### Post-Design Re-check（Phase 1 后）

- 统一策略实体与事件 schema 已落 `data-model.md` 与 `contracts/*`。
- 风险点（IR/锚点/诊断成本/迁移）均有显式落点，可进入实现。

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后（before/after）
- envId：`darwin-arm64.node20.chrome-headless`（按实际采集机回填）
- profile：`default`（交付），必要时 `soak` 复测
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/098-o008-scheduling-surface/perf/before.<sha>.<envId>.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/098-o008-scheduling-surface/perf/after.<sha|worktree>.<envId>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/098-o008-scheduling-surface/perf/before.<sha>.<envId>.default.json --after specs/098-o008-scheduling-surface/perf/after.<sha|worktree>.<envId>.default.json --out specs/098-o008-scheduling-surface/perf/diff.before.<sha>__after.<sha|worktree>.<envId>.default.json`
- Failure Policy：`comparable=false` 禁止给结论；出现 `stabilityWarning/timeout/missing suite` 必须同 profile 复测

## Project Structure

### Documentation (this feature)

```text
specs/098-o008-scheduling-surface/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── scheduling-policy-surface.schema.json
│   └── scheduling-diagnostic-event.schema.json
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── ModuleRuntime.concurrencyPolicy.ts
├── ModuleRuntime.txnQueue.ts
├── TickScheduler.ts
├── ConcurrencyDiagnostics.ts
└── ModuleRuntime.dispatch.ts

packages/logix-core/test/internal/Runtime/
├── ConcurrencyPolicy/
│   ├── ConcurrencyPolicy.DiagnosticsDegrade.test.ts
│   ├── ConcurrencyPolicy.PressureWarning.test.ts
│   └── (新增) ConcurrencyPolicy.SchedulingSurface.test.ts
├── ModuleRuntime/
│   └── (新增/扩展) ModuleRuntime.txnQueue.*.test.ts
└── TickScheduler.*.test.ts

apps/docs/content/docs/guide/advanced/
└── concurrency-policy.cn.md
```

**Structure Decision**:

- 语义改动集中在 `core/*`，浅层 `src/internal/runtime/*.ts` 仅保留 re-export。
- 测试优先补在已有 Runtime/ConcurrencyPolicy 测试簇，避免新建并行测试真相源。
- 文档仅更新中文版本（按仓库约束）。

## Complexity Tracking

无强制违规项。若实现中出现 >1000 LOC 文件继续膨胀，将按 module-decomposition 规则拆分并在本节补记录。
