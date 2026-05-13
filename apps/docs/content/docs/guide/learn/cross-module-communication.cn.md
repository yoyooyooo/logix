---
title: Cross-module communication
description: 通过 imports 和 runtime scope 内的服务读取协调模块，而不制造循环 ownership。
---

Logix 里的跨模块协作主要有两条路线：

1. 通过 `imports` 做 parent-scope child resolution
2. 通过 `$.use(Tag)` / `Effect.service(Tag)` 读取当前 runtime scope 内的服务

## Imports

当一个 Program 需要在当前父实例 scope 内拥有 child Program 时，使用 `imports`。

默认路径：

1. 在 `Program.make(..., { capabilities: { imports } })` 中放入 child Program。
2. Logic 中用 `$.imports.get(Child.tag)` 解析 child。
3. 读一次用 `child.read(selector)`，订阅变化用 `$.on(child.changes(selector))`。
4. React 中用 `host.imports.get(Child.tag)` 或 `useImportedModule(host, Child.tag)` 解析 child。

```ts
const ChildProgram = Logix.Program.make(Child, {
  initial: { value: 0 },
})

const HostProgram = Logix.Program.make(Host, {
  initial: { childValue: 0 },
  capabilities: {
    imports: [ChildProgram],
  },
  logics: [HostLogic],
})
```

```ts
const HostLogic = Host.logic("host-logic", ($) =>
  Effect.gen(function* () {
    const child = yield* $.imports.get(Child.tag)
    const value = yield* child.read((s) => s.value)
    yield* $.dispatchers.hostSawChild(value)
  }),
)
```

```ts
const SyncChildLogic = Host.logic("sync-child", ($) =>
  Effect.gen(function* () {
    const child = yield* $.imports.get(Child.tag)

    yield* $.on(child.changes((s) => s.value)).run((value) =>
      $.state.mutate((draft) => {
        draft.childValue = value
      }),
    )
  }),
)
```

`Module` 不进入 `imports`。进入 `imports` 的单元固定是 `Program`。

## runtime scope 内的服务读取

当 logic 需要服务时，直接从当前 runtime scope 读取。

```ts
const api = yield* $.use(SearchApi)
```

`$.use(Tag)` 用于 runtime-scope service lookup，不承担 child Program resolution。

## 文件结构

把跨模块导入保持在 logic 层：

- `module.ts` 负责定义模块形状
- `logic.ts` 负责消费其他模块或服务

这样可以避免文件图层面的循环 ownership。

## 说明

- UI 默认依赖 host
- imported child 应继续从父实例 scope 解析
- 服务读取应继续停在当前 runtime scope
- 跨模块协作应继续停在模块内或页面级 logic 中
- field external-store source bridge 属于高级运行时机制，不作为 child composition 的默认路径

## 相关页面

- [useImportedModule](../../api/react/use-imported-module)
- [Bound API ($)](../../api/core/bound-api)
