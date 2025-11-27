# Store (The Environment)

> **Status**: Definitive (v3 Effect-Native / Signed Off)  
> **Date**: 2025-11-26  
> **Scope**: Logix Engine Runtime

## 1. 核心概念：Store as Runtime

在 Logix v3 中，`Store` 是围绕 State / Action 的运行时容器，它提供了对数据状态与动作流的统一观测 / 修改能力。  
在类型上，它对应 PoC 中的：

```ts
export namespace Store {
  export interface Runtime<S, A> {
    getState: Effect.Effect<S>;
    setState: (next: S) => Effect.Effect<void>;
    dispatch: (action: A) => Effect.Effect<void>;
    actions$: Stream.Stream<A>;
    changes$<V>(selector: (s: S) => V): Stream.Stream<V>;

    // 双形态引用：支持借用整棵状态或局部切片
    ref(): SubscriptionRef.SubscriptionRef<S>;
    ref<V>(selector: (s: S) => V): SubscriptionRef.SubscriptionRef<V>;
  }

  // [New in v3] 强类型 Tag 定义
  // 用于 Intent.Coordinate 和 Logic.for 中进行安全的类型约束
  export interface Tag<Sh extends Shape<any, any>>
    extends Context.Tag<any, Runtime<StateOf<Sh>, ActionOf<Sh>>> {}
}
```

### 1.1 推荐 Tag 定义模式

为了让 `Intent.Coordinate` 等 API 能利用类型系统进行安全检查，建议按以下模式定义 Store Tag：

```ts
// 1. 定义具体的 Tag 类
export class SearchStoreTag extends Context.Tag('SearchStore')<
  SearchStoreTag,
  Store.Runtime<StateOf<SearchShape>, ActionOf<SearchShape>>
>() {}

// 2. (可选) 显式约束类型别名，方便在签名中使用
export type SearchStoreTagType = Store.Tag<SearchShape>;
```

## 2. API 设计: `Store.make`

```ts
import { Store } from '@logix/core';

const StateLive  = Store.State.make(StateSchema, initialState);
const ActionLive = Store.Actions.make(ActionSchema);
// v3 推荐使用纯 Effect 的 Logic（详见 03-logic-and-flow）
const LogicLive  = Logic.make<Shape, Env>(Effect.gen(...));

const MyStore = Store.make(StateLive, ActionLive, LogicLive);
```

- `Store.State.make(schema, initial)`：基于 Schema 定义 State 形状与初始值；  
- `Store.Actions.make(schema)`：基于 Schema 定义 Action 联合类型；  
- `Store.make`：将 State / Action 的 Layer 与一组 Logic 程序组合为一棵 Store，并在运行时创建对应的 `Store.Runtime<S, A>`。

## 3. Store 能力在 Logic 中的暴露方式

Logic 不直接依赖 `Store` 的 Context Tag，而是通过 `Logic.Env<Sh, R>` 获取 Store 能力：

```ts
export type Env<Sh, R = never> =
  Store.Runtime<Store.StateOf<Sh>, Store.ActionOf<Sh>> & R;
```

> Note  
> Tag 主要用于运行时底层和 Pattern/Namespace 内部（如 `Logic.RuntimeTag`），业务 Logic 代码通过 Bound API 层隔离掉 Tag 细节，只与 Env 交互。

在 v3 标准范式（`Logic.for`）中，开发者通过 Bound API（`$`）访问这些能力，类型推导会自动完成：

```ts
const $ = Logic.forShape<MyShape>();

// $.state.read 自动获得 StateOf<MyShape> 类型
const effect = $.state.read;
```

## 4. Store 生命周期与 Scope

在运行时实现中，`Store.Runtime` 只是“能力形状”，**真正决定 Store 何时出生 / 何时死亡的是它所运行在的 Effect Scope**。

> 重要  
> `Store.make` 仅负责构造 Runtime 实例与 Logic 组合，它本身不打开 Scope。具体在哪个 Scope 下运行（是全局单例还是组件级生命周期），完全由上层 Runtime（如 React 集成层的 `useLocalStore` 或平台的 `ManagedRuntime`）决定。

典型分层可以理解为：

- Runtime 根 Scope：随应用启动而创建，在 `RuntimeProvider` 或等价入口中构建；  
- Store Scope：每棵 Store 的 Logic 通常运行在一个独立 Scope 内（例如 `Effect.scoped(StoreLogic)`）；  
- 组件 / 页面 Scope：React 组件树或页面容器的生命周期。

### 4.1 全局 Store vs 局部 Store

- 全局 Store（App 级）：  
  - 在应用启动时通过 `Store.make` 创建一次并启动 Logic；  
  - Store Scope 绑定到 Runtime 根 Scope，随应用整个生命周期存在；  
  - 页面或组件卸载**不会**自动终止其内部长任务。

- 局部 Store（页面 / 组件级）：  
  - 在某个容器逻辑中（例如 React 的 `useLocalStore`）创建，Scope 绑定到该容器；  
  - 当容器卸载或依赖变更时，对应 Store Scope 会被 `close()`；  
  - 所有通过 `forkScoped` 挂在该 Scope 的长逻辑会被安全中断。

### 4.2 与长逻辑 Scope 的关系

在 `Logic` 中常见两种启动长任务的方式：

- `Effect.forkScoped(longTask)`：  
  - 将任务挂在当前 Store / Logic 所在的 Scope 上；  
  - 当 Store Scope 关闭时，任务会被自动中断，适合与页面 / Store 同生命周期的 UI 逻辑。

- `Effect.fork(longTask)`：  
  - 将任务挂在更外层 Scope（通常是 Runtime 根 Scope 或显式管理的后台 Scope）；  
  - 不随 Store / 页面销毁自动结束，适合理解为“后台任务”的逻辑。

因此：

- 是否“掐断”一个长任务，取决于它是通过 `forkScoped` 还是 `fork` 启动，以及 Store Scope 绑定在哪一层；  
- `useStore` / `useLocalStore` 等 React Hook 只是帮助组件**拿到对应的 Store 实例并订阅状态**，并不直接决定任务的 Scope，仅在局部 Store 场景下负责在组件卸载时关闭 Store Scope。
