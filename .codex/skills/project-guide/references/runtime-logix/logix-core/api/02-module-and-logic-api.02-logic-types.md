# 2. `ModuleLogic` 与 `Logic.Of`

为了在类型上表达“在某一类 Module 上运行的一段逻辑程序”，当前约定（以 `Logic.Of` 为主）：

```ts
import { Logic } from '@logix/core';
import * as Logix from '@logix/core';

export type ModuleLogic<Sh extends Logix.ModuleShape<any, any>, R = unknown, E = never> =
  Logic.Of<Sh, R, unknown, E>
```

含义：

- `Sh`：通过 Module 定义推导出的 `Logix.ModuleShape<stateSchema, actionSchema>`；
- `R`：Logic 依赖的额外环境（Services）；
- `E`：Logic 可能抛出的错误（通常为 never，内部消化）。

> 注：早期草案中曾设想过“基于 `Logic.Env<Sh,R>` + `Logic.RuntimeTag` 的 Bound API 工厂”，用于从环境中“隐式”获取 Runtime 并构造 `$`。该设想目前仅保留在 drafts 中，用于探索 Env-First 形态的可能性。  
> 当前实现中，Pattern / Namespace 场景请直接使用 `Logix.Bound.make(shape, runtime)` 在实现层构造 `$`，业务代码推荐统一通过 `ModuleDef.logic(($)=>Effect.gen(...))` 返回 Logic 值。

---
