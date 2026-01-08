---
title: 模块手柄扩展（controller/services）
description: 给自定义 Module 增加更好用的调用入口（在 Logic 的 $.use 与 React 的 useModule 上同时生效）。
---

这是一种**给自定义 Module 做“作者侧增强”**的玩法：当你在写一个可复用的模块（例如领域包/业务基建包），可以让调用方在拿到模块句柄时同时得到你提供的 `controller`、`services` 等字段。

有些模块会暴露 `controller.*`（例如 `@logix/form`）。这不是“额外一套状态机”，而是把一组常用组合操作封装成更顺手的方法，最终仍然通过模块的 `dispatch/read/changes` 等标准能力工作。

这类扩展的目标通常是：

- **减少样板**：把一串 `actions.*` + `read` + “小规则”封装成单个方法；
- **统一 DX**：同一套入口在 Logic（`yield* $.use(Module)`）与 React（`useModule(Module)`）都能用；
- **不改变协议**：重要状态变化仍通过 action 表达（可订阅/可诊断/可回放），controller 只做语法糖。

## 适用场景（这是“自定义模块作者”在玩的）

- 你在编写一个模块工厂/领域模块（例如 `Form.make(...)`、`CRUDModule.make(...)` 这类），希望调用方少写样板代码。
- 你希望把一组“组合操作”封装为 `controller.*`，并且在 Logic 与 React 两侧都能用。
- 你希望把需要调用方注入的能力（Tag）组织成 `services.*`，让业务侧更容易提供 `Layer`。

## 何时该用 action，何时该用 controller

- **action**：模块的“公开协议”（有 schema，可被 `$.onAction(...)` 订阅；诊断/回放链路更清晰）。适合对外暴露的命令、跨模块协作入口、需要追踪的业务意图。
- **controller**：句柄层语法糖（本质是对 `dispatch/read` 的封装；本身不会成为“可订阅事件”）。适合把高频组合操作、常用参数默认值、轻量校验等封装起来。

经验法则：**把系统“发生了什么”放进 action；把“怎么更方便地调用”放进 controller。**

## 核心机制：扩展 `$.use(...)` / `useModule(...)` 的返回值

扩展点叫 `logix.module.handle.extend`：你把它挂在 **`module.tag`** 上，Logix 在构造“模块句柄/引用”时会调用它，并把返回对象合并到基础句柄上。

> 直觉理解：`controller/services` 不是写进 state，也不是变成 action；它们是“句柄/引用对象”上的额外字段。

如果你在模块的 `tag` 上挂载一个约定的扩展函数，运行时会在构造“模块句柄/引用”时把扩展字段合并进去：

```ts
const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(MyModule.tag as any)[EXTEND_HANDLE] = (_runtime, base) => ({
  ...base,
  controller: { /* ... */ },
  services: { /* ... */ },
})
```

这样：

- Logic 中 `yield* $.use(MyModule)` 的返回值会带上 `controller/services`；
- React 中 `useModule(MyModule)` / `useModule(MyModule.tag)` 返回的 ref 也会带上同样的扩展字段；
- 你仍然保留 `base` 上的标准能力（`read/changes/dispatch/actions/...`）。

## 一个完整例子：自定义模块 + services + controller（作者侧）

```ts
import * as Logix from "@logix/core"
import { Context, Effect, Schema } from "effect"

class Api extends Context.Tag("Todo.Api")<Api, { readonly load: () => Effect.Effect<ReadonlyArray<string>> }>() {}
const services = { api: Api } as const

const StateSchema = Schema.Struct({ items: Schema.Array(Schema.String) })
const Actions = { reload: Schema.Void }

type Ext = {
  readonly services: typeof services
  readonly controller: { readonly reload: () => Effect.Effect<void> }
}

const TodoDef = Logix.Module.make<"Todo", typeof StateSchema, typeof Actions, Ext>("Todo", {
  state: StateSchema,
  actions: Actions,
})

const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(TodoDef.tag as any)[EXTEND_HANDLE] = (runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => ({
  ...base,
  services,
  controller: {
    reload: () => runtime.dispatch({ _tag: "reload" } as any),
  },
})

export const TodoModule = TodoDef.implement({
  initial: { items: [] },
  logics: [
    TodoDef.logic(($) =>
      Effect.gen(function* () {
        const todo = yield* $.use(TodoDef)
        yield* $.onAction("reload").runFork(() =>
          Effect.gen(function* () {
            const api = yield* Effect.serviceOption(todo.services.api)
            if (api._tag === "None") return
            const items = yield* api.value.load()
            yield* $.state.mutate((d) => {
              d.items = Array.from(items)
            })
          }),
        )
      }),
    ),
  ],
})
```

上面的效果是：

- 业务侧可以用 `TodoModule`（或 `TodoDef`）作为模块本体组合到 runtime/imports；
- Logic 中 `yield* $.use(TodoModule)`（或 `TodoDef`）拿到的句柄上会有 `todo.controller.reload()` 和 `todo.services.api`；
- React 中 `useModule(TodoModule)` / `useModule(TodoModule.tag)` 同样能拿到 `controller/services`。

## 让 TypeScript 知道扩展字段存在（类型层）

推荐把扩展字段的类型写到 `Logix.Module.make(...)` 的第 4 个泛型参数（`Ext`）里：

```ts
type Ext = { readonly controller: MyController; readonly services: MyServices }
const MyModule = Logix.Module.make<"My", typeof StateSchema, typeof Actions, Ext>("My", def)
```

然后在扩展函数里返回 `{ ...base, controller, services }`，做到“类型承诺”和“运行时返回值”一致。

## 注意事项（避免踩坑）

- controller 尽量**不要绕过 action**直接做“隐形状态变更”；优先封装成 `dispatch({ _tag: ... })` 或 `actions.*(...)`。
- 扩展函数必须返回一个对象；并且通常应当保留 `...base`，否则你会丢掉 `read/changes/dispatch/actions` 等基础能力。
- `logix.module.handle.extend` 要挂在 `module.tag` 上，而不是挂在 `module` 对象上。
- 不要把不可序列化的大对象（DOM、函数闭包、大实例）塞进 state/诊断事件；controller/服务 Tag 也应保持轻量。
- controller 中做 IO 时，仍需遵守事务窗口与 Effect 并发/取消的约束（把 IO 放在 Effect 流程边界）。
