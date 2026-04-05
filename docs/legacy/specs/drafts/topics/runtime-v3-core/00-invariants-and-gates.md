---
title: Runtime v3 Core · 不变量与门禁
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - ../../../../../specs/014-browser-perf-boundaries/perf.md
  - ../../../../../specs/016-serializable-diagnostics-and-identity/spec.md
  - ../../../../../specs/009-txn-patch-dirtyset/spec.md
---

# 不变量与门禁（只保留“硬约束”）

## 0. 硬约束（违宪即回退）

- **统一最小 IR**：Static IR + Dynamic Trace；Devtools/Sandbox/Studio 只消费 IR（不接受私有对象图作为事实源）。
- **稳定锚点**：`moduleId + instanceId + txnSeq/opSeq`；禁止默认随机主键作为可导出 id。
- **事务窗口禁止 IO**：`.update/.mutate/reducer` 必须纯同步；任何 await/IO 必须走边界（Task/EffectOp）。
- **业务不可写 `SubscriptionRef`**：业务只能走 Logix API 更新状态，不得拿到底层 ref 直接 set。
- **诊断事件 Slim 且可序列化（JsonValue）**：可导出事件必须过 JsonValue 硬门；`DiagnosticsLevel=off` 必须接近零成本。
- **性能证据必须可复现**：触及核心路径的演进必须能用 014 跑道做 Before/After 对照（同机同配置）。

## 1. 门禁：014 跑道（硬门）

- SSoT：`specs/014-browser-perf-boundaries/perf.md`
- 原则：先跑通“可判定的证据链路”，再讨论任何“优化是否有效”。

## 2. 三类开关（不要混用）

> 这三者控制的是不同层级的成本；写文档/写代码时必须指明“开关属于哪一类”。

1. **DebugSink（宿主输出/兜底）**  
   - API：`Logix.Debug.layer(mode)` / `Logix.Debug.noopLayer`（见 `packages/logix-core/src/Debug.ts`）  
   - 目标：控制 Debug 事件是否进入 console / error-only 等 sink；不等价于“是否导出可序列化证据”。

2. **DiagnosticsLevel（可导出事件裁剪）**  
   - 定义：`"off" | "light" | "full"`（见 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`）  
   - API：`Logix.Debug.diagnosticsLevel(level)`（见 `packages/logix-core/src/Debug.ts`）  
   - 目标：控制 DevtoolsHub 的导出/裁剪策略；`off` 下应尽量做到“零分配/零 Json 投影”。

3. **事务 instrumentation（patch/快照）**  
   - 定义：`StateTxnInstrumentationLevel = "full" | "light"`（见 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`）  
   - 目标：控制事务内是否保留完整 patch 与 initial/final snapshot；`light` 仍需保留 `dirtyPaths` 以支撑增量调度。

## 3. 新增/改动核心路径的自检清单

- 事务窗口内是否引入了 await/Promise/IO？（必须为否）
- 是否在热循环里引入字符串解析/动态 `typeof` 分支？（必须为否，做 fast/slow lane 拆入口）
- 是否新增了可导出事件？是否满足 JsonValue + Slim？（必须为是）
- 是否能在 014 跑道上形成可判定的 Before/After？（必须为是）

