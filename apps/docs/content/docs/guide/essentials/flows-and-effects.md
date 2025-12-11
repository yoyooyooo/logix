---
title: Flows & Effects
description: 学会用 Fluent Flow + Effect 处理副作用与异步逻辑。
---

# Flows & Effects

在真实业务里，“逻辑代码”几乎都离不开副作用：

- 发送网络请求；
- 读写本地存储；
- 打印日志 / 埋点；
- 操作其他 Module / Service。

Logix 的做法是：

- 用一个统一的入口 `$` 来描述“**从事件到副作用**”的流程（Flow）；
- 用 Effect 来承载具体的“该做什么”（Effect 程序），并统一管理异步与错误。

> 如果你没有 Effect 背景，可以先把本页当成“如何用 `$` 写异步逻辑”的指南；  
> 想知道 Effect 的更多细节时，再阅读 [Effect 速成](./effect-basics)。

## 1. 典型模式：Action → Effect → 更新状态

最常见的模式是：**用户触发一个 Action，然后执行一段异步逻辑，最后写回状态**。

```ts
// UserLogic.ts
import { Effect } from "effect"
import { UserModule } from "./module"
import { UserApi } from "../services/UserApi"

export const UserLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    // 监听 "fetchUser" 动作
    yield* $.onAction("fetchUser").run((userId: string) =>
      Effect.gen(function* () {
        // 1. 打日志（可选）
        yield* Effect.log(`Fetching user ${userId}...`)

        // 2. 调用外部服务
        const api = yield* $.use(UserApi)
        const user = yield* api.getUser(userId)

        // 3. 写回状态
        yield* $.state.update((s) => ({ ...s, user }))
      }),
    )
  }),
)
```

可以这样理解：

- `$.onAction("fetchUser")` 表示“从当前 Module 的 Action 流中，挑出 `_tag = "fetchUser"` 的事件”；
- `.run(handler)` 表示“每次命中时，按顺序执行这段 Effect 作为副作用”；
- `Effect.gen(function* () { ... })` 则是用同步写法表达“先干 A，再干 B，然后干 C”。

## 2. 处理并发：run / runLatest / runExhaust

当用户频繁触发事件（连点按钮、快速输入搜索词等），你往往需要控制“多个请求如何并发”：

- **`run`**：串行执行（默认）；
- **`runLatest`**：只保留最新的请求（旧的会被取消）；
- **`runExhaust`**：前一个没跑完时，忽略后续请求。

可以简单记住下面这张表：

| API          | 行为描述                         | 典型场景                         |
| ------------ | -------------------------------- | -------------------------------- |
| `run`        | 串行执行，每次都完整跑一遍       | 日志上报、顺序处理队列事件       |
| `runLatest`  | 取消上一个，永远只保留最新一次   | 搜索框、动态筛选、Tab 快速切换   |
| `runExhaust` | 正在执行时丢弃后续事件（防抖重） | 表单提交、防止重复点击、幂等操作 |

### 2.1 `run` —— 串行（Sequential）

```ts
yield* $.onAction("log").run((msg: string) =>
  Effect.log(`Log: ${msg}`),
)
```

语义：每个 `"log"` 事件都会排队执行，前一个完成后才轮到下一个。

### 2.2 `runLatest` —— 最新优先（Search / 输入类场景）

```ts
yield* $.onAction("search").runLatest((keyword: string) =>
  Effect.gen(function* () {
    const api = yield* $.use(SearchApi)
    const results = yield* api.search(keyword)
    yield* $.state.update((s) => ({ ...s, results }))
  }),
)
```

语义：如果用户连续输入 `"a" → "ab" → "abc"`，只会保留最后一次请求，前面的会被自动取消。

### 2.3 `runExhaust` —— 忽略后续（防止重复提交）

```ts
yield* $.onAction("submit").runExhaust(() =>
  Effect.gen(function* () {
    yield* $.state.mutate((draft) => {
      draft.meta.isSubmitting = true
    })

    const api = yield* $.use(FormApi)
    yield* api.submit(/* ... */)

    yield* $.state.mutate((draft) => {
      draft.meta.isSubmitting = false
    })
  }),
)
```

语义：在当前提交流程没结束之前，后续的 `"submit"` 点击会被直接忽略。

## 3. 监听 State 变化：像更强的 useEffect

很多时候，我们并不是直接监听 Action，而是“当某个字段变化时，触发后续逻辑”。  
这在 Logix 中对应 `$.onState(selector)`：

```ts
// 当 userId 变化时，自动重新加载数据，并做 300ms 防抖
yield* $.onState((s) => s.userId)
  .debounce(300)
  .run((userId) =>
    Effect.gen(function* () {
      if (!userId) return
      yield* $.actions.dispatch({ _tag: "fetchUser", payload: userId })
    }),
  )
```

可以把它类比为：

- `selector` = `useEffect` 的依赖；
- `.debounce(300)` = 在 Stream 层做防抖；
- `.run(handler)` = 每次变化时执行一段 Effect。

与 `useEffect` 相比，优势在于：

- 所有逻辑都集中在 Module 的 Logic 里，和 UI 解耦；
- 可以更自然地复用 / 测试；
- 并发语义明确，不再需要“手搓 flag + cleanup”。

## 4. 依赖注入：用 $.use 获取 Service / 其他 Module

在 Logic 中，所有外部依赖都通过 `$.use` 获取：

- 传入 Service Tag：拿到 Service 实现（例如 API、配置、Storage 等）；
- 传入其他 Module：拿到只读句柄（可以读状态、监听变化、派发 Action）。

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // 1. 获取 API 服务
    const api = yield* $.use(ApiService)

    // 2. 获取其他 Module 的句柄
    const $Detail = yield* $.use(DetailModule)

    // 3. 当当前 Module 的某个字段变化时，驱动 DetailModule
    yield* $.onState((s) => s.selectedId)
      .filter((id) => !!id)
      .run((id) =>
        $Detail.dispatch({ _tag: "detail/initialize", payload: id }),
      )
  }),
)
```

> 更多跨模块协作的完整示例，可以参考 [跨模块通信](../learn/cross-module-communication)。

## 5. 进一步深入

如果你已经习惯用 `$` 写 Logic，并且开始好奇“这些 Fluent API 底层究竟是怎么实现的”，可以继续阅读：

- [Effect 速成：只学你需要的 20%](./effect-basics)
- [Logic Flows 深入讲解](../learn/adding-interactivity)
- [深度剖析：Env / Flow / Runtime](../learn/deep-dive)

如果你更关心的是“模块的创建与销毁时机、如何做初始化和清理”，下一步可以看：

- 👉 [Lifecycle](./lifecycle)
