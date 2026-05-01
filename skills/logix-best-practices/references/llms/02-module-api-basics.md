---
title: Module / Program / Runtime 基础写法（LLM 版）
---

# Module / Program / Runtime 基础写法（LLM 版）

## 1) 当前公开主链

```ts
const CounterLogic = CounterModule.logic("counter-logic", ($) => {
  // declaration at builder root
  return Effect.void
})

const CounterProgram = Program.make(CounterModule, {
  ...config,
  logics: [CounterLogic],
})
const runtime = Runtime.make(CounterProgram)
```

## 2) 角色边界

- `Module.logic(...)` 是 canonical logic authoring entry。
- `Program.make(Module, config)` 是公开装配入口。
- `Runtime.make(Program)` 是公开运行入口。
- 默认生成代码只使用 `Logix.Runtime.check(...)` 与 `Logix.Runtime.trial(...)`。`compare` 只可作为评审阶段名，禁止生成任何 compare 调用。
- `Module.logic(...)` 表示 module 对象上的 `.logic(id, build)` authoring entry。
- `build` 的同步阶段只做声明，返回值是唯一 run effect。

## 3) 事务规则

- 同步事务窗口不做 IO / await。
- 不在同步事务体内 dispatch 或调用 `run*Task`。
- 业务代码不要直接写 `SubscriptionRef`。
- 诊断事件必须 slim、可序列化、可稳定比较。

## 4) 默认验证入口，只生成 check / trial

```ts
await Logix.Runtime.check(CounterProgram, { mode: "static" })
await Logix.Runtime.trial(CounterProgram, { mode: "startup" })
```

业务代码只生成静态快检与启动试运行。交互脚本验证属于测试文件或验证文件，禁止写进业务 authoring surface。
