---
title: React useLocalModule 重构草案（Resource Cache 终局方案）
status: draft
version: 2025-12-04
value: core
priority: next
---

## 背景与动机

为了在 Logix React 集成中实现**最佳的开发者体验（DX）**与**绝对的运行时安全**，我们需要彻底解决以下核心冲突：

1.  **Suspense 必须同步抛出**：React 要求在 Render 阶段抛出 Promise 以触发 Suspense，这意味着异步任务必须在 Render 或更早阶段启动。
2.  **Scope 必须精确管理**：Logix ModuleRuntime 包含副作用（Watcher/Effect），不能容忍 StrictMode 或并发渲染导致的“幽灵渲染”泄漏。
3.  **useEffect 无法救场**：依赖 `useEffect` 来启动 Suspense 资源会导致死锁（Render 挂起 -> Commit 阻塞 -> Effect 不执行）。

因此，我们决定跳过中间过渡态，直接采用业界最佳实践：**Resource Cache + Reference Counting** 模式。

## 核心设计：ModuleResourceCache

我们将引入一个资源缓存层，接管 ModuleRuntime 的生命周期。

### 1. 缓存结构与归属

**关键决策**：Cache 不应是全局单例，而应**绑定到 `ManagedRuntime` 实例**。
这确保了不同 Runtime 环境（如 SSR 请求隔离、微前端隔离）下的资源互不干扰，且能正确获取当前 Runtime 的 Context/Layer。

```typescript
// 扩展 ManagedRuntime 或通过 WeakMap<Runtime, Cache> 关联
type ResourceKey = string; // 组件级唯一 ID (useId) + Deps Hash

interface ResourceEntry {
  readonly scope: Scope.CloseableScope;
  readonly promise: Promise<ModuleRuntime>;

  // 状态机
  status: 'pending' | 'success' | 'error';
  value?: ModuleRuntime;
  error?: unknown;

  // 引用计数
  refCount: number;

  // GC 定时器（用于回收“幽灵渲染”产生的资源）
  gcTimeout?: NodeJS.Timeout;
}

class RuntimeResourceCache {
  private entries = new Map<ResourceKey, ResourceEntry>();

  constructor(private runtime: ManagedRuntime) {}

  // ... read, retain, release
}
```

### 2. 生命周期管理 (The 4-Step Lifecycle)

#### Phase 1: Acquire (Render 阶段)
当 `useLocalModule` 被调用时：
1.  **生成 Key**：`useId()` + `stableHash(deps)`。
2.  **获取 Cache**：从 `useRuntime()` 获取当前 Runtime 绑定的 Cache 实例。
3.  **Cache Miss**:
    -   立即创建 `Scope` 和 `Promise`（启动构建）。
    -   创建 Entry，`refCount = 0`。
    -   启动 `gcTimeout` (e.g., 500ms)。若超时后 `refCount` 仍为 0，则销毁。
    -   存入 Cache。
4.  **Cache Hit**: 返回 Entry。
5.  根据 Entry 状态：
    -   `pending`: **Throw Promise**。
    -   `error`: **Throw Error**。
    -   `success`: 返回 `ModuleRuntime`。

#### Phase 2: Retain (Commit 阶段)
组件成功渲染并执行 `useEffect`：
1.  调用 `Cache.retain(key)`。
2.  Entry `refCount++`。
3.  **清除 `gcTimeout`**：资源已被正式认领，取消自动回收。

#### Phase 3: Release (Cleanup 阶段)
组件卸载或 `deps` 变化导致 `useEffect` cleanup：
1.  调用 `Cache.release(key)`。
2.  Entry `refCount--`。
3.  **若 `refCount === 0`**：
    -   不立即销毁（为了支持快速 Remount 或 StrictMode 的卸载/重挂载）。
    -   启动 `gcTimeout` (e.g., 500ms)。

#### Phase 4: GC (Timeout)
当 `gcTimeout` 触发：
1.  再次检查 `refCount`。
2.  若仍为 0：
    -   `Scope.close(entry.scope)`。
    -   `entries.delete(key)`。

### 3. API 设计

用户侧 API 将极其简洁，不再暴露 `isLoading` 或 `error` 状态：

```typescript
export function useLocalModule<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  options: ModuleInstanceOptions<Sh>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
  // 1. 获取当前 Runtime 及其 Cache
  const runtime = useRuntime();
  const cache = getCacheForRuntime(runtime);

  // 2. 生成 Key (包含 deps 指纹)
  const id = useId();
  const depsHash = stableHash(options.deps); // 需实现稳定 Hash
  const key = options.key ?? `${module.id}:${id}:${depsHash}`;

  // 3. 读取资源 (可能会 Throw Promise/Error)
  const moduleRuntime = cache.read(key, () => createFactory(module, options, runtime));

  // 4. 锁定资源生命周期
  useEffect(() => {
    return cache.retain(key);
  }, [cache, key]);

  return moduleRuntime;
}
```

## 实施现状与下一步 (2025-12-04 Update)

### 已完成
1.  **ModuleResourceCache**：
    -   已实现基于 `WeakMap<Runtime, Cache>` 的缓存层。
    -   已启用 **延迟 GC** (Acquire -> Retain -> Release -> GC)，解决了 StrictMode 下的资源泄漏问题。
2.  **useLocalModule**：已完全迁移到 Resource Cache (Suspense 模式)。
3.  **useModule(Impl)**：
    -   已接入 Resource Cache (Sync 模式)，通过 `readSync` 保持同步构建语义。
    -   新增 `options: { deps, key }` 参数，支持显式控制复用/重建。
    -   使用 `useRef` 生成随机 ID 模拟 `useId`，配合 `stableHash(deps)` 生成稳定 Key。

### 待决事项
1.  **useModule(Impl) 的 Suspense 化**：
    -   目前在 StrictMode + 测试环境下，`useModule(Impl)` 走 Suspense 路径会导致无限重建（Key 不稳定）。
    -   暂时保留 `readSync` 作为稳定实现。
    -   后续需在独立分支探索如何稳定生成 Key（可能需要 React 19 `use` hook 或更激进的 Cache 策略）。

## 结论

这是 Logix React 集成的**终局方案**。它牺牲了实现层的简单性（引入了 Runtime 级 Cache、GC 和 Hash 逻辑），换取了**最完美的 React 并发兼容性**和**最简单的用户 API**。
