---
description: "Migration notes for 016-serializable-diagnostics-and-identity (instanceId anchor + serializable diagnostics + lifecycle setup-only)"
---

# Migration: 016 可序列化诊断与稳定身份

> 本文记录本特性的破坏性变更与迁移要点；不提供兼容层。

## 1. 实例锚点：仅保留 `instanceId`

### 发生了什么

- `instanceId` 成为唯一实例锚点（导出/跨宿主事件与聚合主键）。
- 不再存在“第二锚点字段”，且不提供兼容读取。

### 你需要做什么

- 所有对外事件/回调/聚合 key：统一改为 `moduleId + instanceId`。
- 任何缺失 `instanceId` 的旧 payload 视为不可导入（本仓当前不需要历史兼容）。

## 2. 可导出事件的 JSON 硬门：`meta` 必须是 `JsonValue`

### 发生了什么

- “宿主内原始对象”与“可导出/跨宿主负载”之间建立硬边界：
  - 宿主内允许携带 `unknown`（例如 `cause/state/closure`）用于日志/本地调试；
  - 可导出事件/ring buffer/证据包禁止写入不可 JSON 序列化对象图。
- 错误原因统一降级为 `SerializableErrorSummary`，并可附带 `downgrade.reason`（`non_serializable | oversized | unknown`）。

### 你需要做什么

- 不要把 `Cause/Error/DOM/BigInt/function/class instance` 等对象写入可导出事件 `meta`。
- 需要上报错误时，写入 `errorSummary`（以及必要的裁剪字符串），而不是透传原始 `cause`。

## 3. Lifecycle：`$.lifecycle.*` 改为 setup-only 注册

### 发生了什么

- `$.lifecycle.*` 从“run 段可调用”调整为 **setup-only 注册 API**：
  - setup 段：注册钩子（注册 ≠ 执行）；
  - run 段：禁止调用；调用会触发 `logic::invalid_phase` 且可被导出诊断捕获。
- Runtime 统一调度：
  - `onInit`：blocking 串行执行（在 fork run fibers 之前）
  - `onDestroy`：LIFO best-effort 执行（Scope 关闭时）

### 你需要做什么

- 把所有 `yield* $.lifecycle.*(...)` 从 run 段移出，改成 setup 段同步注册：
  - ✅ `Module.logic(($) => { $.lifecycle.onInit(eff); return Effect.gen(...run...) })`
  - ❌ `Module.logic(($) => Effect.gen(function* () { yield* $.lifecycle.onInit(eff) }))`

## 4. 验收门槛（迁移完成的定义）

- 任意可导出事件与 DevtoolsHub snapshot 必须可 `JSON.stringify`；
- 任意导出/跨宿主事件必须包含 `instanceId`；
- off 档位性能门槛：见 `specs/016-serializable-diagnostics-and-identity/perf.md`（默认 p95 ≤ +5%）；
- `apps/docs` 中不再出现 run 段 `yield* $.lifecycle.*` 与不存在的 `$.lifecycle.onReady` 示例；
- Devtools 交付面（组件/015/Chrome 插件）整体推迟到 core hardening 稳定后推进。
