---
title: Program
description: Module 的 canonical assembly boundary。
---

`Program.make(Module, config)` 是公开装配路线。它把 definition object 变成 Runtime 与 React 消费的业务单元。

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
  capabilities: {
    services: AppLayer,
    imports: [ChildProgram],
  },
})
```

## Config

| 字段 | 作用 |
| --- | --- |
| `initial` | 模块初始状态。 |
| `logics` | 挂载进 Program 的 logic units。 |
| `capabilities.services` | Service `Layer` 或 layer 数组。 |
| `capabilities.imports` | 可通过 `$.imports.get(...)` / `useImportedModule(...)` 访问的子 Program。 |
| `stateTransaction` | transaction instrumentation 与调优选项。 |

## 为什么 Program 是边界

- 它把 authoring (`Module`) 与 assembly (`Program`) 分开。
- 它集中 initial state、services、imports 与 transaction policy。
- 它是 `Runtime.make(...)`、`Runtime.run(...)`、`Runtime.check(...)`、`Runtime.trial(...)` 的输入。
- 它也是 React 局部实例 `useModule(Program, options)` 的输入。

## Non-goals

`Program.make(...)` 不是旧 module implementation 的兼容壳。不要为领域包再加第二套装配 helper；领域包应返回 Program，或返回能机械降解到这条路线的值。

## See also

- [Module](./module)
- [Runtime](./runtime)
- [useModule](/cn/docs/api/react/use-module)
