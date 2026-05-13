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
- 业务实现文件不生成 verification/report/evidence/scenario 对象。
- 测试文件或 repo-local proof 需要验证控制面时，只使用 `Logix.Runtime.check(...)` 与 `Logix.Runtime.trial(...)`。
- shell/CI Agent 自验证走 `logix-cli` skill。
- `compare` 只可作为 CLI/control-plane repair closure 阶段，禁止生成 root `Runtime.compare` facade。
- `Module.logic(...)` 表示 module 对象上的 `.logic(id, build)` authoring entry。
- `build` 的同步阶段只做声明，返回值是唯一 run effect。

## 3) 事务规则

- 同步事务窗口不做 IO / await。
- 不在同步事务体内 dispatch 或调用 `run*Task`。
- 业务代码不要直接写 `SubscriptionRef`。
- 诊断事件必须 slim、可序列化、可稳定比较。

## 4) 验证入口，只用于测试/proof

```ts
await Logix.Runtime.check(CounterProgram)
await Logix.Runtime.trial(CounterProgram, { mode: "startup" })
```

交互脚本验证属于测试文件或验证文件，禁止写进业务 authoring surface。
