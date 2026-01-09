# Implementation Plan: 事务性能控制（dirty-set/单事务同步收敛/显式 batch & 低优先级/最佳实践）

**Branch**: `[019-txn-perf-controls]` | **Date**: 2025-12-20 | **Spec**: `specs/019-txn-perf-controls/spec.md`
**Input**: Feature specification from `specs/019-txn-perf-controls/spec.md`

## Summary

本特性以“性能与可诊断性优先”为北极星，按 ROI/RIO 顺序交付四件事：

1. **Dirty-Set 信息质量**：确保每次事务都有 O(写入量) 的可靠 dirty-set（并消灭 `path="*"` 退化为常态），让 converge/validate 能稳定走增量路径。
2. **同步反应单事务收敛**：把 reducer→同步派生→同步校验写回压进同一事务窗口，保证外部可观察提交（订阅通知 + `state:update`）最多一次。
3. **显式 batch/低优先级旋钮**：为极端高频场景提供 opt-in 的“批处理窗口/低优先级更新”，在不改变默认语义的前提下提供可控降级与明确延迟上界。
4. **用户文档最佳实践**：沉淀 ≤5 关键词 + 成本模型 + 优化梯子 + 反模式 + 排障入口，确保能力可被正确使用与诊断。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM）
**Primary Dependencies**: `effect` v3（当前 ^3.19.8）、`@logixjs/core`、`@logixjs/react`
**Storage**: N/A（内存态，状态载体为 `SubscriptionRef`）
**Testing**: Vitest（`vitest run`）；Effect-heavy 用例优先 `@effect/vitest`
**Target Platform**: Node.js 20+（脚本/基准）；现代浏览器（React/Devtools）
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）
**Performance Goals**:

- 交互可见反馈：代表性场景 p95 ≤ 16ms（以 `spec.md` 的 SC-001 为准）
- 增量派生/校验：小影响域下执行比例 ≤ 20%（SC-002）
- 提交次数：同步反应链路“多次→1 次”（SC-003）
- 回退防线：p95 退化 ≤ 5%，吞吐 ≥ 95% 基线（SC-005）
- 基线/测量方式：复用 `logix-perf-evidence`（统一入口：`pnpm perf`；009/016 的 Node 基线 + 浏览器侧 collect/diff），并为本特性新增/扩展一条可复现基线记录（在 `tasks.md` 阶段落地）
  **Constraints**:
- 事务窗口内禁止 IO/await；所有写入必须入队并产出 dirty-set（宪章硬约束）
- 诊断事件 Slim 且可序列化；诊断关闭时额外开销接近零
- 稳定标识：`instanceId/txnSeq/opSeq/eventSeq`（或等价）必须可复现、可回放
  **Scale/Scope**: 典型 ToB 表单/联动/高频输入场景；以“每次写入影响域小但频率高”为主要压力模型

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：Intent/交互（高频输入/联动）→ Flow/Logix（dispatch + traits converge/validate）→ Code（`ModuleRuntime`/`StateTransaction`/traits + React 外部订阅）→ Runtime（txnQueue 串行化 + 0/1 commit + 诊断事件/trace）。
- 依赖/对齐的 specs：`specs/009-txn-patch-dirtyset`（dirty-set/patch/trace contract）、`specs/013-auto-converge-planner`（converge 事件与缓存证据）、`specs/016-serializable-diagnostics-and-identity`（可序列化诊断与稳定标识）、`specs/015-devtools-converge-performance`（devtools/性能口径）、`specs/014-browser-perf-boundaries`（浏览器侧基线口径）。
- Effect/Logix contracts 变更：若新增“显式 batch/低优先级”公共入口或诊断协议，必须同步更新 `.codex/skills/project-guide/references/runtime-logix/logix-core/*`（observability/runtime）与 `apps/docs` 对应章节；本计划在 Phase 1 先用 `contracts/*` 固化协议，再进入代码实现。
- IR & anchors：不引入第二套真相源；以 009 的 unified minimal IR（Static IR + Dynamic Trace）为底座，通过本特性 `contracts/*` 扩展 trace 元信息（commitMode/priority/dirtyAll 等），避免漂移。
- Deterministic identity：沿用现有 `instanceId + txnSeq` 模型（见 `StateTransaction.beginTransaction`），补齐必要的 `opSeq/eventSeq`（如需）也必须是单调序列且可注入/可复现。
- Transaction boundary：batch/低优先级只允许包裹“纯同步写入”；任何 IO/async 必须在事务外执行并以独立写回事务表达；对违规路径提供可行动诊断。
- Performance budget：热路径为 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`（队列/事务）、`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（commit/patch/dirty-set）、`packages/logix-core/src/internal/state-trait/{converge,validate}.ts`（派生闭包）；基线复用 `pnpm perf bench:009:txn-dirtyset` + `pnpm perf bench:016:diagnostics-overhead`，并补齐本特性专用测量（任务阶段落地）。
- Diagnosability：扩展 `state:update` 与相关 trace 事件的结构化字段（Slim/JsonValue），并保证 `diagnostics=off` 路径不引入 O(n) 扫描；事件与字段以 `contracts/*` 为单一事实源。
- 对外心智模型：在 `quickstart.md` 与后续 `apps/docs` 中固定 ≤5 关键词 + 成本模型 + 优化梯子，并与诊断字段命名一致。
- Breaking changes：默认不改变既有默认语义；若必须调整公共 API 或事件协议，直接破坏式更新并在 `tasks.md` 阶段补齐迁移说明（不做兼容层）。
- 质量门：在实现完成前必须通过 `pnpm typecheck`、`pnpm lint`、`pnpm test`；且新增/变更的 contracts 与文档需能通过评审（命名一致、无漂移）。

## Project Structure

### Documentation (this feature)

```text
specs/019-txn-perf-controls/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   └── schemas/
└── tasks.md             # Phase 2 output ($speckit tasks command)
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/ModuleRuntime.ts
packages/logix-core/src/internal/runtime/core/StateTransaction.ts
packages/logix-core/src/internal/runtime/core/DebugSink.ts
packages/logix-core/src/internal/runtime/core/env.ts
packages/logix-core/src/internal/state-trait/converge.ts
packages/logix-core/src/internal/state-trait/validate.ts
packages/logix-core/src/internal/field-path.ts

packages/logix-react/src/internal/ModuleRuntimeExternalStore.ts

apps/docs/content/docs/            # 用户文档（高性能最佳实践）
```

**Structure Decision**: 本特性属于“runtime hot path + react 集成 + 文档/协议”交付，代码落点以 `packages/logix-core`（事务/traits/诊断协议）为主，`packages/logix-react` 负责消费侧可见性调度（避免非必要 render），并在 `apps/docs` 输出对外最佳实践。
