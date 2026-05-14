---
title: Canonical spine
description: 用于 authoring、assembly、execution、React projection 与 evidence 的稳定对象模型。
---

大多数 Logix 代码应该沿着同一条主链：

```text
Module      definition object
Logic       挂在 Module 上的行为
Program     装配后的业务单元
Runtime     执行容器
React host  provider + hooks，把 runtime 实例投影到 React
Evidence    check / trial / compare 报告
```

## 对象角色

| 对象 | 创建方式 | 角色 |
| --- | --- | --- |
| `Module` | `Logix.Module.make(id, def)` | 声明 state schema、actions、reducers、metadata 与 logic builder。 |
| `Logic` | `Module.logic(id, ($) => runEffect)` | 添加行为。声明工作放在 builder root；返回 run effect。 |
| `Program` | `Logix.Program.make(Module, config)` | 固定 initial state、logics、imports、services 与 transaction options。 |
| `Runtime` | `Logix.Runtime.make(Program, options?)` | 持有执行、module runtime、调度、服务、诊断与 dispose。 |
| React host | `RuntimeProvider`、`useModule`、`useSelector`、`useDispatch` | 把 runtime 实例投影到 React，不制造第二真相源。 |
| Verification | `Runtime.check`、`Runtime.trial`、`Runtime.compare` | 产出结构化 control-plane report。 |

## 默认应用形态

```ts
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

const CounterState = Schema.Struct({ value: Schema.Number })
const CounterActions = { inc: Schema.Void }

const Counter = Logix.Module.make("Counter", {
  state: CounterState,
  actions: CounterActions,
})

const CounterLogic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((state) => {
      state.value += 1
    })
  }),
)

export const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})

export const runtime = Logix.Runtime.make(CounterProgram)
```

## 经验规则

- 不要把裸 Module object 传给 `useModule(...)`；使用已托管的 `Module.tag` 或 `Program`。
- 不要使用无参数 `useSelector(handle)`；传入精确 selector 或 descriptor。
- 不要为 Form、Query 或领域包创建包内 React hook family。
- 不要把 Devtools、CLI 或 docs examples 当成第二套 runtime truth。
- 远程 resource ownership 放在 service/query 层；companion/local fact 必须同步。

## See also

- [Modules & State](./modules-and-state)
- [React 集成](./react-integration)
- [Runtime API](/cn/docs/api/core/runtime)
- [Program API](/cn/docs/api/core/program)
