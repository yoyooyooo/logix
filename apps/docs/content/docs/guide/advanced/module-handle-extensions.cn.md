---
title: 模块手柄扩展（commands/services）
description: 给自定义 Module 增加更好用的句柄扩展入口，默认收口到 commands/services。
---

自定义 Module 可以在标准句柄上增加 `commands`、`services` 等扩展字段。适合领域包或业务基础设施包作者在保留标准协议的前提下，给调用方提供更顺手的调用入口。

默认推荐把句柄扩展收口到 `commands/services`：`commands.*` 承担便利命令入口，`services.*` 暴露调用方需要注入的能力。它们都只是句柄层扩展，最终仍然通过模块的 `dispatch/read/changes` 等标准能力工作。

这类扩展的目标通常是：

- **减少样板**：把一串 `actions.*` + `read` + “小规则”封装成单个方法；
- **统一 handle 形状**：Logic 中的 imported child resolution（`yield* $.imports.get(Module.tag)`）与 React（`useModule(ModuleTag)` / `useModule(Program)`）拿到同样的扩展字段；
- **不改变协议**：重要状态变化仍通过 action 表达（可订阅/可诊断/可回放），`commands/services` 只做便利层，不新增第二语义面。

## 适用场景

- 你在编写一个模块工厂/领域模块（例如 `Form.make(...)`、`@logixjs/domain/Crud` 里的 `make(...)` 这类），希望调用方少写样板代码。
- 你希望把一组“组合操作”封装为 `commands.*`，并且在 Logic 与 React 两侧都能用。
- 你希望把需要调用方注入的能力（Tag）组织成 `services.*`，让业务侧更容易提供 `Layer`。

## 何时该用 action，何时该用 commands

- **action**：模块的“公开协议”（有 schema，可被 `$.onAction(...)` 订阅；诊断/回放链路更清晰）。适合对外暴露的命令、跨模块协作入口、需要追踪的业务意图。
- **commands**：句柄层便利命令（本质是对 `dispatch/read` 的封装；本身不会成为“可订阅事件”）。适合把高频组合操作、常用参数默认值、轻量校验等封装起来。

经验法则：**把系统“发生了什么”放进 action；把“怎么更方便地调用”收口到 `commands.*`。**

## 核心机制：扩展 module handle/reference

扩展点叫 `logix.module.handle.extend`：你把它挂在 **`module.tag`** 上，Logix 在构造“模块句柄/引用”时会调用它，并把返回对象合并到基础句柄上。

> 直觉理解：`commands/services` 不会写进 state，也不会变成 action；它们只是“句柄/引用对象”上的额外字段。

如果你在模块的 `tag` 上挂载一个约定的扩展函数，运行时会在构造“模块句柄/引用”时把扩展字段合并进去：

```ts
const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(MyModule.tag as any)[EXTEND_HANDLE] = (_runtime, base) => ({
  ...base,
  commands: { /* ... */ },
  services: { /* ... */ },
})
```

这样：

- Logic 中 `yield* $.imports.get(MyModule.tag)` 拿到的 imported child handle 会带上 `commands/services`；
- React 中 `useModule(MyModule.tag)`（或基于它组装出的 `Program`）返回的 ref 也会带上同样的扩展字段；
- 你仍然保留 `base` 上的标准能力（`read/changes/dispatch/actions/...`）。

## 一个完整例子：自定义模块 + services + commands（作者侧）

```ts
import * as Logix from "@logixjs/core"
import { Context, Effect, Schema } from "effect"

class Api extends Context.Tag("Todo.Api")<Api, { readonly load: () => Effect.Effect<ReadonlyArray<string>> }>() {}
const services = { api: Api } as const

const StateSchema = Schema.Struct({ items: Schema.Array(Schema.String) })
const Actions = { reload: Schema.Void }

type Ext = {
  readonly services: typeof services
  readonly commands: { readonly reload: () => Effect.Effect<void> }
}

const TodoDef = Logix.Module.make<"Todo", typeof StateSchema, typeof Actions, Ext>("Todo", {
  state: StateSchema,
  actions: Actions,
})

const EXTEND_HANDLE = Symbol.for("logix.module.handle.extend")
;(TodoDef.tag as any)[EXTEND_HANDLE] = (runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => ({
  ...base,
  services,
  commands: {
    reload: () => runtime.dispatch({ _tag: "reload" } as any),
  },
})

export const TodoProgram = Logix.Program.make(TodoDef, {
  initial: { items: [] },
  logics: [
    TodoDef.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction("reload").runFork(() =>
          Effect.gen(function* () {
            const api = yield* Effect.serviceOption(services.api)
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

- 业务侧可以用 `TodoProgram`（或 `TodoDef.tag`）组合到 runtime / React 中；
- Logic 中 parent Program import `TodoProgram` 后，可通过 `yield* $.imports.get(TodoDef.tag)` 拿到带 `todo.commands.reload()` 与 `todo.services.api` 的 child handle；
- React 中 `useModule(TodoDef.tag)` 或 `useModule(TodoProgram)` 同样能拿到 `commands/services`。

## 让 TypeScript 知道扩展字段存在（类型层）

推荐把扩展字段的类型写到 `Logix.Module.make(...)` 的第 4 个泛型参数（`Ext`）里：

```ts
type Ext = { readonly commands: MyCommands; readonly services: MyServices }
const MyModule = Logix.Module.make<"My", typeof StateSchema, typeof Actions, Ext>("My", def)
```

然后在扩展函数里返回 `{ ...base, commands, services }`，做到“类型承诺”和“运行时返回值”一致。

## 注意事项（避免踩坑）

- `commands` 尽量**不要绕过 action**直接做“隐形状态变更”；优先封装成 `dispatch({ _tag: ... })` 或 `actions.*(...)`。
- 扩展函数必须返回一个对象；并且通常应当保留 `...base`，否则你会丢掉 `read/changes/dispatch/actions` 等基础能力。
- `logix.module.handle.extend` 要挂在 `module.tag` 上，而不是挂在 `module` 对象上。
- 不要把不可序列化的大对象（DOM、函数闭包、大实例）塞进 state/诊断事件；`commands`/服务 Tag 也应保持轻量。
- `commands` 中做 IO 时，仍需遵守事务窗口与 Effect 并发/取消的约束（把 IO 放在 Effect 流程边界）。
