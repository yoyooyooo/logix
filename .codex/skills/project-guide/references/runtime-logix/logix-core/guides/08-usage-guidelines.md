# 使用指南与最佳实践 (Usage Guidelines & Best Practices)

> **Status**: Draft（Effect-Native）
> **Date**: 2025-11-24
> **Layer**: Application Layer
> **Audience**: 应用/业务开发者的日常使用指南；库作者与架构师可在此基础上制定团队规范。

本文档旨在指导开发者如何正确、优雅地使用 Logix 构建应用。核心在于拥抱 **Layer (层)** 与 **Stream (流)** 的组合哲学。

## 1. 核心原则 (Core Principles)

### 1.1 Composition over Configuration (组合优于配置)

- **原则**: 不要试图在一个巨大的配置对象中定义所有东西。将 Logic 拆分为多个小的 Logic 程序（Logic 单元），然后组合它们并挂载到对应的 Module 上。
- **模式**: `ModuleDef.live(initialState, AuthLogic, UserLogic, FormLogic)`。

### 1.2 Streams are First-Class (流是一等公民)

- **原则**: 所有的业务逻辑本质上都是对事件流的变换。使用 `source.pipe(...)` 来表达这种变换。
- **模式**: `Trigger -> Transform -> Effect`。

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
const keyword$ = flow.fromState(s => s.search);

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

Logix 在 Intent 层提供了三档“响应式意图”表达，代码侧以 Fluent DSL 为主、IR 层统一用 `IntentRule` 标准化表示，建议优先按层级选择：

| 层级                      | 场景                                                             | 代码推荐原语                                                        | IR 映射                                        | 说明                                                                          |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| L1：单 Store 内同步联动   | 监听某个 State 视图变化，并维护派生字段                          | `$.onState(selector).update/mutate(...)`                            | L1 IntentRule（self.state → self.mutate）      | 例如 `results` 变化时自动维护 `hasResults`、`summary` 等                      |
| L1：单 Store 内同步联动   | 监听某一类 Action 并重排当前 Store State                         | `$.onAction(predicate).update/mutate(...)`                          | L1 IntentRule（self.action → self.mutate）     | 例如表单 `change/reset`、Tab 切换、显式 reset 等离散事件                      |
| L2：跨 Module 协作        | A.Module 的 State/Action 驱动 B.Module 的 Action                 | `$.use(AModule/BModule) + Fluent DSL（$A.changes/… → $B.dispatch）` | L2 IntentRule（A.state/A.action → B.dispatch） | 例如 SearchModule → DetailModule、GlobalLayoutModule.logout → 各 Module reset |
| L2/L3：复杂异步流与副作用 | 监听 Action/State 触发复杂长逻辑（调用多个 Service、带错误边界） | Fluent DSL 或 `flow.run*` + `$.match` / `Effect.*`                  | `Intent.react`（预留）或自定义节点             | 例如提交流程、审批流、Job 运行，通常封装为 `(input) => Effect` 的 Pattern     |
| L3：极度定制化流处理      | 需要精细控制 Stream 结构（buffer、groupBy、低层 Stream 组合）    | 直接使用 `Stream.*` / `Effect.*`                                    | 无（Gray/Black Box）                           | 平台视为 Gray/Black Box，适合高度自定义场景                                   |

其中：

- L1 对应日常 80% 的简单联动场景，推荐默认使用 Fluent DSL；
- L2 用于显式表达跨 Module 协作关系，代码侧通过 `$.use + $.on*`，IR 层落到 L2 IntentRule，便于平台在图上呈现模块依赖；
- L3 仅在 Fluent/Intent 原语无法覆盖时作为逃逸口使用。

## 3. 逻辑拆分 (Logic Splitting)

在当前主线中，逻辑拆分变得极其简单：只需定义多个 Logic 程序（多个 `ModuleDef.logic(...)` 或 Pattern 产出的 Logic），然后将它们挂载到同一个模块实现上。

```typescript
// features/auth/logic.ts
export const AuthLogic = AuthDef.logic($ => /* ... */);

// features/user/logic.ts
export const UserLogic = UserDef.logic($ => /* ... */);

// live.ts
export const AuthLive = AuthDef.live(initialAuthState, AuthLogic);
export const UserLive = UserDef.live(initialUserState, UserLogic);
```

## 4. Module 设计与多实例 (Module Design & Multi-Instance)

为了让领域模块真正成为“可独立演进 / 复用的逻辑单元”，推荐遵循以下约定：

- Module 模块导出的是 **契约与 Layer 工厂**，而不是强行单例：
  - 导出 `Module` 定义（`Logix.Module.make('Id', { state, actions })`）；
  - 导出一个 `makeXxxLive(env)` 工厂函数，内部调用 `ModuleDef.live(initial, ...logics)`，而不是直接在模块顶层创建单例 Layer。
- 宿主决定是单例还是多实例：
  - App Shell 可以选择在应用启动时调用工厂一次，得到全局 Live Layer；
  - 页面 / 弹框可以通过 `useLocalStore(() => makeXxxLive(props), deps)` 创建页面级实例。
- 详细的多实例模式（工厂模式 vs 作用域模式）对比与最佳实践，请参考 **[10-pattern-multi-instance.md](../patterns/10-pattern-multi-instance.md)**。
- 跨 Module 协作通过 Intent 层表达：
  - 使用 Fluent DSL + IntentRule（Link / Logic 协作原语），描述"ModuleA 状态 / Action 变化如何驱动 ModuleB"；
  - 避免在某个 Module 内部直接读取 / 修改另一个 Module 的内部状态实现细节。

## 5. 调试指南

由于一切皆 Effect，你可以使用 Effect 生态的所有调试工具。

- **Effect Tracer**: 查看完整的执行链路。
- **Logix DevTools**: 查看 Action 和 State 的变化。
