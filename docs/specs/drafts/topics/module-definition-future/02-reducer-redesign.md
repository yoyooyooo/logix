---
title: Module Action / Reducer 建模重思考（v3 期）
status: draft
version: 2025-12-06
value: core
priority: next
---

## 0. 背景与问题

- 当前 Module API（概念层）：
  - 定义：`Logix.Module.make(id, { state, actions, reducers? })`
  - 逻辑：`Module.logic(($) => Effect.gen(...))`
  - 实现：`ModuleDef.implement({ initial, logics, imports?, processes? })`
- Reducer 的引入动机：
  - 如果把 **所有** 同步状态变更都当作 watcher（`$.onAction().update/mutate`）挂在 Logic 里，在极端场景会：
    - 带来额外 Flow/Stream 调度成本；
    - 让“简单、无 Env 的主状态转移”也被当成长逻辑的一部分，语义上不够纯粹。
  - 因此 v3 提出了 Module 级 `reducers` 字段，用于表达“基于 `(state, action) => state` 的 Primary Reducer”。
- 目前的不适感主要来自两个方向：
  - Reducer 被直接放在 `Module.make(..., reducers)` 上，概念介于“定义”和“实现”之间：
    - 它的确是纯函数（无 Env），更偏领域不变量；
    - 但挂在 ModuleConfig 上，容易被误解为“实现层的一块逻辑”，而不是 Action 语义的补充。
  - Action 本身的建模偏薄：
    - `actions: { tag: Schema }` 只表达了 **payload 的 Schema**；
    - “这个 Action 的主状态语义”被拆散到了 `reducers` 上，心智不连贯。
- effect-ts Schema 的边界：
  - Schema 无法表示函数类型，Reducer 作为函数实现不可能被 Schema 化；
  - 但**Action 在定义层实际上只需要区分「有没有 payload」以及「payload 是什么类型」**：
    - Reducer 的返回值在语义上必然是 State，无需额外 Schema；
    - 普通 Action 本身没有“返回值”概念，它只是一个 `tag + payload` 事件。

本草稿在这个前提下重述目标：**在承认 Schema 无法表示函数的情况下，把 Action / Reducer 的建模收敛到“State Schema + ActionMap（tag → payload Schema） + TS 层 Reducers 函数表”这一条干净路径上，再讨论 Reducer 的挂载点与 API 形状。**

## 1. 目标与约束

### 1.1 目标

1. 明确三层责任：
   - Module 定义层：只承载 State 形状 + Action 形状（含 payload 类型），以及“存在某些 Primary Reducer”的事实；
   - Logic/Flow 层：负责时间轴、跨 Module 协作、副作用、平台生命周期（Watcher / Flow / Link）；
   - 实现蓝图层（ModuleImpl）：组合初始状态、逻辑集与依赖层，作为 Runtime/App 的装配单元。
2. 把 Action / Reducer 的“定义 vs 实现”边界讲清楚：
   - Action 定义层只需要 Schema：`tag → payloadSchema`，`Schema.Void` 表示无 payload；
   - Reducer 永远是 `(state, payload) => state` 的 TS 函数，不进入 Schema，只在类型层约束签名；
   - 在 API 形状上，让“在哪挂 Reducer”变成实现策略，而不是概念混叠。
3. 提供一条对 LLM 友好的路径：
   - 生成 Action 时，只需要考虑“有没有 payload + payload 类型”；
   - 生成 Reducer 时，TS 类型自然收紧到“State + 对应 payload 类型 → State”，而不要求 LLM 设计一套函数 Schema。

### 1.2 约束

1. 不引入第二套 Action 语义（继续基于 `{ _tag, payload }` union）。  
2. 不尝试为 Reducer 函数建 Schema，保持“可序列化的只有结构类型”，函数只在 TS 类型层存在。  
3. 在不破坏现有 PoC 的前提下，优先通过“概念收敛 + 新 API 草案”的方式演进，而不是马上迁移所有调用。

## 2. Action / Reducer 的模型（Schema 层 vs TS 层）

### 2.1 Action 定义：Schema 只关心 payload

在定义层，Action 只需要两件事：

1. tag：动作名（对象 key，例如 `"input/change"`）；  
2. payload Schema：该动作的参数结构。

当前写法实际上已经符合这个思路：

```ts
const DirtyFormStateSchema = Schema.Struct({
  value: Schema.String,
  isDirty: Schema.Boolean,
})

const DirtyFormActionMap = {
  "input/change": Schema.String, // 有 payload:string
  "input/reset": Schema.Void,    // 无 payload
}
```

类型层通过 `ActionsFromMap<AMap>` 之类的工具，将其机械地翻译成：

```ts
type DirtyFormAction =
  | { readonly _tag: "input/change"; readonly payload: string }
  | { readonly _tag: "input/reset"; readonly payload: void }
```

这部分完全是 Schema → TS 的映射，**不牵涉任何“返回值”或 Reducer 语义**。

### 2.2 Reducer 类型：永远是 `(state, payload) => state`

Reducer 在概念上就是“Primary State Transition”：

- 输入：当前 State + 当前 Action（至少包含 tag + payload）；
- 输出：新的 State。

在类型层，我们已经有类似的辅助类型（简化示意）：

```ts
type ReducersFromMap<
  SSchema extends AnySchema,
  AMap extends Record<string, AnySchema>
> = {
  readonly [K in keyof AMap]?: (
    state: Schema.Schema.Type<SSchema>,
    action: {
      readonly _tag: K
      readonly payload: Schema.Schema.Type<AMap[K]>
    }
  ) => Schema.Schema.Type<SSchema>
}
```

关键点：

- Reducer 的“返回值类型 = State”是天然成立的，不需要 Schema 再描述；  
- 通过 `AMap` 中的 Schema，我们可以在 TS 层精确推导 payload 类型，给 Reducer 函数签名做类型约束；  
- **Schema 层只负责 State 和 Payload，Reducer 完全是 TS 函数问题**。

### 2.3 Reducer 的挂载策略：Logic 内部 DSL（仅 `$.reducer`）

在这个模型下，Reducer 的“挂载点”可以收敛到 Logic 层，由 `$` 提供一个**非 watcher**的 DSL 来定义 Primary Reducer，而不再在 `Module.make` 上暴露额外构造器。

- 现状：
  - `Logix.Module.make(id, { state, actions, reducers? })` 直接接受一张 Reducer 函数表；
  - Runtime 在构造 ModuleRuntime 时，将这张表注入内部，dispatch 时按 tag 同步调用对应 Reducer。
- 建议：在 `$` 上只提供一个一元 DSL：`$.reducer(tag, handler)`，在 Logic 内部声明 Primary Reducer：

```ts
// 概念性示例：在 Logic 内部定义 primary reducers
export const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    // 定义 tag 为 "inc" 的 Primary Reducer
    yield* $.reducer("inc", (state, _payload: void) => ({
      ...state,
      count: state.count + 1,
    }))

    // 其他 watcher/Flow 仍然用 $.onAction / $.onState / $.flow.*
  }),
)
```

语义：

- `$.reducer(name, handler)`：
  - `name` 必须来自 `Module.make({ actions })` 中的 key（Action/Reducer 同源）；
  - `handler` 类型固定为 `(state: StateOf<Sh>, payloadOf<name>) => StateOf<Sh>`；
  - 在 ModuleRuntime 上注册该 tag 的 Primary Reducer，dispatch 对应 tag 时走同步路径；
  - 不经过 `$.onAction` / Stream 监听链路，避免 watcher 的额外调度成本。
- 唯一性约束：
  - 对同一 tag 最多允许一个 `$.reducer` 定义；  
  - 若多个 Logic 尝试为同一 tag 定义 reducer，应视为配置错误（Dev 下抛错或严重告警），而不是默默覆盖。
- `$.onAction(...)`：
  - 继续作为 watcher/Flow 入口，用于副作用、跨模块编排等；
  - 默认视 Action / Reducer 为同源：**任何 dispatch 的 Action（无论是否有 Primary Reducer）都会出现在 `$.onAction` 可见的流里**，监听方无需区分“有没有 Reducer”。

本草案在 API 层只先确定方向：**Reducer 的定义不依赖 Schema，只依赖 State / ActionMap 提供的类型信息，挂载点倾向于 Logic 内部的 `$` DSL（单一入口 `$.reducer`），而不是新的 Module 级构造器。**

## 3. 与当前 API 的关系

### 3.1 现状回顾

当前 ModuleConfig 形态：

```ts
Logix.Module.make("Id", {
  state: StateSchema,
  actions: ActionMap,          // Record<string, Schema>
  reducers?: {
    [K in keyof ActionMap]?: (state, action) => state
  }
})
```

问题主要在于“语义叠加”：

- `reducers` 挂在 ModuleConfig 上，让人感觉它也是“定义层的一部分”，而不是“实现层的一张纯函数表”；  
- Reducer 类型依赖于 `ActionMap` 的结构（需要按 tag 拆 payload），但在 API 上这一点并不显性，只在内部类型中体现。

### 3.2 方向性共识

在新的思路下，我们希望统一到：

1. 概念层：
   - Module 定义 = `StateSchema + ActionMap`（tag → payload Schema）；
   - Reducer = `(State, payload) => State` 的 TS 函数表，由 `ReducersFromMap` 一类辅助类型保证签名正确；
   - 定义层不再试图为 Reducer 建 Schema。
2. 实现层：
   - `reducers` 字段继续存在，但被视为“Reducer 函数表的一个内部挂载点”，而不是“独立的 Schema 概念”；
   - 对外推荐通过 Logic 内部的 `$` DSL（仅 `$.reducer`）定义 Primary Reducer，避免再增加 `Module.withReducers` 或 `$.reducers` 这类额外入口。

本草稿的结论是：**无需在定义层引入额外的 ActionSpec/Reducer Schema 概念；仅通过 StateSchema + ActionMap + TS 层的 Reducers 函数表，再加上 Logic 内部的 `$.reducer` DSL，就可以表达我们需要的所有语义。**

### 2.3 与 State-First Codegen 草案的关系

在保持「Action = tag + payloadSchema；Reducer = TS 函数」这一模型的前提下，我们允许引入一个 **工程化实现策略**：

- 业务侧只维护 State Schema（以及少量字段级注解，例如 `"logix/autoReducer"`）；  
- 独立的 generator 在构建期：
  - 从 State / 注解推导出 ActionMap（tag → payload Schema）与 Reducers 函数表；
  - 生成普通的 `Module.make(id, { state, actions, reducers })` 调用与 `.d.ts`；
- Runtime 仍然只看到“StateSchema + ActionMap + Reducers 函数表”，完全符合本节的建模约束。

也就是说：`01-state-first-codegen.md` 描述的 State-First Module Codegen，并没有引入第二种 Action/Reducer 语义，只是在 **工程化层面** 自动化了 ActionMap/Reducers 的构造。SSoT 仍然是 State Schema + 注解，执行语义仍由 Reducer 函数与 Logic 承载。

## 4. Schema 与 Reducer 的边界

### 4.1 Schema 只负责结构类型

约束重申：

- effect-ts Schema 适用于描述结构类型（struct/union/array/...）；  
- 函数类型（包括 Reducer 实现）不具备 Schema 语义：
  - 无法在运行时重建函数行为；
  - 无法用于 IntentRule / Studio 这类 IR 的稳定展示；
  - 强行 Schema 化只会制造“看起来统一、实则不可靠”的幻觉。

结论：

- Action 定义部分：`tag + payloadSchema` 完全由 Schema 表达；  
- Reducer 实现部分：只在 TS 类型层约束 `(state, payload) => state`，不进入 Schema；  
- Studio / DevTools / IR 只消费：
  - ModuleId；
  - StateSchema；
  - Action payload Schema（以及是否存在某个 tag 对应的 primary reducer 的布尔标记即可）。

### 4.2 对 IR / Studio 的影响

对于未来的 Studio / IntentRule IR：

- 可视化/分析关注点：
  - “有哪些动作？” → tag 列表；
  - “payload 结构是什么？” → ActionMap 中的 Schema；
  - “是否定义了 primary reducer？” → 一个布尔标志 + 可选元数据（例如“来自 reducers 表”）。
- 不尝试：
  - 反射/重放 Reducer 函数体；
  - 在 IR 中保存 Reducer 业务语义，只在代码和类型层维护它。

这意味着：**代码仍然是 Reducer 语义的唯一事实源，IR 只负责表达可以被 Schema 捕获的那部分结构。**

## 5. 与 Logic 的分工（重申）

在“Action = tag + payloadSchema；Reducer = (state,payload)=>state 函数表”的模型下：

- Primary Reducer：
  - 只处理与 Env 无关的主状态转移；
  - 典型例子：`count++`、简单字段赋值、reset，到处都一样的“内在规则”；
  - 由 Reducers 函数表表达，与 State / ActionMap 强类型绑定。
- Logic / Watcher（`Module.logic(($)=>...)`）：
  - 决定**什么时候**触发哪些 Action；
  - 负责异步、并发、跨 Module 协作、平台 lifecycle、Link 等；
  - 使用 `$.onAction` / `$.onState` / `$.flow.*` / `$.use` / `$.lifecycle` 等高层 API。

简化的心智模型：

- Action 定义：**“发生了什么事（tag）+ 携带了什么数据（payload）”**；  
- Reducer：**“在不考虑外界的情况下，这个事件会把状态带向哪里（state → state）”**；  
- Logic：**“在真实世界中，这些事件何时发生、如何与其他事件/服务/模块协同”**；  
- ModuleImpl：**“把以上三者 + Env 组合成可运行实例”**。

## 6. 下一步建议（给未来自己）

1. 在 runtime-logix SSoT 中补充一节“Action / Reducer 模型”：
   - 明确：ActionMap 只描述 payload 形状，Primary Reducer 只在 TS 层实现；
   - 给出一个完整例子：StateSchema + ActionMap + ReducersFromMap + Logic 的组合。
2. 在 `@logix/core` 中巩固现有类型工具：
   - 确认 `ActionsFromMap` / `ReducersFromMap` 的签名清晰、易被 LLM 理解和复用；
   - 在类型注释中明确说明“Reducer 返回类型固定为 StateOf<Sh>，不需要额外 Schema”。
3. 在 examples / apps/docs 中挑一两个示例，显式展示：
   - ActionMap 用纯 Schema 定义（含 `Schema.Void` 表示无 payload）；
   - Reducer 用 TS 函数 + `ReducersFromMap` 收紧类型；
   - Logic 内通过单一 DSL `$.reducer` 定义 Primary Reducer，其他行为通过 watcher/Flow 表达。
4. 等 v3 栈稳定后，再评估是否：
   - 将 `reducers` 字段的使用收窄为“内部/高级入口”，对普通使用者和 LLM 推荐“Module.make + Logic 内部 Reducer DSL”的写法；  
   - 或保留现状，但在文档中明确：Reducer 只通过 `$` DSL 定义，ModuleConfig.reducers 属于实现细节。

本草稿暂定位为 L9，专注于“Action/Reducer 的建模边界与 Schema 的角色”，并提出“Logic 内部 Reducer DSL（仅 `$.reducer`）”作为最小增量演进方向。后续若形成更清晰的 DSL 设计与迁移策略，可以拆分为：

- 概念规范草稿：Action / Reducer / Logic / ModuleImpl 分工与同源/差异化边界（例如：`$.onAction` 默认看见所有 Action，包括经过 Reducer 处理的）；  
- API 草稿：`$.reducer` 具体签名、与现有 ModuleConfig.reducers 的兼容策略。
