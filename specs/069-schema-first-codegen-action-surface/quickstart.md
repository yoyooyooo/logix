# Quickstart: StateSchema + Field Ops（069 · pre-codegen）

本 quickstart 描述本特性实现完成后的最小用法（偏业务开发者/运行时消费者视角）。

## 1) 核心写法：在 state 字段上声明 ops（`StateSchema.Field`）

- 只要 state 字段的 Schema 由 `StateSchema.Field(...)` 构造，并声明了 `ops`：
  - `assign/merge/push/toggle ...`
- 运行时就会在 `Module.make` 冷路径把它编译成 **派生 actions + 派生 reducers** 并装配进模块（等价于你手写了 actions + reducers）。
- IDE 的跳转落点就是 state schema 中对应字段/op 的定义行（能直接看到 ops 声明）。

## 2) 真实例子：Todo 模块（assign / merge / push / toggle）

> 目标：不写任何 reducers，只靠蓝图把常见状态更新自动装配出来。

```ts
import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import { StateSchema } from '@logix/core'

// ------------------------------------------------------------
// 1) State Schema（嵌套 + 数组 + boolean）
// ------------------------------------------------------------

export const TodoState = StateSchema.Struct({
  draft: StateSchema.Struct({
    title: StateSchema.Field(Schema.String, (op) => ({
      assign: op.assign({ summary: '设置标题（assign）' }),
    })),

    tags: StateSchema.Field(Schema.Array(Schema.String), (op) => ({
      push: op.push({ summary: '追加 tag（push）' }),
    })),
  }),

  ui: StateSchema.Struct({
    panelOpen: StateSchema.Field(Schema.Boolean, (op) => ({
      toggle: op.toggle({ summary: '切换面板开关（toggle）' }),
    })),
  }),

  server: StateSchema.Struct({
    patch: StateSchema.Field(
      Schema.Struct({ title: Schema.String, tags: Schema.Array(Schema.String) }),
      (op) => ({
        merge: op.merge({ summary: '合并后端 patch（merge）' }),
      }),
    ),
  }),
})

export const Todo = Logix.Module.make('Todo', {
  state: TodoState,
  // actions/reducers: 不写；运行时会从 stateOps 编译并挂载
})

// ------------------------------------------------------------
// 2) 使用：dispatch（State-first：`$.fields.<path>.<op>(payload?)`）
// ------------------------------------------------------------

export const DemoLogic = Todo.logic(($) =>
  Effect.gen(function* () {
    yield* $.fields.draft.title.assign('Hello')
    yield* $.fields.draft.tags.push('p0')
    yield* $.fields.ui.panelOpen.toggle()

    // merge：payload 为 Partial（示例）
    yield* $.fields.server.patch.merge({ title: 'Hello v2' })
  }),
)
```

## 3) IDE 人工验收（推荐）

- 在 `$.fields.draft.title.assign('Hello')` 的 `title` 上执行“跳转到定义”，应定位到 `TodoState` 中 `title:` 这一行（字段锚点）。
- 在同一段的 `assign` 上执行“跳转到定义”，应定位到 `assign:` 这一行（op 锚点）。
- actionTag 默认由 `statePath + opName` 派生：例如 `draft.title:assign`、`draft.tags:push`、`ui.panelOpen:toggle`；如重构需要保持 tag，可在 op 上用 `tag` override。

## 4) 失败示例（必须 fail fast）

这些错误都应在 `Module.make`（冷路径装配）阶段直接报错，并指向具体 `statePath/opName` 与蓝图值：

- `push` 用在非数组字段（例如 `draft.title`）
- `merge` 用在非对象字段（例如 `ui.panelOpen`）
- `toggle` 用在非 boolean 字段
- 同一路径下出现重复 `actionTag`（例如不同 op override 到同一 tag）
- `logix/*` 命名空间下 unknown key（例如把 `"logix/stateOps"` 写成 `"logix/stateOp"`）
