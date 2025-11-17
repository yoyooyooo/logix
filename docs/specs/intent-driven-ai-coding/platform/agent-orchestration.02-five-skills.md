# 2. 五种技能：Bound API 作为认知模型

在 Agent 视角下，Bound API (`$`) 不是普通工具集，而是一套「思维技能」：

1. **感知 (Perception) → `$.flow` / `$.onState` / `$.onAction` / `$.on`**
   - 负责回答：“**什么时候触发？**”
   - 典型映射：
    - “监听本地 State 变化” → `$.onState(selector)`（语义等价于 `$.flow.fromState`）；
    - “监听本地 Action” → `$.onAction(predicate)`（语义等价于 `$.flow.fromAction`）；
     - "监听跨 Store / 外部流" → `$.on(stream)`，常见写法是 `$.on($Other.changes(...))`。

2. **策略 (Strategy) → Pipeline Operators / `$.flow`**
   - 负责回答：“**信号如何流动？**”
   - 典型映射：
     - “防抖” → `.debounce(ms)`；
     - “节流” → `.throttle(ms)`；
     - “过滤” → `.filter(predicate)`；
     - “并发策略” → `{ mode: "run" | "latest" | "exhaust" | "sequence" }` 或对应 `Flow.run*` 变体。

3. **行动 (Actuation) → `$.state` / `$.actions`**
   - 负责回答：“**最后作用在哪？**”
   - 典型映射：
     - “修改当前 Store 状态” → `$.state.mutate(draft => { ... })` / `$.state.update(prev => next)`；
     - “派发 Action” → `$.actions.dispatch(action)`。

4. **协作 (Collaboration) → `$.use`**
   - 负责回答：“**需要谁的帮助？**”
   - 典型映射：
     - “读取其他 Store 的状态/变化” → `const $Other = yield* $.use(OtherSpec)`；
     - “调用 Service” → `const api = yield* $.use(ApiServiceTag)`。

5. **结构 (Structure) → `$.match` / `Effect.*`**
   - **意图**：表达分支、错误处理、并发等结构化逻辑。
   - **映射**：
     - 条件分支 → `$.match(val).with(...).exhaustive()`；
     - 错误边界 → `Effect.catchAll(...)`；
     - 并行执行 → `Effect.all([...])`。

> Agent 视角下，这五个技能是等价的一等公民：
> **不要只会写 `$.onState` / `$.onAction` / `$.on` 和 `$.state`，却把所有结构层逻辑埋在裸 `if/else` 和 `try/catch` 里。**

> 与 runtime-logix（SSoT）的对齐说明：这里的“感知/策略/行动”等技能，正好对应 Bound API `$` 内部的几个子域——`$.on*` 负责感知 (Perception)、`$.flow.*` 负责策略 (Strategy，时间轴与并发)、`$.state / $.actions` 负责行动 (Actuation)、`$.use` 与 `$.match` 分别承担协作与结构层职责。Agent 在写代码时应始终沿着这条链路思考，而不是把它们当成三套割裂的 API。
