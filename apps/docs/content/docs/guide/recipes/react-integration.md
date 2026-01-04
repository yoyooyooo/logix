---
title: 在 React 中使用 Logix
description: 如何在 React 应用中接入 Logix Runtime，并通过 Hooks 使用模块状态与动作。
---

本篇从“业务开发者”的视角，演示如何在一个普通的 React 应用中接入 Logix，并通过 `@logix/react` 提供的组件和 Hooks 读取/更新状态。

> 如果只想快速看结论，可以记住两件事：
>
> 1. 在应用根部用 `RuntimeProvider` 包住路由或页面；
> 2. 在组件里只用 `useModule` / `useSelector` / `useDispatch`，不要再写 `useEffect + useState` 胶水。

### 适合谁

- 正在将 Logix 接入现有 React 项目，或为新项目搭建基础骨架的前端工程师；
- 希望弄清楚“RuntimeProvider + useModule/useSelector/useDispatch”这条链路的具体职责。

### 前置知识

- 熟悉 React Context / Hooks 的基本用法；
- 了解 ModuleDef / program module / ModuleImpl / Runtime 的基础概念（可参考 Quick Start 与 Essentials）。

### 读完你将获得

- 一套可直接复用的接入步骤：如何创建 Runtime、如何在根组件挂载 Provider、如何在组件中消费 Module；
- 对全局 Module vs 局部 Module（`useLocalModule`）的适用场景有直观认识。

## 0. 能力地图（先掌握这些）

在 `@logix/react` 里，建议把能力拆成几条正交轴：

1. **解析句柄**：`useModule` / `useLocalModule` → 得到 `ModuleRef`
2. **订阅渲染**：`useSelector(handle, selector[, equalityFn])`
3. **派发动作**：`useDispatch(handle)`（或 `handle.dispatch(action)`）
4. **imports scope**：`handle.imports.get(Child.tag)`（或 `useImportedModule` 作为 Hook 形态）

> 本文后面会用到一些语法糖（如 `ref.dispatchers.*`、`useModule(handle, selector)`），它们只是写法更短，不引入新能力。

## 1. 准备一个 Logix Module

先在任意目录下定义一个最简单的计数器 Module：

```ts
import * as Logix from '@logix/core'
import { Schema } from 'effect'

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

export const CounterLogic = CounterDef.logic(($) =>
  $.onAction((a): a is { _tag: 'inc' } => a._tag === 'inc').update((state) => ({ ...state, count: state.count + 1 })),
)
```

在你的应用入口，为这个 Module 构造一个 Root program module（或其 `ModuleImpl`），并通过 `Logix.Runtime.make` 组装 Runtime：

```ts
import * as Logix from '@logix/core'
import { Layer } from 'effect'
import { CounterDef, CounterLogic } from './CounterModule'

export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl

export const AppRuntime = Logix.Runtime.make(CounterModule, {
  layer: Layer.empty, // 也可以在这里合并各种服务 Layer
})
```

## 2. 在 React 根组件中挂载 RuntimeProvider

在 React 应用根组件中，用 `RuntimeProvider` 包住你的路由/页面：

```tsx
// App.tsx
import { RuntimeProvider } from '@logix/react'
import { AppRuntime } from './runtime'
import { Router } from './Router'

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <Router />
    </RuntimeProvider>
  )
}
```

`RuntimeProvider` 会负责：

- 托管并向下透传一个 Logix `ManagedRuntime`（通常由 `Logix.Runtime.make(...)` 创建）；
- 把必要的 Context（Layer 提供的服务）注入到 Runtime 中；
- 让子树里的所有 Hooks 都能访问到同一个 Runtime。

如果你的项目已经自己创建了 Runtime，直接传入 `runtime` 即可。

## 3. 在组件中读取状态：useModule / useSelector

在任意组件里，通过 Hook 读取 Module 的状态：

```tsx
import { useModule, useSelector } from '@logix/react'
import { CounterDef } from '../runtime/CounterModule'

export function CounterValue() {
  // 获取模块句柄（包含 runtime / dispatch / actions 等能力）
  const counter = useModule(CounterDef)

  // 或者只订阅某个字段，组件只会在该字段变化时重渲染
  const count = useSelector(counter, (s) => s.count)

  return <span>{count}</span>
}
```

推荐在大多数场景中使用 `useSelector` 订阅切片状态，而不是把完整 `state` 传给组件，这样可以避免不必要的重渲染。

> `useSelector(handle, selector, equalityFn)` 默认用 `Object.is` 比较选中值；当 selector 返回数组/对象时，建议传入 `shallow`（`@logix/react` 内置）来避免“内容不变但引用变化”导致的无意义重渲染。

> 注意：`useModule(Module)` 本身**不会订阅状态**，因此不会因为状态更新自动触发组件重渲染。
>
> - 需要响应式渲染时：使用 `useSelector(handle, selector)`，或直接用 `useModule(Module, selector)`（语法糖）。
> - 只需要派发动作时：可以用 `useDispatch(Module)`，或直接使用 `handle.dispatch`。

## 4. 在组件中派发动作：useDispatch

要改变状态，只需要派发一个符合 Action Schema 的对象：

```tsx
import { useDispatch, useModule } from '@logix/react'
import { CounterDef } from '../runtime/CounterModule'

export function CounterButton() {
  const counter = useModule(CounterDef)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch(CounterDef.actions.inc())}>+1</button>
}
```

`useDispatch` 会自动使用当前的 Runtime 和对应的 ModuleRuntime，在内部调用 `runtime.runFork(moduleRuntime.dispatch(action))`，不需要你自己处理异步或错误通道。

如果你更偏好“方法调用”风格，可以在拿到 `ModuleRef` 后使用 `ref.dispatchers.*`（语法糖，见下文「6.1 语法糖速查」）。

### 4.1 （可选）性能用法：批处理与低优先级派发

在极端高频交互场景中，你可能会遇到两类常见问题：

- 一次业务意图需要连发多个 Action（导致多次提交/多次通知）。
- 某些更新并不影响当前输入手感，但会触发大量组件渲染（例如：实时统计、摘要、非关键提示）。

这时可以显式使用两种“兜底旋钮”：

- `dispatchBatch(actions)`：把多次同步派发合并成一次可观察提交。
- `dispatchLowPriority(action)`：把本次提交的**通知**标记为低优先级（不改变事务提交正确性），React 会更温和地合并通知节奏（最终必达且有上界）。

> 提示：Batch 更适合“同一业务意图里连续派发多个 Action”且不依赖每一步的中间派生结果；更完整的边界与踩坑见“性能与优化”章节。

在 React 事件处理函数里，你可以直接用 `dispatch.batch / dispatch.lowPriority`；或者用 `useRuntime()` 更白盒地执行 Effect。

```tsx
import { useDispatch, useModule, useSelector } from '@logix/react'

export function Form() {
  const form = useModule(FormModule)
  const dispatch = useDispatch(form)

  // ✅ 只订阅必要字段，减少无谓渲染
  const value = useSelector(form, (s) => s.value)

  const onBulkUpdate = () => {
    dispatch.batch([
      FormModule.actions.setA(1),
      FormModule.actions.setB(2),
    ])
  }

  const onRecomputeSummary = () => {
    dispatch.lowPriority(FormModule.actions.recomputeSummary())
  }

  return (
    <>
      <input value={value} onChange={(e) => dispatch(FormModule.actions.change(e.target.value))} />
      <button onClick={onBulkUpdate}>bulk</button>
      <button onClick={onRecomputeSummary}>summary</button>
    </>
  )
}
```

## 5. 局部状态：useLocalModule

对于仅在单个页面或组件中使用的状态（例如临时表单、向导），可以用 `useLocalModule` 创建一个“局部模块实例”：

```tsx
import { useDispatch, useLocalModule, useSelector } from '@logix/react'
import * as Logix from '@logix/core'
import { Schema } from 'effect'

const LocalForm = Logix.Module.make('LocalForm', {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String },
})

export function LocalFormComponent() {
  const form = useLocalModule(LocalForm, { initial: { text: '' } })
  const text = useSelector(form, (s) => s.text)
  const dispatch = useDispatch(form)

  return <input value={text} onChange={(e) => dispatch(LocalForm.actions.change(e.target.value))} />
}
```

`useLocalModule` 会在组件挂载时创建一个新的 ModuleRuntime，并在组件卸载时自动关闭相关 Scope 和资源。

> 提示：`useLocalModule` 在内部使用“资源缓存 + Scope 管理”机制，并且默认 **同步** 构建实例（不会触发 Suspense）。
>
> - 适合局部 UI 状态（替代 `useState/useReducer`）；
> - 需要异步初始化（读存储/请求数据等）时，把异步放进模块 Logic（Effect）里，或提升为 `useModule(Impl)` 并配合 `suspend/defer+preload`。

## 6. 分形模块（imports）：在父实例 scope 下读取/派发子模块

当一个模块通过 `imports` 组合了子模块时（例如：页面 Host 模块 imports 了一个 Query 模块），通常会出现一个很实际的问题：

> “子模块不是全局单例，而是**跟随父模块实例**一起创建的；组件侧要怎么拿到**属于这个父实例**的那一份子模块？”

这件事的核心能力是“在父实例 scope 内解析子模块”。推荐直接用 `host.imports.get(...)`（稳定、无需额外 Hook）；如果你想把它写成 Hook 形态，也可以用 `useImportedModule(host, ChildModule.tag)`（等价语法糖）。

示例：

```tsx
import { useDispatch, useModule, useSelector } from '@logix/react'
import { HostImpl, ChildModule } from './modules'

export function Page() {
  // 多实例场景用 key 区分（例如：SessionA / SessionB）
  const host = useModule(HostImpl, { key: 'SessionA' })

  // ✅ 解析到“属于这个 host 实例”的子模块
  const child = host.imports.get(ChildModule.tag)

  const value = useSelector(child, (s) => s.value)
  const dispatch = useDispatch(child)

  return <button onClick={() => dispatch(ChildModule.actions.refresh())}>{value}</button>
}
```

注意：

- 不要用 `useModule(ChildModule)` 来替代上面的写法：它表达的是“全局 Module（Tag）”语义，无法绑定到某个父实例，遇到多实例时容易串用；
- `host.imports.get(...)` 返回稳定的句柄，可直接写在 render 中，不需要额外 `useMemo`。
- 如果你的目标是“路由 scope 下多个弹框 keepalive，离开路由统一销毁”，推荐直接套用 [路由 Scope 下的弹框 Keepalive](./route-scope-modals) 这条配方。
- 如果只是想“触发/编排”子模块行为（例如父动作转发到子 Query.refresh），优先把这件事放到父模块 Logic（`$.use(ChildModule)`）或 Link/Process 里，让 UI 仍只依赖父模块。
- 当你发现 UI 需要链式访问多层 imports（`host.imports.get(A).imports.get(B)`）时，通常意味着依赖穿透过深：优先在边界处 resolve 一次并向下传 `ModuleRef`，或收敛为 Host 对外的 facade 状态/动作。

## 6.1 语法糖速查（只为更短，不引入新能力）

- `useModule(handle, selector[, equalityFn])` 等价于：`useSelector(useModule(handle), selector[, equalityFn])`
- `ref.dispatchers.<K>(payload)` 等价于：`dispatch(ModuleDef.actions.<K>(payload))`（其中 `dispatch = useDispatch(ref)`；`dispatchers` 只是语法糖，不保证 IDE 跳转到定义；需要稳定的“跳转/找引用/重命名”时，让代码里显式出现 `ModuleDef.actions.<K>`（或 `ref.def?.actions.<K>`）作为锚点）
- `useImportedModule(parent, Child.tag)` 等价于：`parent.imports.get(Child.tag)`
- `ModuleScope.make(Host.impl)` 等价于：在边界 `useModule(Host.impl, { key })` + React Context 传递（适合路由 scope / keepalive）

## 7. 从 useEffect / useRef 迁移到 Logix

在把现有 React 代码迁到 Logix 时，常见的一类问题是：

> “这个组件里有不少 `useEffect` / `useRef`，要怎么改成 Logix 的写法？”

一个简单的经验法则是：

- **业务逻辑相关的 mutable**（会影响分支、状态、流程）→ 收敛到 Module 的 `state` 或 Logic 内部的 Effect 流程；
- **只跟 DOM/第三方组件实例有关的 ref** → 先保留在 React（或封装到自定义 Hook），视为“视图层细节”，不强行搬到 Logix。

下面用两个典型例子来说明迁移方式。

### 7.1 逻辑状态型 useRef：迁到 Module 状态/Logic

很多组件里会用 `useRef` 记“上一帧的值”或某个 flag，例如：

```tsx
function Counter() {
  const [count, setCount] = useState(0)
  const prevRef = useRef(count)

  useEffect(() => {
    if (count > prevRef.current) {
      console.log('上涨')
    }
    prevRef.current = count
  }, [count])
}
```

这种 `prevRef` 本质是业务状态的一部分，可以直接迁到 Module：

- 在 Module 的 `state` 里显式加上 `prevCount` / `trend` 等字段；
- 在 Logic 中用 `$.onState` / `$.state.mutate` 维护它们；
- 组件只订阅最终状态，不再维护 `useRef`。

迁移后的结构大致是：

```ts
// 1）模块状态中显式建模“上一帧”的信息
const CounterState = Schema.Struct({
  count: Schema.Number,
  prevCount: Schema.Number,
  trend: Schema.Union(
    Schema.Literal("flat"),
    Schema.Literal("up"),
    Schema.Literal("down"),
  ),
})

export const CounterDef = Logix.Module.make("Counter", {
  state: CounterState,
  actions: { inc: Schema.Void },
})

// 2）Logic 中用 onState 维护 trend/prevCount
export const CounterLogic = CounterDef.logic(($) => Effect.gen(function*(){
  return $.onState((s) => s.count).mutate((draft, count) => {
    if (count > draft.prevCount) draft.trend = "up"
    else if (count < draft.prevCount) draft.trend = "down"
    else draft.trend = "flat"

    draft.prevCount = count
  }),
})
```

组件视角就只剩「读状态 + 派发动作」：

```tsx
function CounterView() {
  const count = useModule(CounterDef, (s) => s.count)
  const trend = useModule(CounterDef, (s) => s.trend)
  const dispatch = useDispatch(CounterDef)

  // ...
}
```

> 经验：**只要某个 `useRef` 的变化会影响 UI 或业务分支，就把它当成状态建模到 Module 里，而不是继续藏在组件内部。**

### 7.2 Flow 控制型 useRef：迁到 Logic/Effect

另一类常见用法是用 `useRef` 存定时器/请求句柄来做防抖、取消、重试，例如：

```tsx
function SearchBox() {
  const [keyword, setKeyword] = useState('')
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!keyword) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      fetch(`/search?q=${keyword}`)
    }, 300)
  }, [keyword])
}
```

这类 mutable 并不属于业务状态，只是“控制流程”的工具，更适合放到 Logic/Effect 中：

- Module state 只表达 `keyword` / `isLoading` / `result` 等业务含义；
- 防抖、并发控制、取消等交给 Effect：`$.onState` + `Effect.sleep` / `runLatest` / `runExhaust` 等；
- 组件仍然只负责输入和展示。

一个更 Logix 风格的写法是：

```ts
export const SearchModule = Logix.Module.make('Search', {
  state: Schema.Struct({
    keyword: Schema.String,
    isLoading: Schema.Boolean,
    result: Schema.optional(Schema.String),
  }),
  actions: {
    changeKeyword: Schema.String,
  },
})

export const SearchLogic = SearchModule.logic(($) =>
  Effect.gen(function* () {
    // 1）监听 keyword 的变化，做防抖 + 请求
    yield* $.onState((s) => s.keyword)
      .debounce(300)
      .runLatest((keyword) =>
        Effect.gen(function* () {
          if (!keyword) {
            yield* $.state.mutate((draft) => {
              draft.result = undefined
              draft.isLoading = false
            })
            return
          }

          yield* $.state.mutate((draft) => {
            draft.isLoading = true
          })

          const result = yield* searchApi(keyword)

          yield* $.state.mutate((draft) => {
            draft.result = result
            draft.isLoading = false
          })
        }),
      )
  }),
)
```

React 组件只需要：

```tsx
function SearchBox() {
  const keyword = useModule(SearchModule, (s) => s.keyword)
  const isLoading = useModule(SearchModule, (s) => s.isLoading)
  const result = useModule(SearchModule, (s) => s.result)
  const dispatch = useDispatch(SearchModule)

  // onChange 里只派发 changeKeyword，不再自己维护 timerRef
}
```

> 经验：**只为了“控制流程”的 `useRef`（定时器、AbortController 等），应该迁到 Logic/Effect 层，用 `$.onState` + Effect 的并发控制 API 表达，而不是继续在组件里手写。**

### 7.3 还可以保留的 useRef：真·DOM/实例句柄

迁移时，有一小部分 `useRef` 是可以保留在组件里的：

- 只用于拿到 DOM 句柄，例如 `inputRef` + `inputRef.current?.focus()`；
- 只用于拿第三方 UI 组件的实例（图表、地图等），调用其暴露的 imperative API；
- 不承载业务状态，也不做复杂的流程控制。

推荐的做法是：

- 将这类逻辑尽量封装到专门的 UI 组件或自定义 Hook 中（例如 `useAutoFocus`、`useChart`），保持业务组件只关心「何时触发」而不是「具体怎么实现」；
- 真正承载业务含义的部分（什么时候需要 focus、图表数据从哪里来等）仍然回到 Module/Logic 中，用状态和 Action 表达。

> 一句话总结：**业务逻辑相关的 `useRef` 收编到 Logix，纯 UI/DOM 相关的 `useRef` 可以保留在 React，但建议封装在小而清晰的视图组件/Hook 里。**

### 7.4 组件生命周期型 useEffect：用局部 Module 表达

还有一类常见的 `useEffect` 主要是为了表达“这个组件在的时候要做什么，组件卸载时要清什么”，例如：

```tsx
function Widget() {
  useEffect(() => {
    startSession()
    return () => stopSession()
  }, [])

  return <div>...</div>
}
```

这类逻辑本质上是在表达一个**视图会话（view session）** 的生命周期，很适合迁到一个“局部 Module” 上，用 `$.lifecycle.onInit/onDestroy` 管理：

- 为这个组件单独建一个 `WidgetModule` + `WidgetImpl`（或直接用 `useLocalModule`）；
- 在 Logic 里写：
  - `$.lifecycle.onInit(...)`：视图第一次挂载时启动订阅/轮询/初始请求；
  - `$.lifecycle.onDestroy(...)`：最后一个持有者卸载时停止订阅/清理资源；
- 组件里只需要 `useModule(WidgetImpl)` 或 `useLocalModule(WidgetModule, { initial, logics })`，不再自己写 `useEffect`。

这种拆分有几个好处：

- 组件代码更“傻”：只负责渲染和发意图，生命周期细节全部落在 Logic 中，方便复用和测试；
- 生命周期语义更明确：`onInit/onDestroy` 绑定的是“这棵局部 ModuleRuntime 的会话”，而不是某个具体的 React 组件实例；
- 更贴近 Logix 的整体心智模型：**组件的生命周期 = 局部 Module 会话的生命周期**，而不是一堆分散的 `useEffect`。

仍然需要留在组件里的 `useEffect` 通常只剩两类：

- 把浏览器/第三方库的事件翻译成 Action（例如监听滚动再 `dispatch`）；
- 极少数纯 UI 级别的副作用（例如修改 `<title>` 等），和业务流程无关。

## 8. ModuleImpl 的同步 / 异步模式（高级）

在实际项目中，你更推荐通过 `ModuleImpl` 暴露模块实现，然后在 React 里用 `useModule(Impl)` 来消费。
`@logix/react` 为 ModuleImpl 提供了两种模式：

1. **默认：同步模式（简单、直接）**

```tsx
// CounterModule 由 CounterDef.implement(...) 生成（program module，带 `.impl`）
import { useModule, useSelector, useDispatch } from '@logix/react'
import { CounterModule } from '../runtime/counter'

export function LocalCounter() {
  // 每个组件实例各自持有一份 CounterModule 的局部 ModuleRuntime
  const runtime = useModule(CounterModule)
  const count = useSelector(runtime, (s) => s.count)
  const dispatch = useDispatch(runtime)

  return <button onClick={() => dispatch({ _tag: 'inc', payload: undefined })}>count: {count}</button>
}
```

- 适用场景：模块构建过程本身是同步的（纯内存、依赖已经通过 Layer 提前注入好）；
- 优点：行为直观，调试简单，默认即可满足大多数页面/组件级状态需求。

2. **可选：Suspense 异步模式（需要显式 key）**

当 ModuleImpl 的构建依赖异步初始化（如 IndexedDB / 远程配置），可以开启 `suspend: true`：

```tsx
import { useId, Suspense } from 'react'
import { useModule, useSelector } from '@logix/react'
import { AsyncImpl } from '../runtime/asyncModule'

function AsyncWidgetInner({ userId }: { userId: string }) {
  const id = useId()

  const runtime = useModule(AsyncImpl, {
    suspend: true,
    key: `AsyncWidget:${id}`, // 显式提供稳定 key
    deps: [userId], // 依赖变化时会重建 ModuleRuntime
  })

  const state = useSelector(runtime, (s) => s.state)
  return <div>{state}</div>
}

export function AsyncWidget(props: { userId: string }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncWidgetInner {...props} />
    </Suspense>
  )
}
```

为什么异步模式需要显式 `key`？

- React 在 StrictMode / 并发渲染 / 未提交分支中，渲染次数和顺序可能与直觉不同；
- 对于内部的“资源缓存”来说，需要一个**由调用方控制的稳定标识**，才能在多次重试之间复用同一份异步资源；
- 因此，当你开启 `suspend: true` 时，`useModule(Impl)` 要求必须传入一个稳定的 `key`，通常推荐用：
  - `useId()` 作为组件级前缀；
  - 再拼上业务 ID（如 `userId` / `formId`）。

## 9. 会话级状态保持（Session Pattern）

在真实业务里，常见的一个需求是：

> “用户切换 Tab / 页面甚至短暂离开页面后，希望回来时还能看到刚才的页面状态（筛选条件、分页位置、临时结果等）。”

在 Logix + React 中，我们通过 **同一个 ModuleImpl + 显式 `key` + 可选的 `gcTime`** 来表达这类“会话级状态保持”：

- **组件级（默认）**：`useModule(Impl)` 每个组件实例各自持有一份运行时，组件卸载时状态会在一个很短的窗口后自动释放（默认约 500ms，用于应对 StrictMode 抖动，无需显式配置）；
- **会话级（Session）**：`useModule(Impl, { key, gcTime })` 在同一个 Runtime 内，用 `key` 标识一份“会话状态”，在组件卸载后继续保留一段时间，期间只要有组件用同一个 `key` 重新挂载，就会复用同一份状态。

一个典型的 Tab 场景写法：

```tsx
function TabContent({ tabId }: { tabId: string }) {
  const runtime = useModule(PageImpl, {
    key: `tab:${tabId}`,
    gcTime: 10 * 60 * 1000, // 10 分钟内如果再次使用相同 key，将复用同一份状态
  })

  const state = useSelector(runtime, (s) => s)
  const dispatch = useDispatch(runtime)

  // ...
}
```

在这个模式下：

- 在同一个 `ManagedRuntime` 内，`key` 相同的 `useModule(Impl, { key })` 会共享一份 `ModuleRuntime`；
- 当所有使用该 `key` 的组件都卸载后，状态不会立刻丢失，而是按照 `gcTime` 设定的时间窗口保留（默认来自 RuntimeProvider 配置快照，可通过 Runtime Layer `ReactRuntimeConfig.replace` 或 ConfigProvider 覆盖，未配置时约 500ms）；
- 如果在窗口内重新挂载同一个 `key`，会话状态会被完整复用；如果超过窗口仍无人使用，该会话会被自动清理。

## 10. 全局 Module vs 局部 ModuleImpl：执行时机心智模型

在 React 集成里，经常会遇到两个看起来很像、但语义不同的写法：

- `useModule(CounterImpl)` —— 传入的是“带 `.impl` 的模块对象”（默认创建局部实例）；
- `useModule(CounterDef)` 或 `useModule(CounterDef.tag)` —— 传入的是模块定义对象 / `ModuleTag`（接入全局实例）。

理解这两种形态的差异，可以用一个简单的规则：

> **谁创建 Runtime，谁管理生命周期；`useModule` 只在传入带 `.impl` 的句柄（模块对象 / ModuleImpl）时才负责“创建”。**

### 10.1 应用级 / 全局 Module（Runtime.make + useModule(Module)）

典型写法：

```ts
// runtime.ts
export const CounterModule = CounterDef.implement({ initial: { count: 0 }, logics: [CounterLogic] })
export const CounterImpl = CounterModule.impl
export const AppRuntime = Logix.Runtime.make(CounterModule, { layer: Layer.empty })
```

```tsx
// App.tsx
export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <Router />
    </RuntimeProvider>
  )
}

// 任意子组件
function CounterValue() {
  const count = useModule(CounterDef, (s) => s.count)
  // ...
}
```

在这种模式下：

- `CounterModule` 对应的 `ModuleRuntime` 由 `Runtime.make` 在应用级 Runtime 中统一创建和托管；
- `useModule(CounterDef)`（或 `useModule(CounterDef.tag)`）只是把组件接到这份已经存在的全局 `ModuleRuntime` 上，不会再创建新的实例；
- Counter Logic 的启动时机 ≈ 应用 Runtime 初始化时刻（通常在 App 启动时执行一次）。

适用场景：

- 当前用户、全局配置、应用级路由状态等“只在应用生命周期内初始化一次”的状态；
- 希望多个路由/组件天然共享同一份状态，不需要按 `key`/会话做拆分。

### 10.2 组件级 / 会话级 Module（useModule(Impl, options?)）

典型写法：

```tsx
function LocalCounter({ sessionId }: { sessionId: string }) {
  const runtime = useModule(CounterModule, {
    key: `counter:${sessionId}`,
    gcTime: 10 * 60 * 1000,
  })
  // ...
}
```

在这种模式下：

- `useModule` 会以 `(Impl, key, depsHash)` 为粒度，通过内部资源缓存创建/复用 `ModuleRuntime`；
- 第一次出现某个 `key` 时，组件就是这份 Runtime 的“创建者”，对应 Logic 也在这里启动；
- 当持有该 `key` 的所有组件都卸载后，会在 `gcTime` 窗口结束后销毁 Runtime，并触发 `onDestroy`。

适用场景：

- 页签 / 会话：每个 Tab / 页面实例都有自己的状态，需要在一定时间内保活；
- 局部向导 / 表单：组件树销毁时自然结束，不希望长期常驻。

### 10.3 选择建议（全局 vs 局部）

- **局部表单 / 向导等仅在一处使用的状态** → 使用组件级 `useModule(Impl)` 或 `useLocalModule`；
- **需要跨 Tab/页面短期保活的状态** → 使用 `useModule(Impl, { key, gcTime })` 设计会话级实例；
- **需要全局长期存在的状态（例如当前用户、全局配置）** → 使用应用级 Root 模块 + `Logix.Runtime.make` 提供全局实例，在 React 中通过 `useModule(模块定义对象或 ModuleTag)` 访问。

## 11. 下一步

- 回到总览：[可组合性地图](../advanced/composability)
- 想了解更多 Logix API，可以继续阅读 [API 参考](../../api/index) 部分；
- 想看更复杂的集成场景（多模块协作、异步流、远程服务），可以参考仓库中的 `examples/logix-react` 示例项目。
