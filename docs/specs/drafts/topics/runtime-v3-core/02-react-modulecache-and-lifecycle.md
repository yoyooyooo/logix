---
title: Runtime v3 Core · React ModuleCache 与生命周期
status: draft
version: 2025-12-22
value: core
priority: next
related:
  - ../react-adapter/README.md
  - ../../../../../specs/014-browser-perf-boundaries/perf.md
---

# React ModuleCache 与生命周期（StrictMode / Suspense）

本节只保留 React 集成中“影响正确性与性能”的约束：**资源 key、生命周期、GC 与可观测链路**。

## 1. 统一模型：Acquire → Retain → Release → GC

- **Acquire（Render）**：`readSync/read` 命中或创建 Entry，并为该 Entry 创建独立 Effect Scope。
- **Retain（Commit）**：组件 commit 后 `retain(key)`，`refCount++`，取消 GC 定时器。
- **Release（Cleanup）**：组件卸载/依赖变化 `release(key)`，`refCount--`；归零后进入 Idle。
- **GC（Idle 超时）**：当 `refCount===0` 且超过 `gcTime`，关闭 Scope 并删除 Entry。

实现：`packages/logix-react/src/internal/ModuleCache.ts`

## 2. key 语义与选项（对齐 useModule）

### 2.1 默认 key（组件级）

`useModule(Impl)` 默认生成：

- `componentId = React.useId()`（保证 SSR/生产稳定）
- `depsHash = stableHash(deps)`
- `key = impl:${moduleId}:${componentId}:${depsHash}`

实现：`packages/logix-react/src/hooks/useModule.ts`

### 2.2 Suspense key（必须显式）

当 `suspend: true`：

- **必须显式提供 `options.key`**（避免 render abort / 重试导致 key 抖动与资源错绑）。
- `key = ${options.key}:${depsHash}`
- 可选 `initTimeoutMs` 为“初始化 pending”的上界（超时抛错交给 ErrorBoundary）。

实现：`packages/logix-react/src/hooks/useModule.ts`

### 2.3 `gcTime`（保活时间）

- 优先级：调用点 `options.gcTime` > ReactConfig `gcTime` > 默认（500ms，用于 StrictMode 抖动保护）。
- `Infinity` / 非有限数：视为永不自动 GC。
- error 状态：强制使用短周期 GC（避免长期错误缓存卡死重试）。

实现：`packages/logix-react/src/internal/ModuleCache.ts`

## 3. Key Ownership（开发/测试环境强校验）

同一 `ManagedRuntime` 内，**同一个 key 不允许跨不同 ModuleImpl 复用**；否则会造成：

- module/instance 锚点错绑（Devtools 解释链路断裂）
- 资源与 Scope 混用（泄漏/错误复用）

实现：`packages/logix-react/src/internal/ModuleCache.ts`

## 4. 可观测链路（Devtools 绑定）

目前 React 集成侧会发出三类 trace：

- `trace:react.module-instance`：ModuleRuntime 与 React key 的 attach/gc 关系（ModuleCache 内发出）
- `trace:instanceLabel`：调用方 label/key 与 instanceId 绑定（useModule 内发出）
- `trace:react-render`：组件 commit 级 render trace（useModule 内发出，避免被 useSelector 数量放大）

实现：`packages/logix-react/src/internal/ModuleCache.ts`、`packages/logix-react/src/hooks/useModule.ts`

## 5. 仍值得做的高 ROI（当前缺口）

- **显式 eviction**：`evict(key)` / `clear()`（用于 Logout/关闭 Tab/主动回收会话）。
- **更严格的 deps 语义**：`stableHash` 目前只区分原始值；需要更明确的“推荐 deps 形态”与诊断提示策略。
- **Platform lifecycle 接线**：onSuspend/onResume/onReset 的最小实现与回归（用于后台降载，而不是等待 gcTime）。

