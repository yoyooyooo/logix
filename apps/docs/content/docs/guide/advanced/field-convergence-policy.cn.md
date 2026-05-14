---
title: Field convergence policy
description: 派生字段和 source 字段在 runtime 写入后如何收敛。
---

Field convergence 是 runtime 在一次写入后，让 derived/source-backed fields 回到一致状态的工作。

## Public control

多数用户不直接调 convergence。使用领域 DSL 或 `$.fields` 声明，让 `Program.make` 编译。

## Runtime knobs

Runtime 与 program options 可以调整 convergence mode、budget、diagnostics 和 time slicing。这些 knob 是性能控制，不是 authoring 替代路线。

```ts
const runtime = Logix.Runtime.make(Program, {
  stateTransaction: {
    fieldConvergeMode: "auto",
    fieldConvergeBudgetMs: 8,
  },
})
```

## 边界

如果字段是业务真相，建模为 state 或 Form final truth。如果是确定性投影，建模为 field declaration。如果是 IO，使用 source/service 路线。
