---
title: Unified ModuleCache
status: draft
version: 1.0.0
layer: Topic
value: core
priority: high
related:
  - ../../../runtime-logix/core/07-react-integration.md
  - ../../L9/react-use-local-module-runtime-overhaul.md
  - ./01-lifecycle-and-scope.md
  - ./03-session-keepalive-pattern.md
---

## 背景与动机

为了在 Logix React 集成中实现**最佳的开发者体验（DX）**与**绝对的运行时安全**，我们需要彻底解决以下核心冲突：

1.  **Suspense 必须同步抛出**：React 要求在 Render 阶段抛出 Promise 以触发 Suspense，这意味着异步任务必须在 Render 或更早阶段启动。
2.  **Scope 必须精确管理**：Logix ModuleRuntime 包含副作用（Watcher/Effect），不能容忍 StrictMode 或并发渲染导致的“幽灵渲染”泄漏。
3.  **useEffect 无法救场**：依赖 `useEffect` 来启动 Suspense 资源会导致死锁（Render 挂起 -> Commit 阻塞 -> Effect 不执行）。

因此，我们决定跳过中间过渡态，直接采用业界最佳实践：**Resource Cache + Reference Counting** 模式。

## 核心设计：Unified ModuleCache

我们将引入一个统一的资源缓存层，接管 ModuleRuntime 的生命周期，无论是短暂的组件级状态还是长期的会话级状态。

> 术语说明：本 Topic 与实现统一采用 **ModuleCache**（`getModuleCache`）作为概念与类名，表示「按 Key 缓存 ModuleRuntime 实例、挂在 ManagedRuntime 上的缓存」。

### 1. 缓存结构与归属（Scope Boundary）

**关键决策 1：按 Runtime 隔离（per ManagedRuntime）**  
- Cache 不应是全局单例，而应**绑定到 `ManagedRuntime` 实例**；  
- 相同的 `key` 只在同一个 ManagedRuntime 内具有意义：  
  - SSR 场景：每个请求通常创建独立的 ManagedRuntime → ModuleCache 天然按请求隔离；  
  - 微前端/多应用：是否共享 ModuleCache 取决于是否显式复用同一个 ManagedRuntime 实例。  

**关键决策 2：缓存主体是 ModuleRuntime 实例**  
- ModuleCache 的 value 始终是 `Logix.ModuleRuntime<any, any>`；  
- 换句话说，它是“某个 Runtime 内 ModuleRuntime 实例的缓存/复用层”，而不是 ModuleImpl 或 ManagedRuntime 本身。

```typescript
// 扩展 ManagedRuntime 或通过 WeakMap<Runtime, Cache> 关联
type ResourceKey = string; // 显式 Key 或 组件级唯一 ID (useId) + Deps Hash

interface ResourceEntry {
  readonly scope: Scope.CloseableScope;
  readonly promise: Promise<ModuleRuntime>;

  // 状态机
  status: 'pending' | 'success' | 'error';
  value?: ModuleRuntime;
  error?: unknown;

  // 引用计数
  refCount: number;

  // GC 策略
  gcTime: number; // 默认为 500ms (StrictMode 抖动保护)
  gcTimeout?: NodeJS.Timeout;
}

class ModuleCache {
  private entries = new Map<ResourceKey, ResourceEntry>();

  constructor(private runtime: ManagedRuntime) {}

  // ... read, retain, release
}
```

### 2. 生命周期管理 (The 4-Step Lifecycle)

#### Phase 1: Acquire (Render 阶段)
当 `useModule` / `useLocalModule` 被调用时：
1.  **生成 Key**：优先使用 `options.key`，否则回退到 `useId()` + `stableHash(deps)`。
2.  **获取 Cache**：从 `useRuntime()` 获取当前 Runtime 绑定的 Cache 实例。
3.  **Cache Miss**:
    -   立即创建 `Scope` 和 `Promise`（启动构建）。
    -   创建 Entry，`refCount = 0`，记录 `options.gcTime` (默认 500ms)。
    -   启动 `gcTimeout`。
    -   存入 Cache。
4.  **Cache Hit**: 返回 Entry。
5.  根据 Entry 状态：
    -   `pending`: **Throw Promise** (Suspense)。
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
3.  **若 `refCount === 0`**（从“有持有者”变为“无持有者”）：
    -   启动 `gcTimeout`（时长取决于 `entry.gcTime`，见下文 Idling 策略）。

#### Phase 4: GC (Timeout, Idle-Based Expiration)
当 `gcTimeout` 触发：
1.  再次检查 `refCount`（Idle-Based Expiration）：
    -   若在计时期间有新组件 `retain` 该 key，`refCount` 会被加回 > 0，此时应视为“会话已恢复”，跳过 GC；
2.  仅当 `refCount` 仍为 0 时：
    -   执行 `Scope.close(entry.scope)`；
    -   `entries.delete(key)`，彻底移除缓存。

> 小结：`gcTime` 描述的是「从最后一次引用释放之后的闲置时长」，而不是“从创建起已经存在多久”。

### 2.1 `gcTime` 精确定义

- **起点**：只有当 `refCount` 从 1 变为 0 时，才会启动 `gcTimeout` 计时；  
- **重置**：在 `gcTimeout` 触发前，如有新的 `retain` 使 `refCount > 0`，必须立即取消 `gcTimeout`；  
- **终点**：计时结束时若 `refCount` 仍为 0，则执行 GC（关闭 Scope + 删除 Entry）。

关于不同取值：

- `gcTime = 默认值 (500ms)`：  
  - 主要用于保护 StrictMode 下的 mount/unmount 抖动，以及快速路由切换；  
  - 适合作为组件级（Transient）缓存的默认策略。
- `gcTime = N 分钟`：  
  - 推荐用于会话级（Session）缓存：Tab/页面切换走后，Runtime 可以在内存中保留一段时间，允许“切回来即恢复”；  
  - 典型用法见 Session Pattern 文档。
- `gcTime = Infinity`：  
  - 表示“一旦创建，除非 Runtime 销毁或显式驱逐，否则不自动 GC”；  
  - 仅适用于极少数需要“全局长驻”的模块，应在文档中标明风险（内存压力）。

错误状态（`status = 'error'`）的特殊处理：

- 出错时保留一个错误状态 Entry，通常只会阻碍后续重试；  
- 当前实现中：当 `refCount` 归零时，对 `status = 'error'` 的 Entry 一律使用固定的短延时 GC（`ERROR_GC_DELAY_MS = 500ms`），**不受业务配置的 `gcTime` 影响**；  
- 这样下次挂载时可以重新启动构建过程，而不是永远命中旧的错误结果。  

### 3. API 设计：One API Rule

我们废弃了 `useSessionModule` 等变体，统一使用 `useModule` 配合 `options` 控制行为。

```typescript
export interface UseModuleOptions<Sh> {
  /**
   * 显式 Key。
   * - 若提供，则在整个 Runtime 范围内共享该 Module 实例 (Session Mode)。
   * - 若不提供，则默认为组件私有 (Transient Mode)，使用 useId 生成。
   */
  key?: string;

  /**
   * 实例在无引用后的保活时间 (ms)。
   * - 默认: 500ms (防止 StrictMode 抖动 / 快速路由切换)。
   * - Session 场景推荐: 5 * 60 * 1000 (5分钟) 或更长。
   */
  gcTime?: number;

  /**
   * 模块初始化（含异步 Layer 构建）的超时时间 (ms)。
   * - 仅在 suspend: true 场景下生效；
   * - 超过该时间仍未完成时，通过 Effect.timeoutFail 触发错误，由上层 ErrorBoundary 或业务逻辑决定重试 / 降级；
   * - 不影响 gcTime 语义：gcTime 只描述「无人持有后的保活时间」。
   */
  initTimeoutMs?: number;

  /**
   * 是否启用 Suspense 模式。
   * - true: 异步构建，抛出 Promise。
   * - false (默认): 同步构建，要求 ModuleImpl 必须同步可用。
   */
  suspend?: boolean;

  deps?: unknown[];
}

export function useModule<Sh extends Logix.AnyModuleShape>(
  impl: Logix.ModuleImpl<any, Sh>,
  options?: UseModuleOptions<Sh>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
  // ... 实现逻辑同上，透传 options.gcTime 给 Cache
}

### 4. Key 契约与 Deps 语义

为了避免「同一个 key 绑定不同 ModuleImpl」以及「Deps 行为语义不清」导致的难以排查问题，本节约定：

1. **Key Ownership（Key 归属）**  
   - 在同一个 ManagedRuntime 内，某个 `key` 一旦被某个 ModuleImpl 首次使用，即视为该 Impl 认领了这个 key；  
   - 运行时建议行为：
     - Cache Hit 时，如果发现当前 `impl` 与 Entry 中记录的 ModuleImpl 不一致（例如第一次是 UserModule，第二次换成 OrderModule），在开发/测试环境应抛出致命错误，禁止复用；  
     - 生产环境可以选择抛错或记录告警，但绝不能静默复用错误的 Runtime。

2. **Key + Deps 的组合语义**  
   - 最终用于 ModuleCache 的底层 ResourceKey 通常为：  
     `resourceKey = baseKey + ':' + stableHash(deps)`；  
   - 其中：
     - `baseKey` 来自 `options.key`（显式会话/区域名称），或退化为 `implId + componentId`（组件私有）；  
     - `deps` 仅作为“失效指纹”，一旦变化就会生成新的 ResourceKey，视为“新实例”。  
   - 对调用方的影响：
     - 若希望“跨 deps 变化复用同一 ModuleRuntime 实例”，必须保持 `deps` 稳定（或者不传 `deps`）；  
     - 若希望“deps 一变就重建”，则可以安全地把真正的依赖塞进 `deps`，ModuleCache 会自动为每组 deps 建立独立实例。

3. **推荐实践**  
   - 组件级（Transient）场景：不传 `key`，仅使用 `deps` 控制重建即可；  
   - 会话级（Session）场景：  
     - 通过业务 ID 构造显式 `key`（如 `tab:${tabId}`、`draft:${draftId}`）；  
     - 谨慎使用 `deps`，避免无意间让 Session 随 deps 重建。
```

## 实施现状 (2025-12-04 Update)

### 已完成
1.  **ModuleCache 实现**：
    -   当前实现类名为 `ModuleCache`，已实现基础结构（per ManagedRuntime、refCount、延迟 GC 等）；  
    -   `gcTime` 仍为硬编码的 500ms，尚未开放为配置项；  
    -   错误状态 Entry 使用同样的 500ms 延迟 GC，尚未按错误短周期策略区分。  
    -   **TODO**：  
        -   将 `gcTime` 抽象为可配置字段，并按本节约定实现 Idle-Based Expiration；  
        -   调整错误状态的 GC 策略，使其不受业务配置的 `gcTime` 影响。
2.  **useModule(Impl)**：
    -   当前签名尚未包含 `gcTime` 字段，`UseModuleOptions` 仍为文档层草案；  
    -   `options.key` + `deps` 已按「baseKey + depsHash」组合生成底层 ResourceKey，未实现 Key Ownership 检查；  
    -   **TODO**：  
        -   统一 useModule 的 API 签名，引入 `gcTime` 配置并透传给 Cache；  
        -   在开发/测试环境中实现 Key Ownership 检查（同一 Runtime + key 不允许绑定不同 ModuleImpl）。  
3.  **命令式 API（Eviction）**：
    -   目前 ModuleCache 仅提供 read/readSync/retain/release，不支持显式驱逐；  
    -   在 Session 结束 / Logout / “关闭所有标签页” 等场景下，业务可能希望立即清理某些 Runtime；  
    -   **TODO（候选设计）**：  
        -   增加 `evict(key)` / `clear()` 等命令式 API，允许框架层或高级调用方主动驱逐 Session；  
        -   明确定义当 `refCount > 0` 时调用 `evict(key)` 的行为（抛错 / 延迟驱逐）。

### 结论
这是 Logix React 集成的**终局方案**。通过一个统一的 `ModuleCache` 和灵活的 `useModule` API，我们同时覆盖了：
1.  **Transient Module**: `useModule(Impl)` (默认 500ms GC，组件级)。
2.  **Session Module**: `useModule(Impl, { key: 'tab:1', gcTime: 10min })` (长效缓存，会话级)。
3.  **Async Module**: `useModule(Impl, { suspend: true, key: '...' })` (Suspense 集成)。

不再需要额外的 `ModuleSessionCache` 或复杂的概念区分，奥卡姆剃刀原则在此得到了完美体现。
