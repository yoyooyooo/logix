---
title: Runtime v3 Core · 架构与性能（收敛）
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - ../runtime-observability/README.md
  - ../runtime-middleware-and-effectop/README.md
  - ../react-adapter/README.md
  - ../../../../../specs/014-browser-perf-boundaries/perf.md
  - ../../../../../specs/016-serializable-diagnostics-and-identity/spec.md
---

# Runtime v3 Core · 架构与性能（收敛）

> 目标：只保留能直接指导实现/回归的内容，把 Runtime 的“性能红利”与“可诊断证据链路”锁死在同一套内核不变量上。
>
> 本 Topic 取代并收编历史草案：`runtime-architecture-v3` 与 `runtime-performance-architecture`（细节交给 Git 历史）。

## 范围（Scope）

- 事务窗口/热路径：同步、零 IO、可回放；patch/dirty-set 与 converge 触发的最小代价。
- 稳定锚点：`moduleId + instanceId + txnSeq/opSeq` 的分配、传播与对外导出。
- 诊断与证据：`DiagnosticsLevel=off` 近零成本；`light/full` 可解释且可裁剪（JsonValue）。
- React 适配：StrictMode/Suspense 下的 ModuleCache（Acquire→Retain→Release→GC）与 key 语义。
- 回归门禁：014 跑道（browser perf boundaries）与 watcher/泄漏压力测试。

## 读这套 Topic 的方式

- 只讨论“不变量 / 现有实现落点 / 下一步 ROI 工作”。
- 任何触及核心路径的改动必须能回到 014 跑道做 Before/After 对照。

## 代码落点速查（与本文档对齐）

- 事务窗口：`packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- EffectOp（带 opSeq 的结构化边界）：`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`
- converge：`packages/logix-core/src/internal/state-trait/converge.ts`
- source trait：`packages/logix-core/src/internal/state-trait/source.ts`
- Debug/Diagnostics 开关：`packages/logix-core/src/Debug.ts`、`packages/logix-core/src/internal/runtime/core/DebugSink.ts`
- Devtools evidence 导出：`packages/logix-core/src/Observability.ts`
- React ModuleCache：`packages/logix-react/src/internal/ModuleCache.ts`
- React useModule 选项与 key 生成：`packages/logix-react/src/hooks/useModule.ts`

## 文档列表

- `00-invariants-and-gates.md`：硬约束与门禁（014、DiagnosticsLevel/DebugMode/Txn instrumentation）
- `01-transaction-identity-and-trace.md`：事务/锚点/trace 如何在代码里贯穿
- `02-react-modulecache-and-lifecycle.md`：React 侧生命周期与 cache 语义（StrictMode/Suspense）
- `03-perf-regression-suite.md`：高 ROI 的回归用例清单（watcher/泄漏/diagnostics overhead）

## 近期 ROI（只保留“能落地”的）

- 把 watcher/泄漏压力测试变成可回归的用例（见 `03-perf-regression-suite.md`）。
- 为 ModuleCache 增加显式 eviction（`evict(key)` / `clear()`）与错误态更短 GC 策略。
- 补齐 React Platform lifecycle（onSuspend/onResume/onReset）的最小接线与测试（对齐事务窗口“禁止 IO”与降载策略）。
