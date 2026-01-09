---
title: Logix Primary Reducer vs Watcher 设计草案
status: draft
version: 2025-12-05
value: core
priority: next
---

## 背景与动机

- 当前 v3 Runtime 中，业务代码通常通过 Fluent DSL：
  - `$.onAction(tag).update/mutate/run*`
  - `$.onState(selector).update/mutate/run*`
  来同时承载：
  - 「主 reducer」（Action → State 的权威路径）；
  - 「联动 / 副作用 watcher」（派生字段、跨模块协作、IO 等）。
- 实现层面，这两类逻辑本质上都是 watcher：
  - 通过 `ModuleRuntime.actions$ / changes` 构造 Stream；
  - 在 `LogicBuilder` 中用 `Stream.runForEach` 启动长期 Fiber；
  - 生命周期挂在 ModuleRuntime Scope 下。
- 结果是：
  - 语义上：主 reducer 和 watcher 混在一起，只能靠约定区分，Parser / DevTools 很难一眼识别“权威路径”；
  - 实现上：主 reducer 也走了 watcher + Fiber 链路，不是最直观的 `_tag -> (state, action) => state` 形式；
  - 认知上：Logic 作者通常是把 `$.onAction(tag).update` 当 zustand/Redux 的 reducer map 用，而不是「监听流」。

目标：引入一条 **非 watcher 的 primary reducer 路径**，在语义上把「主 reducer」与 watcher 分层，同时保留 Flow/Effect watcher 的灵活性，让这一块在相当长时间内不再需要再关注性能，只聚焦在最佳实践和调试体验。

## 问题拆解

1. 语义混淆
   - 现在的 `$.onAction(tag).update`：
     - 语义上：Logic 作者视为“定义一个 action 对 state 的主效果”；
     - 实现上：是基于 `actions$` 的 watcher + `Stream.runForEach`。
   - 难点：
     - Parser/IR 无法区分“这是主 reducer”还是“这是联动规则”；
     - 无法在可视化/调试层显式画出「主路径」 vs 「联动/副作用」。

2. 实现路径不纯
   - 主 reducer 天然应该是纯函数形态：`(state, action) => state`，不依赖 Env、不产生 Effect；
   - 现在的实现允许在 `onAction(tag).update` 里：
     - 调用其他服务（通过 Logic.Env）；
     - 再次 dispatch；
     - 写日志等副作用；
     这些都应该属于 watcher/Flow 的职责。

3. 性能 & 上限
   - 主 reducer 数量通常很少（每个 `_tag` 0–1 个），当前通过 watcher 承载在性能上问题不大；
   - 真正容易放大的，是高频 Action + 大量 watcher + 重 handler 的组合，而不是“少数主 reducer”。
   - 但如果长期让主 reducer 也走 watcher 链路，会：
     - 把「dispatch → 主路径」锁死在 Flow/Stream 实现上；
     - 限制未来在这一条路径做更 aggressive 的优化（直跳表 / 代码生成）的空间。

## 核心设想（高层）

1. 引入 Primary Reducer 概念
   - 将“主 reducer”定义为：
     - 语义：对某个 `ActionTag` 的权威状态变换：`(state, action) => newState`；
     - 实现约束：纯同步、无 Env（R=never）、E=never、不触发 dispatch；
     - 调用时序：在 dispatch 的最前面执行。

2. dispatch 调用顺序调整
   - 现状：
     - `dispatch(action)` → DebugSink 记录 → `PubSub.publish(actionHub, action)` → watcher 消费 → 通过 `state.update` 改 State。
   - 设计目标：
     - `dispatch(action)`：
       1. 通过 `_tag` 查找 primary reducer（若存在）；
       2. 直接对当前 State 做同步变换（无 Fiber/Stream）；
       3. 记录 DebugSink；
       4. 通知 watcher：`PubSub.publish(actionHub, action)`；
       5. watcher 在新的 State 上做联动/副作用。

3. API 分层：Primary Reducer vs Watcher
   - Module 定义时声明 primary reducer map：
     ```ts
     const Counter = Logix.Module.make("Counter", {
       state: CounterState,
       actions: CounterActions,
       reducers: {
         inc: (state) => ({ ...state, count: state.count + 1 }),
         set: (state, action) => ({ ...state, count: action.payload }),
       },
     })
     ```
   - Logic / Fluent 层只承担 watcher/联动职责：
     ```ts
     // 主 reducer：Module 定义时声明
     // watcher：Logic 中定义联动、副作用
     export const CounterLogic = Counter.logic(($) =>
       Effect.gen(function* () {
         // 派生字段、跨模块协调等
         yield* $.onState((s) => s.count)
           .run($.state.update((prev) => ({
             ...prev,
             hasValue: prev.count !== 0,
           })))
       }),
     )
     ```

4. 可选语法糖：`$.reducer`（需审慎对待）

为兼顾现有 “在 Logic 里定义行为” 的习惯，可以考虑引入 DSL 级语法糖，但需要明确它的边界与风险：

```ts
// 概念示例：在 Logic 中声明 primary reducer
yield* $.reducer("inc", (state) => ({
  ...state,
  count: state.count + 1,
}))

yield* $.reducer("set", (state, action) => ({
  ...state,
  count: action.payload,
}))
```

语义设想：

- 在 Logic 初始化阶段注册 primary reducer，等价于在 Module 定义的 `reducers` 字段中添加条目；
- 不走 Flow/Stream，不产生 watcher Fiber，只写入一个纯 JS reducer map，供 `dispatch` 直接调用。

但需要注意的架构风险与约束：

- **首选路径**：primary reducer 推荐在 `Logix.Module.make(...)` 定义阶段静态声明（`reducers` 字段），这是最安全、最易分析的形态；
- `$.reducer` 若存在，只作为语法糖：
  - 类型上严格限制回调签名为 `(state: S, action: A) => S` 或 `(state: S) => S`，不返回 Effect；
  - 回调 **不能依赖 Env**：即便 JS 闭包可以捕获 Logic 中的 Service 变量，也要在规范和 lint 层明确禁止这种用法，将所有 Env/副作用留给 watcher；
  - 冲突策略：同一个 Action Tag 只允许注册一个 primary reducer，多个 Logic 中重复调用 `$.reducer("inc", ...)` 应视为错误（编译期/启动期报错，而不是后写覆盖前写）。

## 实现落点草案

> 以下为实现侧草稿，具体签名与文件位置以后续 impl 文档为准。

1. Module 层
   - 扩展 `ModuleShape` / `ModuleTag`：
     - 增加 `reducers` 字段或等价结构：`Record<ActionTag, ReducerFn>`；
     - 在 `ModuleFactory.Module` 中接收并存入 ModuleTag。
   - `ModuleTag.live(initial, ...logics)`：
     - 在调用 `ModuleRuntime.make` 时附带 `reducers`。

2. ModuleRuntime 层
   - `ModuleRuntime.make<S, A, R>(initial, { tag, logics, moduleId, reducers })`：
     - 在内部保存 `reducers` 的 `_tag -> (state, action) => state` 映射；
     - 改造 `dispatch`，建议时序：
       1. 读取当前状态 `prev`（通过 `SubscriptionRef.get` 或等价方式，仅用于 DebugSink）；
       2. 若存在对应 `_tag` 的 reducer，则：
          - 同步执行 `(prev, action) => next`；
          - 对 `stateRef` 做同步 `SubscriptionRef.update(stateRef, ...)` 或 `SubscriptionRef.set(stateRef, next)`；
       3. 记录 DebugSink 事件，建议包含 `(prev, action, next)` 三元组，方便后续做 Snapshot/Time Travel；
       4. 通过 `PubSub.publish(actionHub, action)` 通知 watcher。

3. BoundApi / Logic 层
   - 引入 `$.reducer`：
     - 类型上限制为 `(state, action?) => state`，不暴露 Effect 变体；
     - 实现上仅在 ModuleRuntime 或 ModuleTag 持有的 reducer map 上注册；
     - 返回 `Logic.Of<Sh, R, void, never>`，以便与其他 Logic 代码在 `Effect.gen` 中串联。

4. State Ref 与变化广播
   - State 持有仍推荐使用 `SubscriptionRef<S>`：
     - primary reducer 通过 `SubscriptionRef.update` / `set` 同步更新；
     - watcher 与 React `useSelector` 通过 `stateRef.changes` / `changes(selector)` 订阅变化。
   - 关于“连续多次同步 dispatch”：
     - 每次 dispatch 都会产生一次内部 State 更新；
     - `changes(selector)` 内部的 `Stream.changes` 会对 selector 结果做值去重，减少 UI 层的无谓刷新；
     - 若业务需要捕获中间所有状态，应在 watcher 层针对 `stateRef.changes` 自行处理，而不是依赖派生 selector。

4. Parser & IR
   - 在 `.codex/skills/project-guide/references/runtime-logix/logix-core/` 对应规范中：
     - 将 primary reducer 明确为 L0/L1 层的“主路径”；
     - watcher (`$.onAction/onState`) 明确为 L1/L2 的联动规则；
   - IR 层区分：
     - `ReducerRule`（主路径）；
     - `IntentRule`（联动 / 协作）。

## 开放问题 & 风险

1. reducer 是否允许访问 Env？
   - 倾向于 **禁止**：primary reducer 只做纯状态变换，将所有 IO/Env 依赖放在 watcher/Flow 层；
   - 好处：IR 更易分析，Future 优化（如直跳表/代码生成）更容易；
   - 风险：部分场景可能希望在 reducer 内读 Config/FeatureFlag，需要在 watcher 层给出替代方案。

2. 支持 pattern-level reducer 吗？
   - 例如由 Pattern 提供一组标准 reducers，再由 Module 引入；
   - 可以通过组合 reducers map 或在 ModuleFactory 层提供 `withReducers` 辅助。

3. 如何兼容现有 `$.onAction(tag).update` 代码？
   - 迁移策略：
     - 为主路径 Action 提供 `reducers` 显式定义；
     - 将原来的 `$.onAction(tag).update` 下沉到 watcher 或删除；
   - 可考虑在 DevTools/Debug 层给出提示：当某个 `_tag` 仅存在 `onAction.update` 而无 primary reducer 时，标记为“legacy reducer”。

4. long-term：是否要让 primary reducer 完全不走 DebugSink？
   - 当前草案仍建议记录主路径的 state 变化，以方便调试；
   - 但在性能极端场景下，可能需要区分“必需调试点”和“可选调试点”。

## 后续工作建议

1. 在 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md` 中补充 primary reducer 概念与 API 草案；
2. 在 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md` 中：
   - 把 `$.reducer` 与 `$.onAction/onState` 的职责边界写清楚；
   - 更新 watcher 性能基线，注明 primary reducer 不计入 watcher 数量统计。
3. 在 `.codex/skills/project-guide/references/runtime-logix/logix-core/impl/04-watcher-performance-and-flow.md` 及新建的 impl 文档中细化：
   - ModuleRuntime `dispatch` 的新实现；
   - reducer map 的结构与扩展点；
   - 与现有 BoundApi/LogicBuilder 的兼容策略。
4. 在 `@logixjs/core` 中逐步落地：
   - 先从简单场景（如 Counter Module）开始引入 reducers；
   - 保持现有 watcher 行为不变，逐步迁移主路径到 primary reducer。
