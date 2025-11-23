# 通用 Hooks API (Hooks API Specification)

> **Status**: Draft
> **Layer**: React Adapter

本文档定义用于连接 Logix 与 React 的通用 Hooks。

## 1. `useStore` (Lifecycle & Access)

用于在组件内部创建或获取 Store 实例，并管理其生命周期。

```typescript
// 场景 A: 组件级 Store (Local State)
// 自动管理 Scope：组件挂载时创建，卸载时销毁
function useLocalStore<S, E>(factory: () => Effect<Store<S, E>>): Store<S, E>;

// 场景 B: 全局/共享 Store (Global State)
// 仅获取实例，不管理生命周期
function useStore<S, E>(store: Store<S, E>): Store<S, E>;
```

## 2. `useSelector` (Fine-Grained Subscription)

这是性能优化的核心。组件不应该订阅整个 Store，而应该订阅它关心的切片。

```typescript
function useSelector<S, T>(
  store: Store<S, any>,
  selector: (state: S) => T,
  equalityFn?: (a: T, b: T) => boolean
): T;
```

**实现规范**:
*   必须基于 `useSyncExternalStore` 实现。
*   支持 `proxy-memoize` 自动追踪依赖（可选特性），实现类似 Vue/MobX 的自动订阅体验。

## 3. `useDispatch` (Event Trigger)

提供一个稳定的 dispatch 函数，用于触发 Logix Event。

```typescript
function useDispatch<E>(store: Store<any, E>): (event: E) => void;
```

**注意**: 返回的 dispatch 函数必须是 **Reference Stable** 的（即在组件重渲染期间保持不变），以便可以安全地传递给子组件而不破坏 `memo`。

## 4. `useEventCallback` (Effect Bridge)

有时我们需要在 React 事件处理函数中直接调用 Logix 的 Effect 逻辑，并等待其结果（例如：点击按钮 -> 调用 API -> 等待完成 -> 跳转页面）。

虽然 Logix 推荐 Event-Driven，但为了实用性，我们需要一个 Escape Hatch。

```typescript
function useEffectCallback<Args extends any[], R>(
  store: Store<any, any>,
  effectFn: (...args: Args) => Effect<R>
): (...args: Args) => Promise<R>;
```

*   **功能**: 将一个 Effect 包装成一个返回 Promise 的普通函数。
*   **Runtime**: 自动使用 Store 关联的 Runtime 执行 Effect。

## 5. 派生状态与 Selector 最佳实践

在使用 `useSelector` 时，需要区分两类派生状态，以避免 Logix 状态被无意义地放大：

| 类型 | 定义 | 存储位置 | 实现方式 |
| :--- | :--- | :--- | :--- |
| Persistent Derived (业务数据) | 核心业务逻辑，需要持久化、传输给后端或被其他逻辑依赖，例如 `orderTotal`、`isAdult`。 | Logix State | 使用 Logix 的 `watch` + `set` 显式写入。 |
| Transient Derived (视图数据) | 仅用于 UI 展示，无需持久化，例如格式化日期、拼接字符串、UI 显隐计算。 | React 内存 | 使用 `useSelector`（可配合 `proxy-memoize`）在渲染期计算。 |

实践建议：

- 业务上“有含义且需回放”的数据，一律落在 Logix 状态层，由 Logic 规则写入；  
- 单纯视图辅助数据（展示格式、拼文案、局部显隐），优先放在 Selector 层，用 `useSelector` 计算即可。  
这样既保持 Logix 状态的可审计性，又不会让状态结构因 UI 需求膨胀。
