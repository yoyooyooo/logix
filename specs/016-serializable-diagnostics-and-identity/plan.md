# Implementation Plan: 016 可序列化诊断与稳定身份（Observability Hardening）

**Branch**: `[016-serializable-diagnostics-and-identity]` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/016-serializable-diagnostics-and-identity/spec.md`

## Summary

把 005/011/013 的横切硬约束收敛成一个可验收的“协议与锚点整改包”：

- 导出/跨宿主事件必须满足协议层 JsonValue（JSON 硬门）
- `instanceId` 成为唯一实例锚点（移除双锚点）
- 错误原因统一降级为 `SerializableErrorSummary`，并显式标记 `downgrade.reason`
- 诊断分档 `off|light|full`：默认 off 近零成本；启用时可裁剪且有体积预算
- 收口“可导出 meta”口径：仅承诺 Slim JsonValue（或结构化白名单），并提供开发态可行动的裁剪告警，避免 meta 成为“写了但导不出去”的隐形糖

本特性是 005/011/013/016 的统筹入口：后续实施以 `specs/016-serializable-diagnostics-and-identity/tasks.md` 为唯一入口，避免多入口并行推进造成口径漂移与回放不可证。

## Technical Context

**Language/Version**: TypeScript 5.8.2（ESM） + Node.js 20+  
**Primary Dependencies**: effect v3、`@logixjs/core`（DebugSink/DevtoolsHub/Runtime identity）、`@logixjs/react`（RuntimeProvider onError）、`specs/005`（协议 contracts）、`specs/009`（稳定标识与 trace）、`specs/011`（error summary + lifecycle status）、`specs/013`（trait:* 证据）  
**Storage**: N/A（内存态 ring buffer / 聚合快照；导出为 JSON evidence package）  
**Testing**: Vitest（Effect-heavy 用例可用 `@effect/vitest` 风格）；React 侧沿用 Testing Library/集成用例  
**Target Platform**: Node.js 20+（runtime/test/perf）+ modern browsers（React/Devtools 消费）  
**Project Type**: pnpm workspace monorepo（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**: 以 `spec.md` 的 `SC-003` 为准；基线口径对齐 009（30 次、丢弃前 5 次 warmup，报告 p50/p95 + 至少一类开销指标），结果记录在 `specs/016-serializable-diagnostics-and-identity/perf.md`  
**Constraints**: 事务窗口禁 IO/await；统一最小 IR（Static IR + Dynamic Trace）；稳定标识对齐 009（instanceId/txnSeq/opSeq/eventSeq 与确定性派生 id）；诊断事件 Slim 且可序列化；拒绝向后兼容（迁移说明替代兼容层）  
**Scale/Scope**: 以 “高频事务 + 高频事件” 为压测基线：单进程内 1–16 个实例并行；每实例 10k–100k 次事务循环（参数化）；ring buffer 容量默认 500（可配）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `docs/ssot/runtime/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

### Answers (Current)

- **Intent → Flow/Logix → Code → Runtime**：目标是把“观测协议与诊断事件”从宿主内不受控对象图，收敛为可推导、可序列化、可回放的最小事件形态；落点是 `DebugSink` 归一化 + `DevtoolsHub` 只持有可导出事件 + evidence package（后续）导出导入。
- **Docs-first & SSoT**：先固化 `specs/016/*`（contracts/data-model/migration/perf）与 runtime SSoT（`docs/ssot/runtime/*`），再进入 `packages/logix-*` 实现；协议层以 `specs/005` 的 schema 为唯一裁决源。
- **Contracts**：会修改/扩展 `RuntimeDebugEventRef` 的可导出形态（JsonValue 硬门、errorSummary/downgrade、单锚点），并对齐 `module-instance-identity`/`error-summary`（复用 011 schema）。
- **IR & anchors**：不引入第二套锚点/并行真相源；导出/跨宿主只认 `moduleId + instanceId`；事务/事件标识对齐 009（`txnSeq/opSeq/eventSeq` + 可确定性派生 id）。
- **Deterministic identity**：禁止默认随机/时间作为主标识；`instanceId` 可注入且缺省为单调序号兜底；`txnId/eventId` 必须由序号确定性派生（或显式携带序号字段作为等价集合）。
- **Transaction boundary**：任何进入事务窗口的路径保持纯同步（无 IO/await）；诊断归一化/JsonValue 投影不得在 off 档位进入热路径。
- **Performance budget**：热路径包括 `Debug.record → toRuntimeDebugEventRef`、`DevtoolsHub` ring buffer 写入、（启用诊断时）JsonValue 投影/裁剪；基线与阈值以 `perf.md` 的脚手架与结果为准，默认 off 档位门槛 p95 ≤ +5%。
- **Diagnosability & explainability**：新增/强化 `errorSummary/downgrade`、非法 lifecycle phase 的 `logic::invalid_phase` 诊断、以及 off/light/sampled/full 分档的 dropped/oversized 统计（并保证载荷 Slim 且可序列化）。
- **Breaking changes**：移除双锚点字段；`$.lifecycle.*` 调整为 setup-only 注册；迁移说明写入 `specs/016-serializable-diagnostics-and-identity/migration.md`（不提供兼容层）。
- **Quality gates**：至少运行 `pnpm typecheck`、`pnpm lint`、`pnpm test`；触及核心路径的变更需补齐 `perf.md` 中的可复现基线与对比结果（off/light/sampled/full）。

## Project Structure

### Documentation (this feature)

```text
specs/016-serializable-diagnostics-and-identity/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── perf.md
├── quickstart.md
├── migration.md
├── tasks.md
└── contracts/
```

### Source Code (repository root)
```text
packages/logix-core/src/internal/runtime/core/DebugSink.ts        # Debug.Event -> RuntimeDebugEventRef（导出边界/降级）
packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts      # ring buffer / latestStates / snapshot（只持有可导出形态）
packages/logix-core/src/internal/runtime/core/StateTransaction.ts # txnSeq/opSeq/txnId 确定性派生
packages/logix-core/src/internal/runtime/ModuleRuntime.ts         # instanceId 注入/贯穿 + 事务/事件元信息
packages/logix-core/src/internal/runtime/BoundApiRuntime.ts       # lifecycle setup-only phase guard + 诊断事件
packages/logix-core/src/internal/runtime/core/Lifecycle.ts        # initProgress + init/destroy 语义（对齐 011）
packages/logix-core/src/internal/observability/jsonValue.ts       # JsonValue 投影/裁剪（预算/循环引用）
packages/logix-core/src/internal/state-trait/meta.ts              # TraitMeta（Slim/可导出）+ sanitize（裁剪规则）
packages/logix-react/src/components/RuntimeProvider.tsx           # onError context 单锚点（Deferred 交付面）
packages/logix-devtools-react/src/state/compute.ts                # 消费面以 instanceId 聚合（Deferred 交付面）
apps/docs/content/docs/**                                         # 用户文档迁移（Deferred 交付面）
```

**Structure Decision**: 本仓为 pnpm workspace monorepo；本特性优先修改 `packages/logix-core` 的核心观测链路，并在相关适配层（React/Devtools/docs）做口径收敛与迁移。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

（无）
