# Research: 037 限定 scope 的全局（路由 Host(imports) + ModuleScope）

**Branch**: `037-route-scope-eviction`  
**Source Spec**: `specs/037-route-scope-eviction/spec.md`  
**Source Plan**: `specs/037-route-scope-eviction/plan.md`

> 目标：把「限定 scope 的全局」收敛成可复制的默认最佳实践与低心智成本工具：路由/页面边界承载 Host(imports)，弹框 keepalive；并为“跨 React 子树复用同一 scope”的高级能力预留清晰扩展点。
>
> 说明：显式 eviction/clear API 已从本阶段范围移除；如后续仍需要，将另起 spec 或作为后续 phase 再评估（保留为 deferred 备选方案）。

## 0. 现状盘点（代码事实）

### 0.1 React useModule/ModuleCache 的模型与关键约束

- 模型：Acquire → Retain → Release → GC  
  - Acquire：Render 阶段 `readSync/read` 命中或创建条目，并为条目创建独立 Effect Scope。
  - Retain：Commit 后 `retain(key)`，`refCount++`，取消 GC 定时器。
  - Release：Cleanup 时 `release(key)`，`refCount--`，归零后进入 Idle 并等待 GC。
  - GC：超过 `gcTime` 后关闭 Scope 并删除条目。
- 实现落点：`packages/logix-react/src/internal/store/ModuleCache.ts`
- key 语义：`useModule(Impl)` 的内部 key 为：
  - `baseKey = options.key ?? impl:${moduleId}:${componentId}`
  - `key = ${baseKey}:${depsHash}`（depsHash 为 deps 的稳定 hash）
  - `suspend: true` 必须显式 `options.key`（避免并发渲染/重试导致 key 抖动与错绑）
- GC 语义：
  - 默认 `gcTime=500ms`（StrictMode 抖动保护）；`Infinity` 表示永不自动 GC。
  - error 状态强制短周期 GC（避免错误缓存长期占用与无法重试）。

结论：`useModule(Impl)` 非常适合“组件局部/会话级”的实例管理，但它表达的是“组件持有 → retain/release”的生命周期，不等价于“绑定到某个 Host/imports 的子模块”。

### 0.2 imports-scope（分形模块）已 strict-only 且天然表达“限定 scope 的全局”

- core：模块实例内部维护 `importsScope`（最小 injector：ModuleTag → ModuleRuntime），只保存被 imports 组装进同一 scope 的子模块实例：
  - `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`（构造 importsMap / importsScope）
- React：`host.imports.get(Child.tag)` / `useImportedModule(host, Child.tag)` strict-only 从 `parentRuntime` 的 imports-scope 解析子模块实例，缺失稳定抛错避免串实例：
  - `packages/logix-react/src/internal/store/resolveImportedModuleRef.ts`
  - `packages/logix-react/src/internal/hooks/useImportedModule.ts`

结论：用“父实例（Host）作为业务边界 scope”可以天然满足「scope 结束 → 所有子模块统一销毁」；业务只要确保 scope 边界结束（路由 unmount 或显式结束）即可。

### 0.3 句柄语义澄清：什么是“绑定某个 Host 实例”

这块是业务最容易误用的根源：**同样是“拿到一个模块句柄”，不同入口代表完全不同的实例归属**。

- `useModule(ModuleImpl)`：从当前 `RuntimeProvider` 对应的 React ModuleCache 里 acquire/retain 一个“局部实例”；实例的存活取决于组件 retain/release（再受 `gcTime` 影响）。
- `useModule(Module)`：等价于 `useModule(Module.impl)`（Module 是 `ModuleDef.implement(...)` 返回的对象）。
- `useModule(ModuleDef)` / `useModule(ModuleTag)`：语义是“当前最近 RuntimeProvider 环境里的单例”（属于 Provider 级别，不绑定到某个 Host 实例）。
- `host.imports.get(Child.tag)` / `useImportedModule(host, Child.tag)`：**从 host 这个父实例内部的 imports-scope 映射里解析子模块**；这就是“绑定某个 Host 实例”的含义：子模块实例的归属锚点是 host.runtime 的 scope。

结论：若目标是“路由内弹框 keepalive + 路由结束统一销毁（严格隔离）”，甜点区应优先采用 `Host(imports) + host.imports.get(...)`，而不是在弹框里直接 `useModule(Child.*)`。

### 0.4 高级扩展：跨 React 子树/独立 root 复用同一 scope（实验性方向）

- 目标：抛开 React 树路径限制，让“不在同一路径的东西”也能共享同一个 scope。
- 机制方向：
  - `@logixjs/core` 提供按 runtime tree 隔离的 ScopeRegistry：`packages/logix-core/src/ScopeRegistry.ts`
  - `@logixjs/react` 的 ModuleScope 可以在边界 Provider 挂载时以 `scopeId` 注册 “runtime + module runtime”，并在另一棵子树通过 Bridge 取回并重新提供。
- 风险点：
  - 必须有严格的注册/释放语义，避免泄漏与“拿到已 disposed 的 scope”；
  - 必须补齐单元测试（并发重入、缺注册时报错、释放顺序不确定性）。

### 0.5 ScopeRegistry 直接用法（内部参考）

> TL;DR：ScopeRegistry 的主用途是支撑 `ModuleScope.Bridge` 这类“跨 React 子树/独立 root 复用同一 scope”的能力。  
> 如果只是“路由范围内共享额外资源”，优先把资源放到 Host 的 state / service / imports 里（心智模型更统一，也更容易跟随 scope 销毁）。

但在少数场景下（例如：全局浮层 root 需要按 routeKey 取回“路由级 portal 容器句柄”），你可以在同一个 `scopeId` 下注册/取回额外资源：

```ts
import { Context } from "effect"
import * as Logix from "@logixjs/core"

class RoutePortalTag extends Context.Tag("app/RoutePortal")<RoutePortalTag, HTMLElement>() {}

const registry = appRuntime.runSync(Logix.ScopeRegistry.ScopeRegistryTag)
const lease = registry.register(routeKey, RoutePortalTag, portalEl)

// 其他位置（同一个 app runtime tree 内）
const portal = registry.get(routeKey, RoutePortalTag)

// scope 结束时释放（通常放在路由边界 unmount cleanup）
lease.release()
```

## 1. Decisions

### D01 — 默认推荐：Host(imports) + host.imports.get（甜点区）

**Decision**：用户文档的默认推荐路径收敛为：

- Host(imports) 承载业务边界（路由/页面 scope）；
- 子组件只通过 `host.imports.get(Child.tag)` / `useImportedModule(host, Child.tag)` 获取“绑定该 Host 实例”的子模块句柄；
- 明确反例：在弹框里直接 `useModule(Child.impl)` 或 `useModule(Child.tag)` 都不是“绑定 Host”的语义。

**Rationale**：这是最难误用、最符合“限定 scope 的全局”的路径；其成本模型与销毁语义都清晰可解释。

### D02 — Scope 工具化：Provider + hook，避免 props 透传

**Decision**：在 `@logixjs/react` 增量提供 Scope 工具（Provider + hook）：

- 让路由/页面边界只负责“挂一个 Provider”，而不是层层 props 透传 Host；
- 子组件在任意深度都能稳定拿到 Host 句柄；
- 缺 Provider 必须抛出明确错误。

**Rationale**：把最佳实践从“需要资深开发者理解”降到“业务照抄也很难写错”。

### D03 — 高级扩展点：ScopeRegistry + Bridge（实验性）

**Decision**：为跨子树复用 scope 提供扩展点（高级区）：

- ScopeRegistry 只按 runtime tree 隔离（不允许进程级全局正确性依赖）。
- Bridge 必须是显式行为（必须传入 scopeId，并在缺注册时抛错）。

**Rationale**：满足“跨路径共享同一 scope”的诉求，同时保持可测试性与隔离性。

### D04 — DEFERRED：显式 eviction/clear

**Decision**：显式 eviction/clear API 从本阶段范围移除。若后续确认“卸载/替换 Provider 或 key 切换”仍不足以覆盖 keep-alive 边界，再另起 spec 推进该能力，并补齐性能基线与诊断链路。

## 2. 需要固化为契约的要点（contracts 覆盖范围）

- Scope 工具（Provider + hook）的错误口径、options 合并规则与 key 隔离语义。
- “句柄语义”的分层说明：Host(imports) / useModule(Impl) / useModule(Tag) 三者差异与反例。
- ScopeRegistry 的数据模型与 lease 语义（register/get/release/clear），以及 Bridge 的前提与失败模式。
