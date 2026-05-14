---
title: Program
description: 装配期业务单元：module、logic、imports、services 与 state policy。
---

`Program.make(Module, config)` 是公开装配边界。它把定义对象变成可运行业务单元。

## `Program.make`

```ts
const Program = Logix.Program.make(Module, {
  initial,
  logics: [LogicA, LogicB],
  capabilities: {
    imports: [ChildProgram],
    services: [ApiLive, LoggerLive],
  },
  stateTransaction: {
    fieldConvergeMode: "auto",
  },
})
```

## Config

| 字段 | 含义 |
| --- | --- |
| `initial` | module 的 initial state。 |
| `logics` | `Module.logic` 产出的 logic units。 |
| `capabilities.imports` | 可通过 module tag 读取的 child programs。 |
| `capabilities.services` | program 的 service layers。 |
| `stateTransaction` | module-level transaction policy。 |

## 为什么需要 Program

`Program` 是声明和 runtime assets 在执行前收敛的地方。React 局部 ownership 也使用 program：`useModule(Program, { key })`。

## 边界

不要绕过 `Program.make` 使用 module implementation helper。`Runtime.make` 期望接收 program。
