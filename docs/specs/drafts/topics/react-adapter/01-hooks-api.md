# 通用 Hooks API (Hooks API Specification)

> **Status**: Draft (Aligned with v3)
> **Layer**: React Adapter
> **Audience**: React 业务开发者（只需关心高层 Hooks 用法）与 Adapter 作者（需要关心完整类型与实现约束）。

本文档定义用于连接 Logix 与 React 的通用 Hooks。
类型示例以 `packages/logix-core/src/index.ts` 中的 `Logix.Module` / `ModuleRuntime` 等为基准。

## 0. 角色视角速览

| 角色 | 主要关注点 | 推荐阅读段落 |
| :--- | :--- | :--- |
| React 业务开发者 | 会用即可：如何拿到模块实例、订阅状态、发事件 | 1（`useModule` / `useLocalModule`）、2（`useSelector`）、3（`useDispatch`） |
| Adapter 作者 / 架构师 | 如何实现这些 Hooks、如何对接 Runtime/Scope | 全文，尤其是每节的“实现规范”和类型签名 |

业务开发者可以把本篇当成“怎么用 Hooks”；Adapter 作者需要额外遵守这里的约束来实现库。

## 1. `useModule` / `useLocalModule` (Lifecycle & Access)

用于在组件内部**创建或获取领域模块的运行时实例**，并管理其生命周期，对应两类典型模式：

| 场景模式 | 作用域 (Scope) | 来源 (Source) | `useModule` 传什么？ | 心智模型 (Mental Model) |
| :--- | :--- | :--- | :--- | :--- |
| **全局模式** (Global) | **应用级常驻** (App-wide singleton) | 定义在 `Logix.app` 蓝图中，由根 Provider 提供 | **传 Tag** (Module Definition) | **“查找 (Lookup)”**<br>向环境询问：“谁负责这个 Module？给我它的 Runtime。” |
| **局部模式** (Local) | **组件级临时** (Component transient) | 在当前组件（或父组件）中使用 `useLocalModule` 创建 | **传 Factory** (Logic Factory) | **“持有 (Holding)”**<br>直接操作手里拿着的这个具体的 Module Runtime 对象。 |

在 React Adapter 中，`useModule` 推荐以统一的句柄类型（如 `Logix.ModuleTagType`）作为参数，底层根据实际形态（Tag / 运行时实例）决定是“查找环境”还是“直接使用实例”。

对应的 Hooks 类型签名建议如下（概念性，以 Logix v3 Core 类型为参考）：

```typescript
// 场景 A: 组件级模块实例 (Local State)
// 自动管理 Scope：组件挂载时创建，卸载时销毁
function useLocalModule<Sh extends Logix.ModuleShape<any, any>>(
  factory: () => Effect.Effect<ModuleRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>>>
): ModuleRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>>;

// 场景 B: 全局/共享 Module (Global State)
// 仅获取实例，不管理生命周期 —— 通过 Handle 从 AppRuntime 中查找或直接使用实例
function useModule<Sh extends Logix.ModuleShape<any, any>>(
  handle: Logix.ModuleTagType<any, Sh>
): ModuleRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>>;
```

## 2. `useSelector` (Fine-Grained Subscription)

这是性能优化的核心。组件不应该订阅整个 Module State，而应该订阅它关心的切片。

```typescript
function useSelector<S, T>(
  runtime: ModuleRuntime<S, any>,
  selector: (state: S) => T,
  equalityFn?: (a: T, b: T) => boolean
): T;
```

**实现规范**:
*   必须基于 `useSyncExternalStore` 实现。
*   支持 `proxy-memoize` 自动追踪依赖（可选特性），实现类似 Vue/MobX 的自动订阅体验。

## 3. `useDispatch` (Event Trigger)

提供一个稳定的 dispatch 函数，用于触发 Logix Action。

```typescript
function useDispatch<E>(runtime: ModuleRuntime<any, E>): (action: E) => void;
```

**注意**: 返回的 dispatch 函数必须是 **Reference Stable** 的（即在组件重渲染期间保持不变），以便可以安全地传递给子组件而不破坏 `memo`。

## 4. `useEventCallback` (Effect Bridge)

有时我们需要在 React 事件处理函数中直接调用 Logix 的 Effect 逻辑，并等待其结果（例如：点击按钮 -> 调用 API -> 等待完成 -> 跳转页面）。

虽然 Logix 推荐 Event-Driven，但为了实用性，我们需要一个 Escape Hatch。

```typescript
function useEffectCallback<Args extends any[], R>(
  runtime: ModuleRuntime<any, any>,
  effectFn: (...args: Args) => Effect.Effect<R, any, any>
): (...args: Args) => Promise<R>;
```

*   **功能**: 将一个 Effect 包装成一个返回 Promise 的普通函数。
*   **Runtime**: 自动使用 Module 关联的 Runtime 执行 Effect。
