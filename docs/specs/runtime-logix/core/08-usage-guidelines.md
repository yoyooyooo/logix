# 使用指南与最佳实践 (Usage Guidelines & Best Practices)

> **Status**: Draft (v3 Effect-Native)
> **Date**: 2025-11-24
> **Layer**: Application Layer

本文档旨在指导开发者如何正确、优雅地使用 Logix 构建应用。核心在于拥抱 **Layer (层)** 与 **Stream (流)** 的组合哲学。

## 1. 核心原则 (Core Principles)

### 1.1 Composition over Configuration (组合优于配置)
*   **原则**: 不要试图在一个巨大的配置对象中定义所有东西。将 Logic 拆分为多个小的 Logic 程序（Logic 单元），然后组合它们并挂载到 Store 上。
*   **模式**: `Store.make(AuthLogic, UserLogic, FormLogic)`。

### 1.2 Streams are First-Class (流是一等公民)
*   **原则**: 所有的业务逻辑本质上都是对事件流的变换。使用 `source.pipe(...)` 来表达这种变换。
*   **模式**: `Trigger -> Transform -> Effect`。

## 2. 最佳实践模式 (Patterns)

### 2.1 数据加载 (Data Fetching)

**推荐模式**: 使用 `flow.run` 挂载异步 Effect。

```ts
const refresh$ = flow.fromAction(
  (a): a is { _tag: "refresh" } => a._tag === "refresh",
);

yield* refresh$.pipe(
  flow.run(
    Effect.gen(function* (_) {
      yield* state.update(prev => ({ ...prev, loading: true }));
      // ... fetch data
      yield* state.update(prev => ({ ...prev, loading: false }));
    }),
  ),
);
```

### 2.2 复杂联动 (Complex Linkage)

**推荐模式**: 组合多个 Stream 算子。

```ts
const keyword$ = flow.fromChanges(s => s.search);

yield* keyword$.pipe(
  flow.debounce(300),
  flow.filter(q => q.length > 2),
  flow.runLatest(
    Effect.gen(function* (_) {
      // 触发搜索逻辑，例如派发另一个 Action 或直接调用 Service
      yield* actions.dispatch({ _tag: "search/trigger" });
    }),
  ),
);
```

### 2.3 Intent 原语选择 (L1 / L2 / L3)

Logix 在 Intent 层提供了三档“响应式意图”表达，建议优先按层级选择：

| 层级 | 场景 | 推荐原语 | 说明 |
| --- | --- | --- | --- |
| L1：单 Store 内同步联动 | 监听某个 State 视图变化，并维护派生字段 | `Intent.andUpdateOnChanges` | 例如 `results` 变化时自动维护 `hasResults`、`summary` 等 |
| L1：单 Store 内同步联动 | 监听某一类 Action 并重排当前 Store State | `Intent.andUpdateOnAction` | 例如表单 `change/reset`、Tab 切换、显式 reset 等离散事件 |
| L2：跨 Store 协作 | A.Store 的 State/Action 驱动 B.Store 的 Action | `Intent.Coordinate.onChangesDispatch` / `onActionDispatch` | 例如 SearchStore → DetailStore、GlobalLayoutStore.logout → 各 Store reset |
| L2/L3：复杂异步流与副作用 | 监听 Action/State 触发复杂长逻辑（调用多个 Service、带错误边界） | `flow.run*` + `control.*`（未来可选 `Intent.react`） | 例如提交流程、审批流、Job 运行，通常封装为 `(input) => Effect` 的 Pattern |
| L3：极度定制化流处理 | 需要精细控制 Stream 结构（buffer、groupBy、低层 Stream 组合） | 直接使用 `Stream.*` / `Effect.*` | 平台视为 Gray/Black Box，适合高度自定义场景 |

其中：

- L1 对应日常 80% 的简单联动场景，推荐默认使用；  
- L2 用于显式表达跨 Store 协作关系，便于平台在图上呈现模块依赖；  
- L3 仅在 Intent / Flow 原语无法覆盖时作为逃逸口使用。

## 3. 逻辑拆分 (Logic Splitting)

在 v3 架构中，逻辑拆分变得极其简单：只需定义多个 Logic 程序（多个 `Logic.make(...)`），然后将它们挂载到同一个 Store 上。

```typescript
// features/auth/logic.ts
export const AuthLogic = Logic.make(...);

// features/user/logic.ts
export const UserLogic = Logic.make(...);

// store.ts
export const AppStore = Store.make(
  Store.State.make(...),
  Store.Actions.make(...),
  AuthLogic,
  UserLogic
);
```

## 4. Store 设计与多实例 (Store Design & Multi-Instance)

为了让 Store 真正成为“可独立演进 / 复用的逻辑单元”，推荐遵循以下约定：

- Store 模块导出的是 **契约与工厂**，而不是强行单例：  
  - 导出 `StateSchema` / `ActionSchema` / `Shape`；  
  - 导出 `makeXxxStore(env)` 工厂函数，而不是直接在模块顶层 `Store.make(...)`。  
- 宿主决定是单例还是多实例：  
  - App Shell 可以选择在应用启动时调用工厂一次，得到全局 Store；  
  - 页面 / 弹框可以通过 `useLocalStore(() => makeXxxStore(props), deps)` 创建页面级实例。  
- 跨 Store 协作通过 Intent 层表达：  
  - 使用 `Intent` / Coordinator 原语（PoC 中为类型草案），描述“StoreA 状态 / Action 变化如何驱动 StoreB”；  
  - 避免在某个 Store 内部直接读取 / 修改另一个 Store 的 State。

迁移建议：已有的全局 Store 在演进为多实例时，可以按以下步骤逐步过渡：

1. 在该 Store 所属的页面 / 弹框中引入 `useLocalStore`，用工厂创建局部 Store 实例；  
2. 将该子树中直接使用全局 Store 的地方改为使用局部 Store（通过 props 或 `useStore` 传递）；  
3. 待局部实例稳定后，再视情况决定是否保留原全局 Store。

## 5. 调试指南

由于一切皆 Effect，你可以使用 Effect 生态的所有调试工具。

*   **Effect Tracer**: 查看完整的执行链路。
*   **Logix DevTools**: 查看 Action 和 State 的变化。
