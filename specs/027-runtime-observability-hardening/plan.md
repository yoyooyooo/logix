# Implementation Plan: 运行时可观测性加固（事务链路贯穿 + Devtools 事件聚合器性能/内存 + 快照订阅契约）

**Branch**: `[027-runtime-observability-hardening]` | **Date**: 2025-12-23 | **Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/spec.md`  
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/027-runtime-observability-hardening/spec.md`

## Summary

- 在“事务入队 → 执行”的队列边界补齐诊断作用域的传播，使由 Flow/回写触发的事务能够贯穿同一条可解释链路，并继承调用点的运行时标签/诊断分档/局部输出通道。
- 将 Devtools 事件聚合器的事件窗口实现从高频线性搬移优化为均摊常数开销，并补齐实例销毁后的派生缓存回收，确保长时间运行内存可控。
- 定义“快照变更检测契约”，使外部订阅者能够可靠判断快照变化而不丢更新，同时保持默认低成本与可序列化约束。

## Technical Context

**Language/Version**: TypeScript 5.8.2 + Node.js 22.x  
**Primary Dependencies**: effect 3.19.13 + `@logixjs/*`（`@logixjs/core` / `@logixjs/devtools-react` / `@logixjs/sandbox`）  
**Storage**: N/A（无持久化存储）  
**Testing**: Vitest + `@effect/vitest`（Effect-heavy 单测优先）  
**Target Platform**: Node.js 22+ + 现代浏览器（React/Sandbox 场景）  
**Project Type**: pnpm workspace（packages + examples + apps）  
**Performance Goals**:

- 热路径：事务入队（enqueueTransaction）、事件聚合器写入（devtoolsHubSink.record）、快照派生/清理。
- 预算：在诊断关闭/最低分档下，高频入口吞吐回归 ≤ 2%（对齐 spec 的 SC-005）；在事件窗口满载持续写入场景下，追加/淘汰的均摊开销与窗口大小无关（对齐 spec 的 FR-004/SC-002）。
- 测量方式：补齐可复现的 micro-benchmark（Node.js）与回归对比输出：
  - enqueueTransaction：固定次数入队 + 等待完成，统计 wall-time 与内存曲线；
  - devtoolsHubSink：固定次数事件写入，分别在窗口未满/已满时测吞吐。
  - 输出落点：raw JSON 固化到 `specs/027-runtime-observability-hardening/perf/`，并将关键结论/指标摘要回写到 `specs/027-runtime-observability-hardening/plan.md`。
    **Perf Evidence (Phase 4)**:
- Baseline script：`pnpm perf bench:027:devtools-txn`
- Raw JSON：`specs/027-runtime-observability-hardening/perf/after.worktree.r1.json`
  - SC-002（100k 写入，window 500→5000）p50 比值：`1.056`（≤ `1.1`）
    **Constraints**:
- 稳定标识：instance/txn/op/link 等不得依赖随机/时间作为 id 源（除 timestamp 元信息）。
- LinkId 生成：当调用点无现有链路时，必须在 instance 范围内以单调序号等稳定信息派生（可确定重建），禁止默认使用 Date.now()/随机数作为唯一 id 源。
- SnapshotToken/订阅：`DevtoolsSnapshot` 可保持稳定引用（mutable view，零拷贝）；任何对外可见变化必须推动 `snapshotToken` 单调变化，且不得出现“token 未变但快照对外可见字段发生变化”的情况。通知默认以 microtask 合并（延迟上界=一次 microtask flush）。
- 事务窗口：同步边界，禁止异步边界与外部 IO；长链路必须拆分为多入口事务。
- 可导出事件：载荷必须 Slim 且可序列化；诊断禁用时近零额外开销。
- 事件窗口/派生缓存：必须有容量上界与回收策略，避免无界增长。
  **Scale/Scope**:
- 目标覆盖高频事件（≥ 100,000 条）与长时间运行（≥ 10,000 次实例 create/destroy）两类场景；
- bufferSize 典型范围：500–5,000（允许更大，但必须有上界与成本模型）。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
    - 本特性属于 Runtime/Tooling 层：通过 FiberRef/Runtime Services 传播诊断作用域，保证 Flow/Logix 的边界操作与事务执行在 Devtools/证据导出中可被稳定串联与解释。
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
    - 依赖并需要同步校对：`/Users/yoyo/Documents/code/personal/intent-flow/.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`（DevtoolsHub/DevtoolsSnapshot/订阅契约）。如涉及导出协议字段，将对齐 `specs/005-unify-observability-protocol/contracts/*` 的裁决口径。
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
    - 是：将新增/固化“快照变更检测契约”（例如变更令牌/版本号）与“事务队列作用域传播”口径；需要在 `.../observability/09-debugging.md` 追加说明与示例用法。
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
    - 不改变统一最小 IR 的结构；仅补齐 Dynamic Trace 的贯穿（linkId/labels/sinks 的传播），确保锚点不漂移。
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
    - 不新增任何默认随机/时间 id 源；链路标识沿用现有稳定模型并通过队列边界传播；需要在 09-debugging 与相关草案/规范中保持一致口径。
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
    - 本特性不引入事务窗口内 IO；所有改动需保持“事务窗口纯同步”不变量，并避免引入可写逃逸点。
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
    - 作用域传播以最小 FiberRef 集合实现（不捕获整包 Context）；如需新增能力，应通过 Runtime Services 显式注入并可在测试中替换。Devtools 事件聚合器仍为全局单例，但其对外导出必须保持 Slim/可序列化，且不成为 EvidencePackage 的硬依赖。
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
    - 热路径：enqueueTransaction、devtoolsHubSink.record、快照派生/清理；将补齐 micro-benchmark 基线并在任务阶段加入回归对比产物（before/after）。
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
    - 变化点：链路贯穿（linkId 不再断裂）、快照订阅契约（可检测变化）、事件窗口与 latest\* 缓存的可控性；诊断启用时成本以窗口大小与事件密度为主要变量，需在 research.md 中给出粗粒度成本模型。
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
    - 将在 09-debugging 增补“事件窗口/快照订阅/链路贯穿”的关键词与成本模型（并明确窗口是 Recording Window，不等于 run 全量历史）。
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
    - 预期为增量变更（新增契约/修复语义），如发现需要破坏性调整，将在本 feature 的 plan/tasks 中给出迁移说明（不提供兼容层）。
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?
    - 质量门：`pnpm typecheck`、`pnpm lint`、`pnpm test`，以及 `pnpm -C packages/logix-core test`；核心验收：spec 的 SC-001–SC-006 可通过单测/基准/可复现脚本验证。

## Project Structure

### Documentation (this feature)

```text
specs/027-runtime-observability-hardening/
├── plan.md              # This file ($speckit plan command output)
├── research.md          # Phase 0 output ($speckit plan command)
├── data-model.md        # Phase 1 output ($speckit plan command)
├── quickstart.md        # Phase 1 output ($speckit plan command)
├── perf/                # Phase 4 output (raw perf JSON evidence)
├── contracts/           # Phase 1 output ($speckit plan command)
│   └── devtools-snapshot.graphql
└── tasks.md             # Phase 2 output ($speckit tasks command - NOT created by $speckit plan)
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/ModuleRuntime.txnQueue.ts
packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts
packages/logix-core/src/internal/runtime/core/DebugSink.ts
packages/logix-core/src/internal/runtime/EffectOpCore.ts

packages/logix-core/test/* (新增/补齐覆盖：链路贯穿、窗口性能与清理语义)
packages/logix-devtools-react/src/snapshot.ts (如需补齐外部订阅安全的用法示例)

.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md (契约与心智模型更新)
```

**Structure Decision**: 本特性主要改动集中在 `packages/logix-core` 的 Runtime/Devtools 热路径；如快照订阅契约对 UI 有影响，`packages/logix-devtools-react` 仅做薄适配与用例覆盖；对外口径以 09-debugging 为准。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无已知违例。

## Phase 0 - Outline & Research

输出：`research.md`

- 决定事务队列边界的最小作用域传播集合（linkId/runtimeLabel/diagnosticsLevel/debug sinks/txn overrides）与 linkId 缺省生成策略（确定性、可回放）。
- 决定事件窗口（ring buffer）在满载写入下的均摊常数策略（避免持续 `shift()`）。
- 决定实例销毁后的派生缓存回收策略（latestStates/latestTraitSummaries）。
- 决定快照变更检测契约（SnapshotToken）与订阅一致性语义。
- 决定 micro-benchmark 基线与回归证据采集方案（热路径：enqueueTransaction / hub record / cleanup）。

## Phase 1 - Design & Contracts

输出：`data-model.md`、`contracts/`、`quickstart.md`

- 固化 DiagnosticsScope / DevtoolsSnapshot / SnapshotToken 等核心实体与键（并明确哪些是 Recording Window 视图、哪些是累计计数）。
- 固化 DevtoolsSnapshot 的对外订阅契约（GraphQL logical API），便于跨宿主桥接与 UI 侧实现。
- 固化 SnapshotToken 的递增触发列表与通知合并策略的观察延迟上界（默认 microtask 合并；最大延迟可解释且可度量）。
- 固化 quickstart 验收步骤（链路贯穿 / 窗口性能 / 缓存回收 / 订阅不丢更新）。

## Phase 1 - Constitution Re-check (Post-Design)

- 设计不改变统一最小 IR，仅补齐 Dynamic Trace 的贯穿与解释链路（linkId/sinks/labels）。
- 确定性标识保持稳定（不新增默认随机/时间 id 源作为唯一身份）。
- 事件载荷与导出边界保持 Slim & 可序列化（对齐 005 observability protocol + JsonValue hard gate）。
- 热路径改动均有对应的基线/回归证据计划（micro-benchmark + 单测）。

## Phase 2 - Tasks (Planning Only)

输出：`tasks.md`

- Runtime 实现任务拆分：txnQueue 作用域传播、DevtoolsHub 窗口与回收、SnapshotToken/订阅契约与 UI 薄适配、文档与基线。
